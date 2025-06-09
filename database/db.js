const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Use different database for test vs development
const DB_NAME = process.env.NODE_ENV === 'test' ? 'test_uptime_kama.db' : 'uptime_kama.db';
const DB_PATH = path.join(__dirname, DB_NAME);

let db;

function initialize() {
    // Create database directory if it doesn't exist
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('Error opening database:', err.message);
                reject(err);
                return;
            }
            console.log('Connected to SQLite database at:', DB_PATH);

            // Create tables
            createTables()
                .then(() => {
                    console.log('Database tables created/verified');
                    resolve();
                })
                .catch(reject);
        });
    });
}

function createTables() {
    return new Promise((resolve, reject) => {
        const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
                                                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                 email TEXT UNIQUE NOT NULL,
                                                 password TEXT NOT NULL,
                                                 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                 updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        const createMonitorsTable = `
            CREATE TABLE IF NOT EXISTS monitors (
                                                   id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                   user_id INTEGER NOT NULL,
                                                   name TEXT NOT NULL,
                                                   url TEXT NOT NULL,
                                                   interval_minutes INTEGER NOT NULL DEFAULT 5,
                                                   status TEXT DEFAULT 'unknown',
                                                   last_check DATETIME,
                                                   response_time INTEGER,
                                                   status_code INTEGER,
                                                   error_message TEXT,
                                                   created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                   updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                   FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        `;

        const createMonitorChecksTable = `
            CREATE TABLE IF NOT EXISTS monitor_checks (
                                                         id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                         monitor_id INTEGER NOT NULL,
                                                         status TEXT NOT NULL,
                                                         response_time INTEGER,
                                                         status_code INTEGER,
                                                         error_message TEXT,
                                                         checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                         FOREIGN KEY (monitor_id) REFERENCES monitors (id) ON DELETE CASCADE
            )
        `;

        // Create tables sequentially
        db.run(createUsersTable, (err) => {
            if (err) {
                console.error('Error creating users table:', err.message);
                reject(err);
                return;
            }

            db.run(createMonitorsTable, (err) => {
                if (err) {
                    console.error('Error creating monitors table:', err.message);
                    reject(err);
                    return;
                }

                db.run(createMonitorChecksTable, (err) => {
                    if (err) {
                        console.error('Error creating monitor_checks table:', err.message);
                        reject(err);
                        return;
                    }
                    resolve();
                });
            });
        });
    });
}

function getDatabase() {
    return db;
}

function createUser(email, hashedPassword) {
    return new Promise((resolve, reject) => {
        const sql = 'INSERT INTO users (email, password) VALUES (?, ?)';
        db.run(sql, [email, hashedPassword], function(err) {
            if (err) {
                reject(err);
                return;
            }
            resolve(this.lastID);
        });
    });
}

function getUserByEmail(email) {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM users WHERE email = ?';
        db.get(sql, [email], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(row);
        });
    });
}

function getUserById(userId) {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM users WHERE id = ?';
        db.get(sql, [userId], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(row);
        });
    });
}

function deleteUser(email) {
    return new Promise((resolve, reject) => {
        const sql = 'DELETE FROM users WHERE email = ?';
        db.run(sql, [email], function(err) {
            if (err) {
                reject(err);
                return;
            }
            resolve(this.changes);
        });
    });
}

function close() {
    return new Promise((resolve) => {
        if (db) {
            db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err.message);
                }
                console.log('Database connection closed');
                resolve();
            });
        } else {
            resolve();
        }
    });
}

// Monitor-related functions
function createMonitor(userId, name, url, intervalMinutes) {
    return new Promise((resolve, reject) => {
        const sql = 'INSERT INTO monitors (user_id, name, url, interval_minutes) VALUES (?, ?, ?, ?)';
        db.run(sql, [userId, name, url, intervalMinutes], function(err) {
            if (err) {
                reject(err);
                return;
            }
            resolve(this.lastID);
        });
    });
}

function getMonitorsByUserId(userId) {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM monitors WHERE user_id = ? ORDER BY created_at DESC';
        db.all(sql, [userId], (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(rows);
        });
    });
}

function getMonitorById(monitorId) {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM monitors WHERE id = ?';
        db.get(sql, [monitorId], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(row);
        });
    });
}

function updateMonitorStatus(monitorId, status, responseTime, statusCode, errorMessage) {
    return new Promise((resolve, reject) => {
        const sql = `
            UPDATE monitors 
            SET status = ?, response_time = ?, status_code = ?, error_message = ?, 
                last_check = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `;
        db.run(sql, [status, responseTime, statusCode, errorMessage, monitorId], function(err) {
            if (err) {
                reject(err);
                return;
            }
            resolve(this.changes);
        });
    });
}

function createMonitorCheck(monitorId, status, responseTime, statusCode, errorMessage) {
    return new Promise((resolve, reject) => {
        const sql = 'INSERT INTO monitor_checks (monitor_id, status, response_time, status_code, error_message) VALUES (?, ?, ?, ?, ?)';
        db.run(sql, [monitorId, status, responseTime, statusCode, errorMessage], function(err) {
            if (err) {
                reject(err);
                return;
            }
            resolve(this.lastID);
        });
    });
}

function deleteMonitor(monitorId, userId) {
    return new Promise((resolve, reject) => {
        const sql = 'DELETE FROM monitors WHERE id = ? AND user_id = ?';
        db.run(sql, [monitorId, userId], function(err) {
            if (err) {
                reject(err);
                return;
            }
            resolve(this.changes);
        });
    });
}

module.exports = {
    initialize,
    getDatabase,
    createUser,
    getUserByEmail,
    getUserById,
    deleteUser,
    close,
    createMonitor,
    getMonitorsByUserId,
    getMonitorById,
    updateMonitorStatus,
    createMonitorCheck,
    deleteMonitor
};