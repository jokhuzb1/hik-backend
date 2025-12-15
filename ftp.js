// ftp-server.js
const FtpSrv = require("ftp-srv");

const ftpServer = new FtpSrv({
  url: "ftp://0.0.0.0:21",
  anonymous: false,
});

ftpServer.on("login", ({ username, password }, resolve, reject) => {
  if (username === "hik" && password === "1234") {
    resolve({ root: "./ftp" });
  } else {
    reject(new Error("Invalid credentials"));
  }
});

ftpServer.listen().then(() => {
  console.log("✅ FTP server running on port 21");
});
