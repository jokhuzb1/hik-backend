const net = require('net');

const CONFIG = {
    host: "77.237.245.47",
    port: 21,
    user: "hik",
    pass: "1234"
};

const socket = new net.Socket();

console.log(`🔌 Connecting to ${CONFIG.host}:${CONFIG.port}...`);

socket.connect(CONFIG.port, CONFIG.host, () => {
    console.log('✅ Connected. Waiting for welcome message...');
});

socket.on('data', (data) => {
    const response = data.toString().trim();
    console.log(`[R] ${response}`);

    if (response.startsWith('220')) {
        console.log(`[S] USER ${CONFIG.user}`);
        socket.write(`USER ${CONFIG.user}\r\n`);
    }
    else if (response.startsWith('331')) {
        console.log(`[S] PASS ****`);
        socket.write(`PASS ${CONFIG.pass}\r\n`);
    }
    else if (response.startsWith('230')) {
        // Logged in! Now the moment of truth.
        console.log(`[S] PASV (Asking server for IP/Port)`);
        socket.write(`PASV\r\n`);
    }
    else if (response.startsWith('227')) {
        // "227 Entering Passive Mode (h1,h2,h3,h4,p1,p2)."
        console.log("\n================ ANALYSIS ================");
        console.log("📝 Server Response:", response);

        const match = response.match(/\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/);
        if (match) {
            const ip = `${match[1]}.${match[2]}.${match[3]}.${match[4]}`;
            const port = (parseInt(match[5]) * 256) + parseInt(match[6]);

            console.log(`🕵️ Server is telling camera to connect to: ${ip}:${port}`);

            if (ip === "77.237.245.47") {
                console.log("✅ IP MATCHES VPS IP! (Configuration is Correct)");
            } else {
                console.log("❌ IP MISMATCH! This is why the camera fails.");
                console.log(`   Expected: 77.237.245.47`);
                console.log(`   Received: ${ip}`);
            }
        }
        console.log("==========================================\n");
        socket.end();
    }
});

socket.on('close', () => {
    console.log('🔌 Connection closed');
});
