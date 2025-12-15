const express = require("express");
const xmlparser = require("express-xml-bodyparser");
const DigestFetch = require("digest-fetch").default;
const fs = require("fs");
const path = require("path");

const app = express();

const SERVER_IP = "192.168.1.8";
const PORT = 3000;

const CAMERA_IP = "192.168.1.64";
const CAMERA_USER = "admin";
const CAMERA_PASS = "Nu2302209";

const SAVE_DIR = path.join(__dirname, "snapshots");
if (!fs.existsSync(SAVE_DIR)) fs.mkdirSync(SAVE_DIR);

app.use(xmlparser({ explicitArray: false }));

const client = new DigestFetch(CAMERA_USER, CAMERA_PASS);

async function fetchSnapshot(type) {
  const url = `http://${CAMERA_IP}/ISAPI/Streaming/channels/1/picture`;
  const file = path.join(SAVE_DIR, `${type}_${Date.now()}.jpg`);

  try {
    const res = await client.fetch(url);
    if (!res.ok) {
      console.log("Snapshot HTTP status:", res.status);
      return;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(file, buffer);
    console.log("📸 Snapshot saved:", file);
  } catch (err) {
    console.error("Snapshot error:", err.message);
  }
}

app.post("/ISAPI/Event/notification/httpNotify", (req, res) => {
  res.status(200).send("OK");

  const ev = req.body?.eventnotificationalert;
  if (!ev) return;

  console.log("EVENT:", ev.eventtype, ev.eventstate);

  if (
    ev.eventstate === "active" &&
    ["FaceDetection", "VehicleDetection", "VMD"].includes(ev.eventtype)
  ) {
    setTimeout(() => fetchSnapshot(ev.eventtype), 400);
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Listening on http://${SERVER_IP}:${PORT}`);
});
