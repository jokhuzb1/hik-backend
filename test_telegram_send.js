require('dotenv').config();
const { Telegraf } = require('telegraf');
const https = require('https');
const fs = require('fs');
const path = require('path');

const TEST_IMAGE_PATH = path.join(__dirname, 'test_image.jpg');

async function ensureImage() {
    return new Promise((resolve, reject) => {
        if (fs.existsSync(TEST_IMAGE_PATH)) {
            // Check if it's the old invalid one (small size) and delete it
            const stats = fs.statSync(TEST_IMAGE_PATH);
            if (stats.size < 1000) {
                fs.unlinkSync(TEST_IMAGE_PATH);
            } else {
                return resolve();
            }
        }

        console.log("⬇️ Downloading test image...");
        const file = fs.createWriteStream(TEST_IMAGE_PATH);
        https.get("https://placehold.co/600x400.jpg", function (response) {
            response.pipe(file);
            file.on('finish', () => {
                file.close(() => {
                    console.log("✅ Image downloaded.");
                    resolve();
                });
            });
        }).on('error', (err) => {
            fs.unlink(TEST_IMAGE_PATH);
            reject(err);
        });
    });
}

async function sendTestPhoto() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
        console.error("❌ Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in .env");
        return;
    }

    console.log(`🤖 Initializing Bot (Token starts with ${token.substring(0, 5)}...)`);
    const bot = new Telegraf(token);

    try {
        await ensureImage();

        console.log(`💬 Sending test text to ${chatId}...`);
        await bot.telegram.sendMessage(chatId, "🔔 Test Alert: The bot is properly configured and connected!");
        console.log("✅ Text message sent successfully!");

        console.log(`📤 Sending test photo to ${chatId}...`);
        await bot.telegram.sendPhoto(chatId, { source: TEST_IMAGE_PATH }, { caption: "📸 And here is a test image." });
        console.log("✅ Photo sent successfully!");
    } catch (err) {
        console.error("❌ Failed to send photo:", err.message);
        if (err.response) {
            console.error("Telegram Error Code:", err.response.error_code);
            console.error("Telegram Description:", err.response.description);
        }
    }
}

sendTestPhoto();
