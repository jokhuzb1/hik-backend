const ftp = require("basic-ftp");
const fs = require("fs");

// Configuration
const VPS_IP = "77.237.245.47";
const FTP_USER = "hik";
const FTP_PASS = "1234";

// 1. Create a dummy image if it doesn't exist
const DUMMY_IMG = "test_event.jpg";
if (!fs.existsSync(DUMMY_IMG)) {
    // Valid 1x1 Pixel JPEG
    const jpegBuffer = Buffer.from(
        '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
        'base64'
    );
    fs.writeFileSync(DUMMY_IMG, jpegBuffer);
}

// 2. Generate a valid Hikvision Filename
// Format: IP_Channel_Timestamp_Event.jpg
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

// Simulate a Vehicle Detection Event
const FILENAME = `192.168.1.100_01_${timestamp}_vehicle_detection.jpg`;

async function simulate() {
    const client = new ftp.Client();
    client.ftp.verbose = true;

    // FORCE Disable EPSV to mimic Hikvision behavior
    client.ftp.useEPSV = false;

    try {
        console.log(`🔄 Connecting to VPS FTP (${VPS_IP})...`);
        await client.access({
            host: VPS_IP,
            port: 21,
            user: FTP_USER,
            password: FTP_PASS,
            secure: false
        });
        console.log("✅ Custom Login Success!");

        console.log(`📤 Uploading simulated event: ${FILENAME}`);
        await client.uploadFrom(DUMMY_IMG, FILENAME);

        console.log("✅ Upload Complete!");
        console.log("👉 CHECK NOW: 1. Telegram Bot  2. Web Dashboard");
    } catch (err) {
        console.log("❌ Simulation Failed:", err);
        console.log("Possible causes: Firewall blocking port 21/10000-10100, Passive mode issues, or incorrect credentials.");
    }
    client.close();
}

simulate();
