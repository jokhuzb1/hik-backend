const db = require('./database');

async function listSubscribers() {
    try {
        const subs = await db.getSubscribers();
        console.log("📝 Subscribers in DB:", subs);

        // Also print raw rows to check types
        db.db.all("SELECT * FROM subscribers", (err, rows) => {
            console.log("Raw Rows:", rows);
        });

    } catch (err) {
        console.error("Error:", err);
    }
}

listSubscribers();
