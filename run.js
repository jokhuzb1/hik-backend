// hikvision-backend.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const xml2js = require("xml2js");

const app = express();
const PORT = 3000;
const DATA_DIR = path.join(__dirname, "events");

// Ensure events directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// Receive raw data (XML or image)
app.use(bodyParser.raw({ type: "*/*", limit: "20mb" }));

// Hikvision default push endpoint
app.post("/ISAPI/Event/notification/httpNotify", async (req, res) => {
  console.log("Event received from camera!");
  console.log(req.body, "body");
  console.log(req.header, "headers");
  let timestamp = Date.now();
  let eventData = { timestamp };

  // Try parsing XML if present
  let eventType = null;
  try {
    const xmlString = req.body.toString("utf8");
    const result = await xml2js.parseStringPromise(xmlString, {
      explicitArray: false,
    });

    if (result && result.EventNotificationAlert) {
      const alert = result.EventNotificationAlert;

      eventData.channelID = alert.channelID || alert.channel || "unknown";
      eventData.eventType = alert.eventType || "unknown";
      eventData.dateTime = alert.dateTime || new Date().toISOString();
      eventData.ipAddress = alert.ipAddress || "unknown";

      eventType = eventData.eventType;
      console.log(`Event Type: ${eventType}, Channel: ${eventData.channelID}`);
    }
  } catch (err) {
    console.log(
      "Not XML or parsing failed, assuming raw image or binary data."
    );
  }

  // Process only FaceDetection and VehicleDetection
  if (eventType === "FaceDetection" || eventType === "VehicleDetection") {
    let snapshotFilename = null;

    // Save image if binary data is sent
    if (req.body && req.body.length > 0) {
      snapshotFilename = path.join(DATA_DIR, `${eventType}_${timestamp}.jpg`);
      fs.writeFileSync(snapshotFilename, req.body);
      eventData.snapshot = snapshotFilename;
      console.log(`Snapshot saved: ${snapshotFilename}`);
    }

    // Save metadata to JSON
    const metadataFile = path.join(
      DATA_DIR,
      `${eventType}_event_${timestamp}.json`
    );
    fs.writeFileSync(metadataFile, JSON.stringify(eventData, null, 2));
    console.log(`Event metadata saved: ${metadataFile}`);
  } else {
    console.log(`Ignored event type: ${eventType}`);
  }

  res.sendStatus(200); // acknowledge camera
});

// Start server
app.listen(PORT, () => {
  console.log(`Hikvision backend listening on http://192.168.1.13:${PORT}`);
});
