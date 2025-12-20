const ftp = require("basic-ftp");

async function verify() {
    const client = new ftp.Client();
    client.ftp.verbose = true;

    try {
        console.log("🔄 Connecting to FTP...");
        await client.access({
            host: "127.0.0.1", // Test local loopback first
            port: 21,
            user: "hik",
            password: "1234",
            secure: false
        });
        console.log("✅ FTP Connection and Login Successful!");

        console.log("📂 Listing files...");
        const list = await client.list();
        console.log("📄 Files found:", list.length);
        list.forEach(f => console.log(` - ${f.name}`));

    } catch (err) {
        console.log("❌ FTP Verification Failed:", err.message);
    }
    client.close();
}

verify();
