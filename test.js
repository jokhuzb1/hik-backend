const FtpSrv = require("ftp-srv");
const chokidar = require("chokidar");
const path = require("path");
const fs = require("fs");

// ===== CONFIG =====
const FTP_PORT = 21;
const FTP_USER = "hik";
const FTP_PASS = "1234";
const FTP_ROOT = path.join(__dirname, "ftp");

const PASV_IP = "192.168.1.8";
const PASV_MIN = 50000;
const PASV_MAX = 50100;

// Minimum time between saving images for the same event type
const EVENT_COOLDOWN = 30 * 1000; // 30 seconds

// Track last saved timestamp per event type
const lastSaved = {
  vehicles: 0,
  faces: 0,
};

// Create folders
["vehicles", "faces"].forEach((dir) => {
  const fullPath = path.join(FTP_ROOT, dir);
  if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
});

// ===== FTP SERVER =====
const ftpServer = new FtpSrv({
  url: `ftp://0.0.0.0:${FTP_PORT}`,
  anonymous: false,
  pasv_url: PASV_IP,
  pasv_min: PASV_MIN,
  pasv_max: PASV_MAX,
});

ftpServer.on("login", ({ username, password }, resolve, reject) => {
  if (username === FTP_USER && password === FTP_PASS) {
    console.log("✅ Camera logged in via FTP");
    resolve({ root: FTP_ROOT });
  } else {
    reject(new Error("❌ Invalid FTP credentials"));
  }
});

ftpServer.listen().then(() => {
  console.log(`🚀 FTP server running on port ${FTP_PORT}`);
  console.log(`📡 Passive ports: ${PASV_MIN}-${PASV_MAX}`);
});

// ===== WATCHER =====
chokidar.watch(FTP_ROOT, { ignoreInitial: true }).on("add", (filePath) => {
  const fileName = path.basename(filePath).toLowerCase();
  const now = Date.now();

  // Determine event type
  // Change this logic if your camera sends different filenames or paths
  let eventType = "vehicles"; // default
  if (fileName.includes("face")) eventType = "faces";

  // Save only one image per event type within cooldown
  if (now - lastSaved[eventType] > EVENT_COOLDOWN) {
    lastSaved[eventType] = now;

    // Move file to correct folder
    const destFolder = path.join(FTP_ROOT, eventType);
    const destPath = path.join(destFolder, `${eventType}_${now}.jpg`);

    fs.rename(filePath, destPath, (err) => {
      if (!err) {
        console.log(`📸 Saved new ${eventType} image: ${destPath}`);
      } else {
        console.error("❌ Error moving file:", err);
      }
    });
  } else {
    // Keep file in a temporary folder if you want to check
    console.log(`🗑 Ignored extra ${eventType} image: ${fileName}`);
  }
});
