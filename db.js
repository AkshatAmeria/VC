const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

let db;

async function getDb() {
  if (!db) {
    db = await open({
      filename: path.join(__dirname, 'chainfloat.db'),
      driver: sqlite3.Database
    });
    await migrate();
  }
  return db;
}

async function migrate() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('supplier','buyer','lp')),
      wallet TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE NOT NULL,
      supplier_id INTEGER NOT NULL,
      buyer_id INTEGER NOT NULL,
      amount_usdc REAL NOT NULL,
      due_date TEXT NOT NULL,
      metadata TEXT,
      status TEXT NOT NULL DEFAULT 'UPLOADED' CHECK(status IN ('UPLOADED','APPROVED','FINANCED','REPAID','OVERDUE')),
      risk_score INTEGER DEFAULT 50,
      discount_bps INTEGER DEFAULT 300,
      token_id INTEGER,
      tx_hash TEXT,
      alert_sent INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(supplier_id) REFERENCES users(id),
      FOREIGN KEY(buyer_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS pool_positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lp_id INTEGER NOT NULL,
      amount_usdc REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(lp_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS pool_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      amount_usdc REAL NOT NULL,
      invoice_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(invoice_id) REFERENCES invoices(id)
    );
  `);
}

module.exports = { getDb };
