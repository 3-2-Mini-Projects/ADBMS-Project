"use client";

import React, { useState, useEffect, useCallback } from "react";

interface Sale {
  sale_id: number;
  branch_name: string;
  cashier_name: string;
  customer_name: string | null;
  customer_card: string | null;
  sale_date: string;
  status: "COMPLETED" | "OPEN" | "CANCELLED";
  subtotal: string | number;
  discount_total: string | number;
  tax_total: string | number;
  total_amount: string | number;
  items_count: number;
}

interface SaleDetail extends Sale {
  branch_address: string;
  branch_phone: string;
  items: { sale_item_id: number; product_name: string; quantity: number; unit_price: string; line_total: string }[];
  payments: { payment_id: number; method: string; amount: string; reference: string | null; paid_at: string }[];
}

export default function SalesHistoryPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [selectedSale, setSelectedSale] = useState<SaleDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (status) p.set("status", status);
      if (search.trim()) p.set("search", search.trim());
      const res = await fetch(`/api/sales?${p}`);
      const data = await res.json();
      if (Array.isArray(data)) setSales(data);
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => { fetchSales(); }, [status]);

  const viewDetail = async (id: number) => {
    setDetailLoading(true);
    const res = await fetch(`/api/sales/${id}`);
    const data = await res.json();
    setSelectedSale(data);
    setDetailLoading(false);
  };

  const fmt = (v: string | number) => `Rs. ${Number(v).toLocaleString("en-LK", { minimumFractionDigits: 2 })}`;

  const statusColor: Record<string, string> = {
    COMPLETED: "badge badge-completed",
    OPEN: "badge badge-open",
    CANCELLED: "badge badge-cancelled",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
            📋 Sales History
          </h1>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            Complete transaction ledger with receipt viewer
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <form onSubmit={(e) => { e.preventDefault(); fetchSales(); }} style={{ display: "flex", gap: 6 }}>
            <input
              className="input"
              style={{ width: 220 }}
              type="text"
              placeholder="Search sale ID or customer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="btn btn-primary" type="submit">Search</button>
          </form>
          <select
            className="input"
            style={{ width: 150 }}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="OPEN">Open</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <button className="btn btn-ghost" onClick={fetchSales}>↻ Refresh</button>
        </div>
      </div>

      {/* Summary pills */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {[
          { label: "Total Shown", value: sales.length, color: "var(--accent-blue)" },
          { label: "Completed", value: sales.filter(s => s.status === "COMPLETED").length, color: "var(--accent-emerald)" },
          { label: "Cancelled", value: sales.filter(s => s.status === "CANCELLED").length, color: "var(--accent-rose)" },
          { label: "Revenue", value: `Rs. ${sales.filter(s=>s.status==="COMPLETED").reduce((a,s)=>a+Number(s.total_amount),0).toLocaleString("en-LK",{maximumFractionDigits:0})}`, color: "var(--accent-amber)" },
        ].map(pill => (
          <div key={pill.label} style={{ padding: "6px 14px", borderRadius: 20, background: "var(--bg-card)", border: "1px solid var(--border)", fontSize: 12 }}>
            <span style={{ color: "var(--text-muted)" }}>{pill.label}: </span>
            <span style={{ color: pill.color, fontWeight: 700 }}>{pill.value}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="table-wrapper glass-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Sale ID</th>
              <th>Date & Time</th>
              <th>Branch</th>
              <th>Cashier</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Subtotal</th>
              <th style={{ textAlign: "right" }}>Discount</th>
              <th style={{ textAlign: "right" }}>Tax</th>
              <th style={{ textAlign: "right" }}>Total</th>
              <th style={{ textAlign: "center" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={12} style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 24, height: 24, border: "3px solid var(--border)", borderTopColor: "var(--accent-blue)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    Loading sales records…
                  </div>
                </td>
              </tr>
            ) : sales.length === 0 ? (
              <tr>
                <td colSpan={12} style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
                  No sales found
                </td>
              </tr>
            ) : sales.map((s) => (
              <tr key={s.sale_id}>
                <td className="mono" style={{ color: "var(--accent-blue)", fontWeight: 700 }}>#SALE-{s.sale_id}</td>
                <td className="mono" style={{ fontSize: 11 }}>{new Date(s.sale_date).toLocaleString("en-LK")}</td>
                <td>{s.branch_name}</td>
                <td>{s.cashier_name}</td>
                <td>
                  {s.customer_name
                    ? <div><div>{s.customer_name}</div><div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>{s.customer_card}</div></div>
                    : <span style={{ color: "var(--text-muted)" }}>Walk-in</span>
                  }
                </td>
                <td style={{ textAlign: "center" }}>
                  <span style={{ background: "var(--bg-card2)", padding: "2px 8px", borderRadius: 6, fontSize: 11, color: "var(--text-secondary)" }}>{s.items_count}</span>
                </td>
                <td><span className={statusColor[s.status] || "badge"}>{s.status}</span></td>
                <td className="mono" style={{ textAlign: "right", color: "var(--text-secondary)" }}>{fmt(s.subtotal)}</td>
                <td className="mono" style={{ textAlign: "right", color: "var(--accent-rose)" }}>
                  {Number(s.discount_total) > 0 ? `-Rs. ${Number(s.discount_total).toFixed(2)}` : "—"}
                </td>
                <td className="mono" style={{ textAlign: "right", color: "var(--text-muted)" }}>{fmt(s.tax_total)}</td>
                <td className="mono" style={{ textAlign: "right", color: "var(--accent-emerald)", fontWeight: 700 }}>{fmt(s.total_amount)}</td>
                <td style={{ textAlign: "center" }}>
                  <button
                    onClick={() => viewDetail(s.sale_id)}
                    className="btn btn-ghost"
                    style={{ padding: "4px 10px", fontSize: 11 }}
                  >👁 View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Receipt Modal */}
      {selectedSale && (
        <div className="modal-overlay" onClick={() => setSelectedSale(null)}>
          <div className="modal-box" style={{ width: "100%", maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
              <h3 style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
                🧾 Receipt — SALE-{selectedSale.sale_id}
              </h3>
              <button onClick={() => setSelectedSale(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 20 }}>×</button>
            </div>

            <div id="printable-receipt" style={{ padding: "20px 24px", overflowY: "auto", maxHeight: "60vh", background: "#fff", margin: "16px", borderRadius: 10, color: "#111", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
              {/* Header */}
              <div style={{ textAlign: "center", borderBottom: "1px dashed #ccc", paddingBottom: 12, marginBottom: 12 }}>
                <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: 2 }}>NEXUS SUPERMARKET</div>
                <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>{selectedSale.branch_name}</div>
                {selectedSale.branch_address && <div style={{ fontSize: 10, color: "#666" }}>{selectedSale.branch_address}</div>}
                {selectedSale.branch_phone   && <div style={{ fontSize: 10, color: "#666" }}>Tel: {selectedSale.branch_phone}</div>}
              </div>
              {/* Meta */}
              <div style={{ borderBottom: "1px dashed #ccc", paddingBottom: 10, marginBottom: 10, display: "flex", flexDirection: "column", gap: 3 }}>
                {[
                  ["RECEIPT #", `SALE-${selectedSale.sale_id}`],
                  ["DATE", new Date(selectedSale.sale_date).toLocaleString("en-LK")],
                  ["CASHIER", selectedSale.cashier_name],
                  ...(selectedSale.customer_name ? [["CUSTOMER", `${selectedSale.customer_name} (${selectedSale.customer_card})`]] : []),
                  ["STATUS", selectedSale.status],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#666" }}>{k}:</span>
                    <span style={{ fontWeight: 700 }}>{v}</span>
                  </div>
                ))}
              </div>
              {/* Items */}
              <div style={{ borderBottom: "1px dashed #ccc", paddingBottom: 10, marginBottom: 10 }}>
                {selectedSale.items?.map((it) => (
                  <div key={it.sale_item_id} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                    <span style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.product_name} ×{it.quantity}</span>
                    <span style={{ fontWeight: 700 }}>Rs. {Number(it.line_total).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              {/* Totals */}
              <div style={{ borderBottom: "1px dashed #ccc", paddingBottom: 10, marginBottom: 10, display: "flex", flexDirection: "column", gap: 3 }}>
                {[
                  ["Subtotal", `Rs. ${Number(selectedSale.subtotal).toFixed(2)}`],
                  ...(Number(selectedSale.discount_total) > 0 ? [["Discounts", `-Rs. ${Number(selectedSale.discount_total).toFixed(2)}`]] : []),
                  ["Tax (18%)", `Rs. ${Number(selectedSale.tax_total).toFixed(2)}`],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span>{k}:</span><span>{v}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 900, fontSize: 14, borderTop: "1px solid #ccc", paddingTop: 6, marginTop: 4 }}>
                  <span>TOTAL PAID:</span>
                  <span>Rs. {Number(selectedSale.total_amount).toFixed(2)}</span>
                </div>
              </div>
              {/* Payments */}
              <div>
                <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 4 }}>PAYMENT RECORDS:</div>
                {selectedSale.payments?.map((pm) => (
                  <div key={pm.payment_id} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#555" }}>
                    <span>{pm.method}{pm.reference ? ` (${pm.reference})` : ""}:</span>
                    <span>Rs. {Number(pm.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, padding: "0 16px 16px" }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => window.print()}>🖨 Print Receipt</button>
              <button className="btn btn-ghost" onClick={() => setSelectedSale(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
