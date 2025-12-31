const ftp = require("basic-ftp");

const VPS_IP = "77.237.245.47"; // Your VPS IP
const PORT = 21;

async function testMode(mode, user, pass) {
    const client = new ftp.Client();
    // client.ftp.verbose = true; // Uncomment for debug logs

    console.log(`\n🔄 Testing ${mode} login...`);
    try {
        await client.access({
            host: VPS_IP,
            port: PORT,
            user: user,
            password: pass,
            secure: false
        });
        console.log(`✅ ${mode} Login: SUCCESS`);

        const list = await client.list();
        console.log(`   📂 Files listed: ${list.length}`);

    } catch (err) {
        console.log(`❌ ${mode} Login: FAILED`);
        console.log(`   Error: ${err.message}`);
    } finally {
        client.close();
    }
}

async function runTests() {
    console.log(`📡 Connecting to VPS: ${VPS_IP}`);

    // 1. Test Anonymous (Camera simulation)
    await testMode("ANONYMOUS", "anonymous", "anonymous@test.com");

    // 2. Test Authenticated (Admin)
    await testMode("AUTHENTICATED", "hik", "1234");
}

runTests();
