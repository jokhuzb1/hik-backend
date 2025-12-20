// ftp-server.js
require('dotenv').config();
const FtpSrv = require("ftp-srv");
const bunyan = require("bunyan");

// Create distinct logger
const log = bunyan.createLogger({ name: "ftp-server" });

const ftpServer = new FtpSrv({
  url: "ftp://0.0.0.0:21",
  pasv_url: process.env.PASV_URL || "77.237.245.47", // Use VPS IP
  pasv_min: 10000,
  pasv_max: 10100,
  anonymous: false,
  log: log // Enable built-in logging
});

ftpServer.on("login", ({ username, password }, resolve, reject) => {
  console.log(`🔑 Login attempt: ${username}`);
  if (username === "hik" && password === "1234") {
    console.log("✅ Login successful");
    resolve({ root: "./ftp" }); // Ensure this folder exists!
  } else {
    console.log("❌ Login failed");
    reject(new Error("Invalid credentials"));
  }
});

ftpServer.on("client-error", ({ connection, context, error }) => {
  console.error("⚠️ FTP Client Error:", error.message);
});

ftpServer.listen().then(() => {
  console.log("✅ FTP server running on port 21");
  console.log(`📡 Passive Mode: ${ftpServer.options.pasv_url} (Ports 10000-10100)`);
});
