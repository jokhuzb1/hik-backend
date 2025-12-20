const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'events.db');
const db = new sqlite3.Database(dbPath);

// Initialize Database
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS detections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT,
      image_path TEXT,
      plate_number TEXT,
      timestamp INTEGER
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS subscribers(
      chat_id TEXT PRIMARY KEY,
      name TEXT,
      joined_at INTEGER
    )
    `);
});

// function saveDetection removed

const getRecentDetections = (limit = 20) => {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM detections ORDER BY timestamp DESC LIMIT ?", [limit], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const getStats = () => {
  return new Promise((resolve, reject) => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())).getTime();

    db.serialize(() => {
      const stats = {};

      db.get("SELECT COUNT(*) as count FROM detections WHERE timestamp >= ?", [startOfDay], (err, row) => {
        if (err) return reject(err);
        stats.today = row.count;

        db.get("SELECT COUNT(*) as count FROM detections WHERE timestamp >= ?", [startOfWeek], (err, row) => {
          if (err) return reject(err);
          stats.week = row.count;

          db.get("SELECT COUNT(*) as count FROM detections", (err, row) => {
            if (err) return reject(err);
            stats.total = row.count;
            resolve(stats);
          });
        });
      });
    });
  });
};

// Subscriber Methods
const addSubscriber = (chatId, name) => {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare("INSERT OR IGNORE INTO subscribers (chat_id, name, joined_at) VALUES (?, ?, ?)");
    stmt.run(String(chatId), name, Date.now(), function (err) {
      if (err) reject(err);
      else resolve(this.changes > 0); // true if inserted, false if existed
    });
    stmt.finalize();
  });
};

const getSubscribers = () => {
  return new Promise((resolve, reject) => {
    db.all("SELECT chat_id FROM subscribers", (err, rows) => {
      if (err) reject(err);
      else resolve(rows.map(r => r.chat_id));
    });
  });
};

module.exports = {
  db,
  getRecentDetections,
  getStats,
  addSubscriber,
  getSubscribers,
  removeSubscriber: (chatId) => {
    return new Promise((resolve, reject) => {
      db.run("DELETE FROM subscribers WHERE chat_id = ?", [chatId], function (err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }
};
