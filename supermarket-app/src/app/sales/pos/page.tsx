"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";

interface Product {
  product_id: number;
  barcode: string;
  name: string;
  brand: string | null;
  unit_price: string | number;
  tax_rate: string | number;
  stock: number;
}

interface CartItem extends Product {
  quantity: number;
  discount_amount: number;
}

interface Branch {
  branch_id: number;
  name: string;
  branch_code: string;
}

const PAYMENT_METHODS = ["CASH", "CARD", "MOBILE", "POINTS"];

export default function POSFormPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState<number>(1);
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentRef, setPaymentRef] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<{ sale_id: number; total_amount: string } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/branches").then(r => r.json()).then(data => {
      if (Array.isArray(data)) {
        setBranches(data);
        if (data.length > 0) setBranchId(data[0].branch_id);
      }
    });
  }, []);

  const searchProducts = useCallback(async (q: string) => {
    if (!q.trim()) { setProducts([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/products?branchId=${branchId}&search=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (Array.isArray(data)) setProducts(data);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    const t = setTimeout(() => searchProducts(search), 300);
    return () => clearTimeout(t);
  }, [search, searchProducts]);

  const addToCart = (p: Product) => {
    setCart(prev => {
      const existing = prev.find(c => c.product_id === p.product_id);
      if (existing) return prev.map(c => c.product_id === p.product_id ? { ...c, quantity: Math.min(c.quantity + 1, p.stock) } : c);
      return [...prev, { ...p, quantity: 1, discount_amount: 0 }];
    });
    setSearch("");
    setProducts([]);
    searchRef.current?.focus();
  };

  const updateQty = (id: number, qty: number) => {
    if (qty < 1) { removeItem(id); return; }
    setCart(prev => prev.map(c => c.product_id === id ? { ...c, quantity: Math.min(qty, c.stock) } : c));
  };

  const updateDiscount = (id: number, disc: number) => {
    setCart(prev => prev.map(c => c.product_id === id ? { ...c, discount_amount: Math.max(0, disc) } : c));
  };

  const removeItem = (id: number) => setCart(prev => prev.filter(c => c.product_id !== id));

  const clearCart = () => { setCart([]); setCustomerName(""); setAmountPaid(""); };

  // Totals
  const subtotal = cart.reduce((acc, c) => acc + Number(c.unit_price) * c.quantity, 0);
  const discountTotal = cart.reduce((acc, c) => acc + (c.discount_amount || 0) * c.quantity, 0);
  const taxBase = subtotal - discountTotal;
  const taxTotal = taxBase * 0.18;
  const total = taxBase + taxTotal;
  const change = Number(amountPaid || 0) - total;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/pos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId,
          cashierId: 1,
          items: cart.map(c => ({ product_id: c.product_id, quantity: c.quantity, unit_price: Number(c.unit_price), discount_amount: c.discount_amount || 0 })),
          payments: [{ method: paymentMethod, amount: total.toFixed(2), reference: paymentRef || null }],
        }),
      });
      const data = await res.json();
      if (data.sale_id) {
        setReceipt(data);
        clearCart();
      } else {
        alert("Error: " + (data.error || "Unknown error"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (v: number) => `Rs. ${v.toLocaleString("en-LK", { minimumFractionDigits: 2 })}`;

  return (
    <div style={{ display: "flex", gap: 20, height: "calc(100vh - 140px)" }}>

      {/* LEFT — Product search & cart */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, overflow: "hidden" }}>

        {/* Branch selector + search */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select className="input" style={{ width: 180, flexShrink: 0 }} value={branchId} onChange={e => setBranchId(Number(e.target.value))}>
            {branches.map(b => <option key={b.branch_id} value={b.branch_id}>{b.name}</option>)}
          </select>
          <div style={{ flex: 1, position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 14 }}>🔍</span>
            <input
              ref={searchRef}
              className="input"
              style={{ paddingLeft: 34, width: "100%" }}
              placeholder="Search product by name, barcode, or brand…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        {/* Product search results dropdown */}
        {(products.length > 0 || loading) && (
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.4)", maxHeight: 260, overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>Searching…</div>
            ) : products.map(p => (
              <button
                key={p.product_id}
                onClick={() => addToCart(p)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "none", border: "none", color: "var(--text-primary)", cursor: "pointer", borderBottom: "1px solid var(--border)", textAlign: "left", transition: "background 0.1s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-card2)")}
                onMouseLeave={e => (e.currentTarget.style.background = "none")}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>
                    {p.barcode} {p.brand ? `· ${p.brand}` : ""}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, color: "var(--accent-blue)", fontSize: 13 }}>{fmt(Number(p.unit_price))}</div>
                  <div style={{ fontSize: 11, color: p.stock > 0 ? "var(--accent-emerald)" : "var(--accent-rose)" }}>
                    Stock: {p.stock}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Cart table */}
        <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
              🛒 Cart <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 400 }}>({cart.length} item{cart.length !== 1 ? "s" : ""})</span>
            </span>
            {cart.length > 0 && (
              <button className="btn btn-danger" style={{ fontSize: 11, padding: "4px 10px" }} onClick={clearCart}>🗑 Clear</button>
            )}
          </div>

          {cart.length === 0 ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10, color: "var(--text-muted)", background: "var(--bg-card)", borderRadius: 12, border: "2px dashed var(--border)", padding: 40 }}>
              <span style={{ fontSize: 40 }}>🛒</span>
              <span>Search and add products above</span>
            </div>
          ) : (
            <div className="glass-card" style={{ borderRadius: 12, overflow: "hidden" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th style={{ textAlign: "center" }}>Price</th>
                    <th style={{ textAlign: "center", width: 90 }}>Qty</th>
                    <th style={{ textAlign: "center", width: 100 }}>Discount/pc</th>
                    <th style={{ textAlign: "right" }}>Line Total</th>
                    <th style={{ textAlign: "center", width: 50 }}>✕</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map(c => {
                    const lineTotal = Number(c.unit_price) * c.quantity - (c.discount_amount || 0) * c.quantity;
                    return (
                      <tr key={c.product_id}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 12 }}>{c.name}</div>
                          <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>{c.barcode}</div>
                        </td>
                        <td className="mono" style={{ textAlign: "center", color: "var(--text-secondary)" }}>{fmt(Number(c.unit_price))}</td>
                        <td style={{ textAlign: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
                            <button onClick={() => updateQty(c.product_id, c.quantity - 1)} style={{ width: 24, height: 24, borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-surface)", color: "var(--text-primary)", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                            <input
                              type="number"
                              min={1}
                              max={c.stock}
                              value={c.quantity}
                              onChange={e => updateQty(c.product_id, Number(e.target.value))}
                              style={{ width: 36, textAlign: "center", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", padding: "2px 4px", fontSize: 12, fontFamily: "inherit" }}
                            />
                            <button onClick={() => updateQty(c.product_id, c.quantity + 1)} style={{ width: 24, height: 24, borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-surface)", color: "var(--text-primary)", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                          </div>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <input
                            type="number"
                            min={0}
                            value={c.discount_amount}
                            onChange={e => updateDiscount(c.product_id, Number(e.target.value))}
                            style={{ width: 80, textAlign: "center", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--accent-rose)", padding: "4px 6px", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}
                          />
                        </td>
                        <td className="mono" style={{ textAlign: "right", fontWeight: 700, color: "var(--accent-emerald)" }}>{fmt(lineTotal)}</td>
                        <td style={{ textAlign: "center" }}>
                          <button onClick={() => removeItem(c.product_id)} style={{ background: "none", border: "none", color: "var(--accent-rose)", cursor: "pointer", fontSize: 16 }}>✕</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT — Checkout panel */}
      <div style={{ width: 340, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>

        {/* Totals card */}
        <div className="glass-card" style={{ borderRadius: 14, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>💰 Order Summary</div>
          {[
            { label: "Subtotal", val: fmt(subtotal), color: "var(--text-secondary)" },
            { label: "Discounts", val: discountTotal > 0 ? `-Rs. ${discountTotal.toFixed(2)}` : "—", color: "var(--accent-rose)" },
            { label: "Tax (18%)", val: fmt(taxTotal), color: "var(--text-muted)" },
          ].map(row => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: "var(--text-muted)" }}>{row.label}</span>
              <span style={{ color: row.color, fontFamily: "'JetBrains Mono', monospace" }}>{row.val}</span>
            </div>
          ))}
          <div style={{ borderTop: "1px solid var(--border)", marginTop: 6, paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Total</span>
            <span style={{ fontWeight: 900, fontSize: 20, color: "var(--accent-blue)", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(total)}</span>
          </div>
        </div>

        {/* Customer */}
        <div className="glass-card" style={{ borderRadius: 14, padding: "14px 18px" }}>
          <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Customer (optional)</label>
          <input
            className="input"
            style={{ marginTop: 6 }}
            placeholder="Walk-in customer"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
          />
        </div>

        {/* Payment */}
        <div className="glass-card" style={{ borderRadius: 14, padding: "14px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Payment Method</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {PAYMENT_METHODS.map(m => (
              <button
                key={m}
                onClick={() => setPaymentMethod(m)}
                style={{
                  padding: "8px",
                  borderRadius: 8,
                  border: `1px solid ${paymentMethod === m ? "var(--accent-blue)" : "var(--border)"}`,
                  background: paymentMethod === m ? "rgba(88, 166, 255, 0.12)" : "var(--bg-surface)",
                  color: paymentMethod === m ? "var(--accent-blue)" : "var(--text-muted)",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 12,
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
              >
                {m === "CASH" ? "💵" : m === "CARD" ? "💳" : m === "MOBILE" ? "📱" : "⭐"} {m}
              </button>
            ))}
          </div>
          {(paymentMethod === "CARD" || paymentMethod === "MOBILE") && (
            <input
              className="input"
              placeholder="Reference / transaction ID"
              value={paymentRef}
              onChange={e => setPaymentRef(e.target.value)}
            />
          )}
          <input
            className="input"
            type="number"
            placeholder="Amount tendered (Rs.)"
            value={amountPaid}
            onChange={e => setAmountPaid(e.target.value)}
          />
          {Number(amountPaid) > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderTop: "1px solid var(--border)" }}>
              <span style={{ color: "var(--text-muted)" }}>Change</span>
              <span style={{ fontWeight: 700, color: change >= 0 ? "var(--accent-emerald)" : "var(--accent-rose)", fontFamily: "'JetBrains Mono', monospace" }}>
                {fmt(Math.abs(change))} {change < 0 ? "(short)" : ""}
              </span>
            </div>
          )}
        </div>

        {/* Checkout button */}
        <button
          className="btn btn-emerald"
          style={{ width: "100%", justifyContent: "center", fontSize: 15, padding: "14px", borderRadius: 12, fontWeight: 800 }}
          onClick={handleCheckout}
          disabled={cart.length === 0 || submitting}
        >
          {submitting ? "⏳ Processing…" : `✅ Complete Sale · ${fmt(total)}`}
        </button>

        <button className="btn btn-ghost" style={{ width: "100%", justifyContent: "center" }} onClick={clearCart}>
          🗑 Cancel / Clear
        </button>
      </div>

      {/* Success receipt modal */}
      {receipt && (
        <div className="modal-overlay" onClick={() => setReceipt(null)}>
          <div className="modal-box" style={{ width: 400, padding: 32, textAlign: "center" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
            <h2 style={{ fontWeight: 800, fontSize: 20, color: "var(--text-primary)", marginBottom: 8 }}>Sale Completed!</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 4 }}>
              Sale <strong style={{ color: "var(--accent-blue)", fontFamily: "monospace" }}>SALE-{receipt.sale_id}</strong> recorded
            </p>
            <p style={{ color: "var(--accent-emerald)", fontWeight: 800, fontSize: 24, fontFamily: "'JetBrains Mono', monospace", margin: "14px 0" }}>
              Rs. {Number(receipt.total_amount).toLocaleString("en-LK", { minimumFractionDigits: 2 })}
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
              <button className="btn btn-primary" onClick={() => setReceipt(null)}>New Sale</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
