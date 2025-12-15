const fs = require('fs');
const path = require('path');

// Configuration
const SOURCE_IMAGE = 'C:/Users/user/.gemini/antigravity/brain/0fe0cb69-858e-4e8b-ab58-2f2772af940f/sample_car_plate_1765709256437.png';
const FTP_ROOT = path.join(__dirname, 'ftp');
const DEST_FILENAME = `vehicle_mock_${Date.now()}.png`;
const DEST_PATH = path.join(FTP_ROOT, DEST_FILENAME);

console.log("🚗 Starting Mock Vehicle Event Test...");

if (!fs.existsSync(SOURCE_IMAGE)) {
    console.error(`❌ Source image not found at: ${SOURCE_IMAGE}`);
    process.exit(1);
}

// Ensure FTP root exists
if (!fs.existsSync(FTP_ROOT)) {
    fs.mkdirSync(FTP_ROOT, { recursive: true });
}

// Copy file to trigger chokidar
console.log(`📂 Copying mock image to FTP folder: ${DEST_FILENAME}`);
fs.copyFileSync(SOURCE_IMAGE, DEST_PATH);

console.log("✅ File copied! Watch server console for processing and ALPR detection.");
console.log("   (You should see 'Scanning license plate' and 'OCR Result')");
