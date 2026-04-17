# O2C Flow Simulator — HealWell Pharma × CityCare Hospital

Simulates the complete SAP SD Order-to-Cash process in VS Code.
**No SAP access needed.**

---

## Setup (2 terminals in VS Code)

### Terminal 1 — Backend
```bash
cd backend
npm install
node server.js
# Runs on http://localhost:3001
```

### Terminal 2 — Frontend
```bash
cd frontend
npm install
npm run dev
# Opens on http://localhost:5173
```

---

## O2C Steps (click buttons in order in the browser)

| Button | SAP T-Code | What it does |
|--------|-----------|--------------|
| 1. Quotation | VA21 | Creates QT doc for 1,000 boxes @ ₹850 |
| 2. Sales Order | VA01 | ATP check + Credit check → creates OR doc |
| 3. Delivery | VL01N | Creates LF outbound delivery |
| 4. Post Goods Issue | VL02N | Reduces stock; Dr COGS / Cr FG Inventory |
| 5. Billing | VF01 | Creates F2 invoice; Dr Customer / Cr Revenue |
| 6. Payment | F-28 | Clears AR open item; Dr Bank / Cr Customer |

---

## Files

```
o2c-simulator/
├── backend/
│   ├── db.js        ← SQLite schema + seed data (mirrors SAP tables)
│   ├── server.js    ← All 6 O2C steps as REST API endpoints
│   └── package.json
└── frontend/
    ├── src/
    │   ├── App.jsx  ← Full UI with step buttons + document flow
    │   └── main.jsx
    ├── index.html
    ├── vite.config.js
    └── package.json
```