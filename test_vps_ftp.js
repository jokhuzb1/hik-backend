const ftp = require("basic-ftp");
const fs = require("fs");

// CONFIGURATION
const VPS_IP = "77.237.245.47"; // Extracted from your logs
const FTP_USER = "hik";         // Default
const FTP_PASS = "1234";        // Default

async function testRemoteFtp() {
    const client = new ftp.Client();
    client.ftp.verbose = true; // Log all FTP communication

    console.log(`🚀 Testing FTP Connection to ${VPS_IP}...`);

    try {
        // 1. Connect
        console.log("1️⃣  Connecting to Command Port (21)...");
        await client.access({
            host: VPS_IP,
            user: FTP_USER,
            password: FTP_PASS,
            secure: false
        });
        console.log("✅ Command Connection Verified.");

        // 2. CHECK PASV RESPONSE (Crucial for Cameras)
        // Cameras use PASV, not EPSV. We must ensure the IP returned is the PUBLIC IP.

        console.log("2️⃣  Checking PASV IP advertisement...");
        try {
            const res = await client.send("PASV");
            console.log(`   Server Responded: ${res.message}`);

            // Parse (h1,h2,h3,h4,p1,p2)
            const regex = /(\d+),(\d+),(\d+),(\d+),(\d+),(\d+)/;
            const match = res.message.match(regex);

            if (match) {
                const ip = `${match[1]}.${match[2]}.${match[3]}.${match[4]}`;
                const port = (parseInt(match[5]) * 256) + parseInt(match[6]);

                console.log(`   ℹ️  Server says: Connect to ${ip}:${port}`);

                if (ip !== VPS_IP) {
                    console.error(`   ❌ CRITICAL MISMATCH: Server is advertising ${ip} but we connected to ${VPS_IP}.`);
                    console.error(`      The camera will try to connect to ${ip} and FAIL.`);
                    console.error(`      SOLUTION: Update PASV_URL in .env to match ${VPS_IP}`);
                } else {
                    console.log(`   ✅ IP Match! Server is correctly advertising Public IP.`);
                }
            }
        } catch (e) {
            console.log("   ❌ PASV Command failed:", e.message);
        }

    } catch (err) {
        console.error("\n❌ FTP TEST FAILED");
        console.error("Error:", err.message);
    }

    client.close();
}

testRemoteFtp();
