import { useState } from "react";

// ✅ FIX: Use relative path (works in both local + production)
const API = "/api";

const post = (url, body) =>
  fetch(API + url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => r.json());

export default function App() {
  const [log, setLog] = useState([]);
  const [flow, setFlow] = useState([]);
  const [qtId, setQtId] = useState("");
  const [orId, setOrId] = useState("");
  const [lfId, setLfId] = useState("");
  const [f2Id, setF2Id] = useState("");

  const addLog = (msg, data) =>
    setLog((prev) => [...prev, { msg, data: JSON.stringify(data, null, 2) }]);

  const refreshFlow = () =>
    fetch(API + "/docflow")
      .then((r) => r.json())
      .then(setFlow);

  // ── Step 1: Quotation ───────────────────────────────────────────────────────
  const createQuotation = async () => {
    const res = await post("/quotations", {
      customer_id: "C001",
      material: "MED001",
      qty: 1000,
    });
    if (res.id) setQtId(res.id);
    addLog("STEP 1 — Quotation (VA21)", res);
    refreshFlow();
  };

  // ── Step 2: Sales Order ─────────────────────────────────────────────────────
  const createOrder = async () => {
    const res = await post("/orders", { quotation_id: qtId });
    if (res.id) setOrId(res.id);
    addLog("STEP 2 — Sales Order (VA01) | ATP + Credit Check", res);
    refreshFlow();
  };

  // ── Step 3: Delivery ────────────────────────────────────────────────────────
  const createDelivery = async () => {
    const res = await post("/deliveries", { order_id: orId });
    if (res.id) setLfId(res.id);
    addLog("STEP 3 — Outbound Delivery (VL01N)", res);
    refreshFlow();
  };

  // ── Step 4: PGI ─────────────────────────────────────────────────────────────
  const postPGI = async () => {
    const res = await post(`/deliveries/${lfId}/pgi`, {});
    addLog("STEP 4 — Post Goods Issue (VL02N)", res);
  };

  // ── Step 5: Billing ─────────────────────────────────────────────────────────
  const createBilling = async () => {
    const res = await post("/billing", { delivery_id: lfId });
    if (res.id) setF2Id(res.id);
    addLog("STEP 5 — Billing Document (VF01)", res);
    refreshFlow();
  };

  // ── Step 6: Payment ─────────────────────────────────────────────────────────
  const clearPayment = async () => {
    const res = await post("/payments", {
      billing_id: f2Id,
      amount: 850000,
    });
    addLog("STEP 6 — Payment Cleared (F-28)", res);
    refreshFlow();
  };

  const steps = [
    { label: "1. Quotation (VA21)", action: createQuotation, disabled: false },
    { label: "2. Sales Order (VA01)", action: createOrder, disabled: !qtId },
    { label: "3. Delivery (VL01N)", action: createDelivery, disabled: !orId },
    { label: "4. PGI (VL02N)", action: postPGI, disabled: !lfId },
    { label: "5. Billing (VF01)", action: createBilling, disabled: !lfId },
    { label: "6. Payment (F-28)", action: clearPayment, disabled: !f2Id },
  ];

  return (
    <div style={{ fontFamily: "monospace", padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h2 style={{ color: "#0066cc" }}>🔄 O2C Flow Simulator</h2>

      {/* Buttons */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {steps.map((s) => (
          <button
            key={s.label}
            onClick={s.action}
            disabled={s.disabled}
            style={{
              padding: "8px 14px",
              borderRadius: 6,
              border: "none",
              cursor: s.disabled ? "not-allowed" : "pointer",
              background: s.disabled ? "#ccc" : "#0066cc",
              color: "#fff",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Flow */}
      {flow.length > 0 && (
        <div style={{ background: "#f0f8ff", padding: 12 }}>
          <strong>📋 Document Flow</strong>
          <div>
            {flow.map((f, i) => (
              <div key={i}>{f.from_doc} → {f.to_doc}</div>
            ))}
          </div>
        </div>
      )}

      {/* Log */}
      <div style={{ background: "#1e1e1e", color: "#fff", padding: 12, marginTop: 20 }}>
        {log.map((l, i) => (
          <div key={i}>
            <b>{l.msg}</b>
            <pre>{l.data}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}