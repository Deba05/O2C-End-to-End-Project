const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "o2c.db"));

// ─── TABLES ─────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT,
    credit_limit REAL,
    credit_used REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS inventory (
    material TEXT PRIMARY KEY,
    description TEXT,
    qty INTEGER,
    price REAL
  );

  CREATE TABLE IF NOT EXISTS quotations (
    id TEXT PRIMARY KEY,
    customer_id TEXT,
    material TEXT,
    qty INTEGER,
    price REAL,
    status TEXT DEFAULT 'OPEN',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sales_orders (
    id TEXT PRIMARY KEY,
    quotation_id TEXT,
    customer_id TEXT,
    material TEXT,
    qty INTEGER,
    price REAL,
    total REAL,
    status TEXT DEFAULT 'OPEN',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS deliveries (
    id TEXT PRIMARY KEY,
    order_id TEXT,
    qty INTEGER,
    status TEXT DEFAULT 'PENDING',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS billing_docs (
    id TEXT PRIMARY KEY,
    delivery_id TEXT,
    order_id TEXT,
    amount REAL,
    status TEXT DEFAULT 'OPEN',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    billing_id TEXT,
    amount REAL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS document_flow (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_doc TEXT,
    to_doc TEXT,
    step TEXT
  );
`);


// ─── FORCE RESET DEMO DATA (CRITICAL) ─────────────────

// Customer (HIGH CREDIT + RESET USED)
db.prepare(`
INSERT OR REPLACE INTO customers (id, name, credit_limit, credit_used)
VALUES ('C001', 'CityCare Hospital', 2000000, 0)
`).run();

// Inventory (HIGH STOCK)
db.prepare(`
INSERT OR REPLACE INTO inventory (material, description, qty, price)
VALUES ('MED001', 'Paracetamol 500mg', 5000, 850)
`).run();

module.exports = db;