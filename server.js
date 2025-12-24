require('dotenv').config();
const express = require('express');
const FtpSrv = require('ftp-srv');
const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require("socket.io");
const { Telegraf } = require('telegraf');
const db = require('./database');

// ===== CONFIG =====
const PORT = process.env.PORT || 3000;
const FTP_PORT = process.env.FTP_PORT || 21;
const FTP_USER = process.env.FTP_USER || "hik";
const FTP_PASS = process.env.FTP_PASS || "1234";
const FTP_ROOT = path.join(__dirname, "ftp");
const PASV_URL = process.env.PASV_URL || "127.0.0.1";
const PASV_MIN = process.env.PASV_MIN || 10000;
const PASV_MAX = process.env.PASV_MAX || 10100;

// Telegram Config
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Deduplication Config
const EVENT_COOLDOWN = 1000; // 1 second

// ===== SETUP =====
const app = express();
const server = http.createServer(app);
const io = new Server(server);

let bot = null;
if (TELEGRAM_BOT_TOKEN && TELEGRAM_BOT_TOKEN !== "YOUR_BOT_TOKEN_HERE") {
  bot = new Telegraf(TELEGRAM_BOT_TOKEN);

  // Handle /start - Register Subscriber
  bot.start(async (ctx) => {
    try {
      const chatId = ctx.chat.id;
      const name = ctx.from.first_name || ctx.from.username || "User";
      console.log(`📩 New subscriber: ${name} (${chatId})`);

      const isNew = await db.addSubscriber(chatId, name);
      ctx.reply(isNew ? "✅ You are now subscribed to alerts!" : "ℹ️ You are already subscribed.");
    } catch (err) {
      console.error("Subscribe error:", err);
      ctx.reply("❌ Error subscribing.");
    }
  });

  bot.launch().catch(err => console.error("Bot launch error:", err));
  console.log("✅ Telegram Bot initialized");
} else {
  console.log("⚠️ Telegram Bot Token missing or default. Notifications disabled.");
}

// Ensure directories exist (only root needed now as we don't save subfolders)
if (!fs.existsSync(FTP_ROOT)) fs.mkdirSync(FTP_ROOT, { recursive: true });

// Serve frontend
app.use(express.static('public'));
// app.use('/ftp', express.static(FTP_ROOT)); // No longer serving files from disk

// ===== STATE =====
const lastAction = {
  vehicles: 0,
  faces: 0
};

// ===== FTP SERVER =====
const bunyan = require("bunyan");
const log = bunyan.createLogger({ name: "ftp-server" });

const ftpServer = new FtpSrv({
  url: `ftp://0.0.0.0:${FTP_PORT}`,
  pasv_url: PASV_URL,
  pasv_min: PASV_MIN,
  pasv_max: PASV_MAX,
  anonymous: true, // Allow anonymous login
  log: log
});

ftpServer.on("login", ({ username, password }, resolve, reject) => {
  console.log(`🔑 FTP Login attempt: ${username}`);

  // Allow anonymous OR correct credentials
  if (username === 'anonymous' || (username === FTP_USER && password === FTP_PASS)) {
    console.log("✅ FTP Login successful");
    resolve({ root: FTP_ROOT });
  } else {
    console.log("❌ FTP Login failed");
    reject(new Error("Invalid credentials"));
  }
});

ftpServer.on("client-error", ({ connection, context, error }) => {
  // Ignore benign connection resets common with cameras
  if (error.code === 'ECONNRESET' || error.message.includes('ECONNRESET')) {
    return;
  }
  console.error("⚠️ FTP Client Error:", error.message);
});

ftpServer.listen().then(() => {
  console.log(`✅ FTP server running on port ${FTP_PORT}`);
  console.log(`   PASV URL: ${PASV_URL}`);
  console.log(`   PASV Port Range: ${PASV_MIN}-${PASV_MAX}`);
});

// ===== NOTIFICATIONS =====
async function notifyUser(metadata, imageBuffer) {
  // Metadata: { ip, channel, timestamp, eventType, originalTime }

  // 1. Uzbek Localization
  let title = "Belgilangan hududda harakat aniqlandi"; // Default
  const evtLower = metadata.eventType.toLowerCase();

  // Determine Type
  if (evtLower.includes("face")) {
    title = "Yuz aniqlandi";
  } else if (evtLower.includes("vehicle")) {
    title = "Avtorusum aniqlandi";
  } else if (evtLower.includes("line_crossing")) {
    title = "Belgilangan hududda harakat aniqlandi";
  }

  // Determine Direction/Action
  if (evtLower.includes("region_entrance") || evtLower.includes("entering")) {
    title += " (Kirish)";
  } else if (evtLower.includes("region_exiting") || evtLower.includes("exiting")) {
    title += " (Chiqish)";
  }

  // Format Timestamp: YYYYMMDDHHMMSSmmm -> YYYY-MM-DD HH:mm:ss
  let timeStr = new Date().toLocaleString(); // Fallback
  if (metadata.originalTime && metadata.originalTime.length >= 14) {
    const Y = metadata.originalTime.substring(0, 4);
    const M = metadata.originalTime.substring(4, 6);
    const D = metadata.originalTime.substring(6, 8);
    const h = metadata.originalTime.substring(8, 10);
    const m = metadata.originalTime.substring(10, 12);
    const s = metadata.originalTime.substring(12, 14);
    timeStr = `${Y}-${M}-${D} ${h}:${m}:${s}`;
  }


  const caption = `🚨 <b>${title}</b>\n` +
    `📅 <b>Vaqt:</b> ${timeStr}\n` +
    `📹 <b>Kanal:</b> ${metadata.channel}\n` +
    `⚠️ <b>Hodisa:</b> ${metadata.eventType}`;

  // Telegram Broadcast
  if (bot) {
    try {
      // 1. Validate Image Buffer
      if (!imageBuffer || imageBuffer.length === 0) {
        console.error("❌ IMAGE_PROCESS_FAILED: Buffer is empty");
        return;
      }

      // 2. Get List
      const subscribers = await db.getSubscribers();
      // Add env ID if not in list (legacy support)
      if (TELEGRAM_CHAT_ID && !subscribers.includes(TELEGRAM_CHAT_ID)) {
        subscribers.push(TELEGRAM_CHAT_ID);
      }

      console.log(`📢 Broadcasting to ${subscribers.length} subscribers`);

      // 3. Send to all
      const promises = subscribers.map(async (chatId) => {
        try {
          // Send raw buffer for highest quality
          await bot.telegram.sendPhoto(chatId, { source: imageBuffer }, { caption: caption, parse_mode: 'HTML' });
          console.log(`✅ Sent to ${chatId}`);
        } catch (e) {
          if (e.response && e.response.error_code === 403) {
            console.log(`🚫 ${chatId} blocked the bot. Removing from subscribers.`);
            await db.removeSubscriber(chatId);
          } else {
            console.error(`❌ Failed to send to ${chatId}: ${e.message}`);
          }
        }
      });

      await Promise.all(promises);
      console.log("📢 Broadcast complete.");

    } catch (err) {
      console.error("Notification Error:", err.message);
    }
  }

  // Web Dashboard (Socket.IO)
  try {
    const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
    io.emit('new_event', {
      type: evtLower.includes("face") ? "faces" : "vehicles",
      image_path: base64Image,
      timestamp: metadata.timestamp, // JS Date timestamp
      plate: "Unknown"
    });
  } catch (err) {
    console.error("Socket Emit Error:", err.message);
  }
}

// ===== QUEUE LOGIC =====
let fileQueue = [];
let processTimer = null;
const BATCH_WAIT_MS = 2000; // Wait 2s for late files

async function processQueue() {
  // 1. Sort by Timestamp (Oldest First)
  fileQueue.sort((a, b) => a.metadata.timestamp - b.metadata.timestamp);

  console.log(`📦 Processing Batch: ${fileQueue.length} files`);
  const queueToProcess = [...fileQueue];
  fileQueue = []; // Clear global queue

  // 2. Process Sequentially
  for (const item of queueToProcess) {
    await notifyUser(item.metadata, item.buffer);
  }
}

// ===== WATCHER (The Core Logic) =====
// Watch for NEW files in the FTP root (where camera uploads first)
chokidar.watch(FTP_ROOT, {
  ignoreInitial: true,
  depth: 0,
  awaitWriteFinish: {
    stabilityThreshold: 1000,
    pollInterval: 100
  }
}).on("add", async (filePath) => {
  // Ignore files already in subfolders (shouldn't be any now, but safety check)
  if (path.dirname(filePath) !== FTP_ROOT) return;

  const fileName = path.basename(filePath);

  // PARSE METADATA
  // Regex: IP_Channel_Timestamp_Event.jpg
  // Example: 192.168.1.64_01_20251219213552789_line_crossing_detection.jpg

  const regex = /^([^_]+)_([^_]+)_(\d{14,})_(.*)\.(jpg|jpeg|png)$/i;
  const match = fileName.match(regex);

  let metadata = {
    ip: "Unknown",
    channel: "00",
    timestamp: Date.now(),
    originalTime: null,
    eventType: "motion_detected",
    ruleId: null
  };

  if (match) {
    metadata.ip = match[1];
    metadata.channel = match[2];
    metadata.originalTime = match[3];
    metadata.eventType = match[4]; // e.g. "LINE_CROSSING_DETECTION" or "LINE_CROSSING_DETECTION_1"

    // Check for Trailing ID (Enter vs Exit often is Rule 1 vs Rule 2)
    // Look for digit at end of event type
    const idMatch = metadata.eventType.match(/_(\d+)$/);
    if (idMatch) {
      metadata.ruleId = idMatch[1];
    }

    try {
      // YYYYMMDDHHMMSSmmm
      const Y = parseInt(metadata.originalTime.substring(0, 4));
      const M = parseInt(metadata.originalTime.substring(4, 6)) - 1;
      const D = parseInt(metadata.originalTime.substring(6, 8));
      const h = parseInt(metadata.originalTime.substring(8, 10));
      const m = parseInt(metadata.originalTime.substring(10, 12));
      const s = parseInt(metadata.originalTime.substring(12, 14));
      const ms = parseInt(metadata.originalTime.substring(14) || "0");
      metadata.timestamp = new Date(Y, M, D, h, m, s, ms).getTime();
    } catch (e) {
      console.error("Error parsing date:", e);
    }
  } else {
    console.warn("⚠️ Filename format not recognized:", fileName);
    if (fileName.includes("face")) metadata.eventType = "face_detection";
  }

  // QUEUEING (No Deduplication, just Ordering)
  try {
    const startRead = Date.now();
    // 1. Read file to buffer
    const imageBuffer = fs.readFileSync(filePath);

    // 2. Delete file immediately
    try { fs.unlinkSync(filePath); } catch (delErr) { }

    // 3. Add to Queue
    fileQueue.push({ metadata, buffer: imageBuffer, addedAt: Date.now() });
    console.log(`📥 Queued: ${fileName} (Queue Size: ${fileQueue.length})`);

    // 4. Reset Timer
    if (processTimer) clearTimeout(processTimer);
    processTimer = setTimeout(processQueue, BATCH_WAIT_MS);

  } catch (err) {
    console.error("Processing Error:", err);
  }
});


// ===== API =====
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await db.getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/recent', async (req, res) => {
  try {
    const rows = await db.getRecentDetections();
    // Map paths for frontend
    const mapped = rows.map(r => ({
      ...r,
      image_url: `/ftp/${r.type}/${r.image_path}`.replace(/\\/g, '/')
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


server.listen(PORT, () => {
  console.log(`🚀 Web Dashboard running at http://localhost:${PORT}`);
});

