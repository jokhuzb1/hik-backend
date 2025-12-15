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
const EVENT_COOLDOWN = 60 * 1000; // 60 seconds

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
const ftpServer = new FtpSrv({
  url: `ftp://0.0.0.0:${FTP_PORT}`,
  pasv_url: PASV_URL,
  pasv_min: PASV_MIN,
  pasv_max: PASV_MAX,
  anonymous: false,
});

ftpServer.on("login", ({ username, password }, resolve, reject) => {
  if (username === FTP_USER && password === FTP_PASS) {
    resolve({ root: FTP_ROOT });
  } else {
    reject(new Error("Invalid credentials"));
  }
});

ftpServer.listen().then(() => {
  console.log(`✅ FTP server running on port ${FTP_PORT}`);
  console.log(`   PASV URL: ${PASV_URL}`);
  console.log(`   PASV Port Range: ${PASV_MIN}-${PASV_MAX}`);
});

// ===== NOTIFICATIONS =====
async function notifyUser(type, imageBuffer) {
  // Localization: Uzbek
  let title = "Obyekt aniqlandi"; // Default Object Detected
  if (type === 'vehicles') title = "Avtorusum aniqlandi";
  if (type === 'faces') title = "Yuz aniqlandi";

  const caption = `🚨 <b>${title}</b>\n📅 ${new Date().toLocaleString()}`;

  // Telegram Broadcast
  if (bot) {
    try {
      // 1. Get List
      const subscribers = await db.getSubscribers();
      // 2. Add env ID if not in list (legacy support)
      if (TELEGRAM_CHAT_ID && !subscribers.includes(TELEGRAM_CHAT_ID)) {
        subscribers.push(TELEGRAM_CHAT_ID);
      }

      console.log(`📢 Broadcasting to ${subscribers.length} subscribers: ${JSON.stringify(subscribers)}`);

      // 3. Send to all
      const promises = subscribers.map(async (chatId) => {
        try {
          // Send raw buffer for highest quality
          await bot.telegram.sendPhoto(chatId, { source: imageBuffer }, { caption: caption, parse_mode: 'HTML' });
          console.log(`✅ Sent to ${chatId}`);
        } catch (e) {
          console.error(`❌ Failed to send to ${chatId}: ${e.message}`);
        }
      });

      await Promise.all(promises);
      console.log("📢 Broadcast complete.");

    } catch (err) {
      console.error("Notification Error:", err.message);
    }
  }

  // Web Dashboard (Socket.IO)
  // Convert buffer to base64
  const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;

  io.emit('new_event', {
    type,
    image_path: base64Image, // Sending Data URI directly
    timestamp: Date.now(),
    plate: "Unknown" // No ALPR
  });
}

// ===== WATCHER (The Core Logic) =====
// Watch for NEW files in the FTP root (where camera uploads first)
chokidar.watch(FTP_ROOT, { ignoreInitial: true, depth: 0 }).on("add", async (filePath) => {
  // Ignore files already in subfolders (shouldn't be any now, but safety check)
  if (path.dirname(filePath) !== FTP_ROOT) return;

  const fileName = path.basename(filePath).toLowerCase();
  const now = Date.now();

  // Determine event type
  let eventType = "vehicles";
  if (fileName.includes("face")) eventType = "faces";

  // DEDUPLICATION
  if (now - lastAction[eventType] < EVENT_COOLDOWN) {
    console.log(`⏳ Debounced ${eventType}: ${fileName}`);
    try { fs.unlinkSync(filePath); } catch (e) { }
    return;
  }

  lastAction[eventType] = now;

  console.log(`⚡ Processing ${eventType}: ${fileName}`);

  // Wait a brief moment to ensure write complete (FTP stream)
  setTimeout(async () => {
    try {
      // 1. Read file to buffer
      const imageBuffer = fs.readFileSync(filePath);

      // 2. Delete file immediately
      fs.unlinkSync(filePath);
      console.log(`🗑️  Deleted temp file: ${fileName}`);

      // 3. Notify (Telegram + Socket)
      await notifyUser(eventType, imageBuffer);

    } catch (err) {
      console.error("Processing Error:", err);
    }
  }, 2000); // Increased delay to 2s to ensure FTP upload completes
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

