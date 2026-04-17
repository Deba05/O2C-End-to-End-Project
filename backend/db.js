const Database = require("better-sqlite3");
const db = new Database("o2c.db");

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

  -- Seed data
  INSERT OR IGNORE INTO customers VALUES ('C001', 'CityCare Hospital', 1000000, 0);
  INSERT OR IGNORE INTO inventory VALUES ('MED001', 'Paracetamol 500mg', 2000, 850);
`);

module.exports = db;