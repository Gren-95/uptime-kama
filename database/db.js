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

        db.run(createUsersTable, (err) => {
            if (err) {
                console.error('Error creating users table:', err.message);
                reject(err);
                return;
            }
            resolve();
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

module.exports = {
    initialize,
    getDatabase,
    createUser,
    getUserByEmail,
    deleteUser,
    close
};