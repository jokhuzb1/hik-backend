const express = require("express");
const cors = require("cors");

const app = express();

/**
 * Hikvision sends XML, sometimes with weird headers.
 * DO NOT use express.json() here.
 */
app.use(express.text({ type: "*/*", limit: "10mb" }));
app.use(cors());

app.post("/hikvision/events", (req, res) => {
  console.log("===== HIKVISION EVENT RECEIVED =====");
  console.log(req.headers);
  console.log(req.body); // XML payload

  // VERY IMPORTANT: respond 200 OK
  res.status(200).send("OK");
});

app.get("/", (req, res) => {
  res.send("Hikvision HTTP Listener is running");
});

const PORT = 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
