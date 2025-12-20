const ftp = require("basic-ftp");
const fs = require("fs");
const path = require("path");

// Configuration
const FTP_USER = "hik";
const FTP_PASS = "1234";

// 1. Create a dummy image if it doesn't exist
const DUMMY_IMG = "test_event.jpg";
if (!fs.existsSync(DUMMY_IMG)) {
    // Valid 1x1 Pixel JPEG to satisfy Telegram
    const jpegBuffer = Buffer.from(
        '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
        'base64'
    );
    fs.writeFileSync(DUMMY_IMG, jpegBuffer);
}

// 2. Generate a valid Hikvision Filename
// Format: IP_Channel_Timestamp_Event.jpg
// Example: 192.168.1.64_01_20251219213552789_vehicle_detection.jpg

const now = new Date();
const pad = (n) => n.toString().padStart(2, '0');
const ms = (n) => n.toString().padStart(3, '0');

const timestamp =
    now.getFullYear() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds()) +
    ms(now.getMilliseconds());

const FILENAME = `192.168.1.64_01_${timestamp}_vehicle_detection.jpg`;

async function simulate() {
    const client = new ftp.Client();
    client.ftp.verbose = true;

    try {
        console.log(`🔄 Connecting to Local FTP...`);
        await client.access({
            host: "127.0.0.1",
            port: 21,
            user: FTP_USER,
            password: FTP_PASS,
            secure: false
        });

        console.log(`📤 Uploading simulated event: ${FILENAME}`);
        await client.uploadFrom(DUMMY_IMG, FILENAME);

        console.log("✅ Upload Complete. Check Server Logs & Telegram!");
    } catch (err) {
        console.log("❌ Simulation Failed:", err.message);
    }
    client.close();
}

simulate();
