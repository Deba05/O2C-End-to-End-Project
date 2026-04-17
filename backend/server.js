const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./db");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend build
app.use(express.static(path.join(__dirname, "public")));

// Utility
const genId = (prefix) => `${prefix}-${Date.now()}`;

// ─── STEP 1: Create Quotation (VA21) ─────────────────────────────────────────
app.post("/api/quotations", (req, res) => {
  const { customer_id, material, qty } = req.body;
  const inv = db.prepare("SELECT * FROM inventory WHERE material = ?").get(material);
  if (!inv) return res.status(404).json({ error: "Material not found" });

  const id = genId("QT");
  db.prepare("INSERT INTO quotations VALUES (?,?,?,?,?,'OPEN',datetime('now'))").run(
    id, customer_id, material, qty, inv.price
  );
  res.json({ id, message: "Quotation created", price: inv.price, total: qty * inv.price });
});

// ─── STEP 2: Create Sales Order ───────────────────────────────────────────────
app.post("/api/orders", (req, res) => {
  const { quotation_id } = req.body;
  const qt = db.prepare("SELECT * FROM quotations WHERE id = ?").get(quotation_id);
  if (!qt) return res.status(404).json({ error: "Quotation not found" });

  const inv = db.prepare("SELECT * FROM inventory WHERE material = ?").get(qt.material);
  if (inv.qty < qt.qty) return res.status(400).json({ error: "ATP FAIL: Insufficient stock" });

  const cust = db.prepare("SELECT * FROM customers WHERE id = ?").get(qt.customer_id);
  const total = qt.qty * qt.price;
  if (cust.credit_used + total > cust.credit_limit)
    return res.status(400).json({ error: "CREDIT BLOCK: Credit limit exceeded" });

  const id = genId("OR");
  db.prepare("INSERT INTO sales_orders VALUES (?,?,?,?,?,?,?,'OPEN',datetime('now'))").run(
    id, quotation_id, qt.customer_id, qt.material, qt.qty, qt.price, total
  );
  db.prepare("UPDATE quotations SET status='CONVERTED' WHERE id=?").run(quotation_id);
  db.prepare("UPDATE customers SET credit_used = credit_used + ? WHERE id=?").run(total, qt.customer_id);
  db.prepare("INSERT INTO document_flow(from_doc,to_doc,step) VALUES(?,?,?)").run(quotation_id, id, "Quotation→Order");

  res.json({ id, total, message: "Sales Order created — ATP and Credit check passed" });
});

// ─── STEP 3: Delivery ─────────────────────────────────────────────────────────
app.post("/api/deliveries", (req, res) => {
  const { order_id } = req.body;
  const order = db.prepare("SELECT * FROM sales_orders WHERE id = ?").get(order_id);
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (order.status !== "OPEN") return res.status(400).json({ error: "Order already processed" });

  const id = genId("LF");
  db.prepare("INSERT INTO deliveries VALUES (?,?,?,'PENDING',datetime('now'))").run(id, order_id, order.qty);
  db.prepare("INSERT INTO document_flow(from_doc,to_doc,step) VALUES(?,?,?)").run(order_id, id, "Order→Delivery");

  res.json({ id, message: "Delivery created — awaiting PGI" });
});

// ─── STEP 4: PGI ─────────────────────────────────────────────────────────────
app.post("/api/deliveries/:id/pgi", (req, res) => {
  const delivery = db.prepare("SELECT * FROM deliveries WHERE id = ?").get(req.params.id);
  if (!delivery) return res.status(404).json({ error: "Delivery not found" });
  if (delivery.status === "PGI_DONE") return res.status(400).json({ error: "PGI already posted" });

  const order = db.prepare("SELECT * FROM sales_orders WHERE id = ?").get(delivery.order_id);
  db.prepare("UPDATE inventory SET qty = qty - ? WHERE material = ?").run(delivery.qty, order.material);
  db.prepare("UPDATE deliveries SET status='PGI_DONE' WHERE id=?").run(delivery.id);
  db.prepare("UPDATE sales_orders SET status='DELIVERED' WHERE id=?").run(delivery.order_id);

  res.json({ message: `PGI done — Stock reduced by ${delivery.qty}` });
});

// ─── STEP 5: Billing ─────────────────────────────────────────────────────────
app.post("/api/billing", (req, res) => {
  const { delivery_id } = req.body;
  const delivery = db.prepare("SELECT * FROM deliveries WHERE id = ?").get(delivery_id);
  if (!delivery || delivery.status !== "PGI_DONE")
    return res.status(400).json({ error: "PGI must be done before billing" });

  const order = db.prepare("SELECT * FROM sales_orders WHERE id = ?").get(delivery.order_id);
  const id = genId("F2");

  db.prepare("INSERT INTO billing_docs VALUES (?,?,?,?,'OPEN',datetime('now'))").run(
    id, delivery_id, delivery.order_id, order.total
  );

  db.prepare("INSERT INTO document_flow(from_doc,to_doc,step) VALUES(?,?,?)")
    .run(delivery_id, id, "Delivery→Billing");

  res.json({ id, amount: order.total, message: "Invoice created" });
});

// ─── STEP 6: Payment ─────────────────────────────────────────────────────────
app.post("/api/payments", (req, res) => {
  const { billing_id, amount } = req.body;
  const bill = db.prepare("SELECT * FROM billing_docs WHERE id = ?").get(billing_id);
  if (!bill) return res.status(404).json({ error: "Billing doc not found" });
  if (bill.status === "CLEARED") return res.status(400).json({ error: "Already cleared" });
  if (amount < bill.amount) return res.status(400).json({ error: "Amount mismatch" });

  const id = genId("DZ");
  db.prepare("INSERT INTO payments VALUES (?,?,?,datetime('now'))").run(id, billing_id, amount);
  db.prepare("UPDATE billing_docs SET status='CLEARED' WHERE id=?").run(billing_id);

  const order = db.prepare("SELECT * FROM sales_orders WHERE id=?").get(bill.order_id);
  db.prepare("UPDATE customers SET credit_used = credit_used - ? WHERE id=?")
    .run(order.total, order.customer_id);

  db.prepare("INSERT INTO document_flow(from_doc,to_doc,step) VALUES(?,?,?)")
    .run(billing_id, id, "Billing→Payment");

  res.json({ id, message: "Payment cleared — O2C complete ✓" });
});

// ─── Dashboard ───────────────────────────────────────────────────────────────
app.get("/api/status", (_req, res) => {
  res.json({
    customers: db.prepare("SELECT * FROM customers").all(),
    inventory: db.prepare("SELECT * FROM inventory").all(),
    quotations: db.prepare("SELECT * FROM quotations").all(),
    sales_orders: db.prepare("SELECT * FROM sales_orders").all(),
    deliveries: db.prepare("SELECT * FROM deliveries").all(),
    billing_docs: db.prepare("SELECT * FROM billing_docs").all(),
    payments: db.prepare("SELECT * FROM payments").all(),
  });
});

// ─── React fallback ──────────────────────────────────────────────────────────
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
// ─── Start server (FIXED FOR RENDER) ─────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});