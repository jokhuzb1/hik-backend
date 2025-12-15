// watcher.js
const chokidar = require("chokidar");
const path = require("path");

chokidar.watch("./ftp").on("add", (filePath) => {
  console.log("📸 New file:", path.basename(filePath));
});
