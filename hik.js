const express = require("express");
const app = express();
const PORT = 3000;

// Simple GET endpoint for testing accessibility
app.get("/hikvision/test", (req, res) => {
  // This is the message we want to see when we test
  res.status(200).send("Express Server is UP and accessible!");
});

// The POST endpoint where the Hikvision image will go (we'll expand this later)
app.post("/hikvision/image-upload", (req, res) => {
  console.log("--- Received a POST request from Hikvision! ---");
  res.status(200).send("OK");
});

app.listen(PORT, () => {
  console.log(`Server is listening at http://192.168.1.8:${PORT}`);
});
