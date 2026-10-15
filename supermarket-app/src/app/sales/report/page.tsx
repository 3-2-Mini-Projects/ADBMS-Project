"use client";

import React, { useState, useEffect, useCallback } from "react";

interface ReportData {
  summary: {
    total_sales: number;
    completed: number;
    cancelled: number;
    revenue: string | number;
    avg_sale: string | number;
    total_discounts: string | number;
    total_tax: string | number;
  };
  daily: { date: string; sales_count: number; revenue: string | number }[];
  topProducts: { product_name: string; barcode: string; units_sold: number; revenue: string | number }[];
  paymentBreakdown: { method: string; count: number; total: string | number }[];
  byBranch: { branch_name: string; sales_count: number; revenue: string | number }[];
}

interface Branch { branch_id: number; name: string; }

export default function SalesReportPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const today = new Date();
    const past = new Date();
    past.setDate(past.getDate() - 30);
    setStartDate(past.toISOString().slice(0, 10));
    setEndDate(today.toISOString().slice(0, 10));
  }, []);

  useEffect(() => {
    fetch("/api/branches")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setBranches(data); })
      .catch(() => {});
  }, []);

  const fetchReport = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    setError(null);
    try {
      const p = new URLSearchParams({ startDate, endDate });
      if (branchId) p.set("branchId", branchId);
      const res = await fetch(`/api/sales/report?${p}`);
      const d = await res.json();
      if (!res.ok || d.error || !d.summary) {
        setError(d.error || "Failed to load sales report data");
        setData(null);
      } else {
        setData(d);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load report");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, branchId]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const fmt = (v: string | number) => `Rs. ${Number(v).toLocaleString("en-LK", { minimumFractionDigits: 2 })}`;
  const fmtShort = (v: string | number) => {
    const n = Number(v);
    if (n >= 1_000_000) return `Rs. ${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000)     return `Rs. ${(n / 1_000).toFixed(1)}K`;
    return `Rs. ${n.toFixed(2)}`;
  };

  const METHOD_ICONS: Record<string, string> = { CASH: "💵", CARD: "💳", MOBILE: "📱", POINTS: "⭐" };

  // Bar chart helper
  const maxRevenue = Math.max(...(data?.daily?.map(d => Number(d.revenue)) || [1]));
  const barColor = (i: number) => `hsl(${210 + i * 5}, 80%, 60%)`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
            📊 Sales Report
          </h1>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            Revenue analytics, top products, payment breakdown
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input className="input" style={{ width: 140 }} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <span style={{ color: "var(--text-muted)", fontSize: 13 }}>to</span>
          <input className="input" style={{ width: 140 }} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          <select className="input" style={{ width: 160 }} value={branchId} onChange={e => setBranchId(e.target.value)}>
            <option value="">All Branches</option>
            {branches.map(b => <option key={b.branch_id} value={b.branch_id}>{b.name}</option>)}
          </select>
          <button className="btn btn-primary" onClick={fetchReport}>Generate</button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: "14px 18px",
          background: "rgba(244, 63, 94, 0.12)",
          border: "1px solid rgba(244, 63, 94, 0.3)",
          borderRadius: 10,
          color: "var(--accent-rose)",
          fontSize: 13,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12
        }}>
          <span>⚠️ {error}</span>
          <button className="btn btn-ghost" style={{ fontSize: 12, padding: "4px 10px", borderColor: "rgba(244, 63, 94, 0.4)" }} onClick={fetchReport}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 80 }}>
          <div style={{ width: 36, height: 36, border: "4px solid var(--border)", borderTopColor: "var(--accent-blue)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        </div>
      ) : data && data.summary ? (
        <>
          {/* KPI Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
            {[
              { icon: "💰", label: "Total Revenue", val: fmtShort(data.summary.revenue ?? 0), color: "var(--accent-emerald)" },
              { icon: "🧾", label: "Total Sales", val: data.summary.total_sales ?? 0, color: "var(--accent-blue)" },
              { icon: "✅", label: "Completed", val: data.summary.completed ?? 0, color: "var(--accent-emerald)" },
              { icon: "❌", label: "Cancelled", val: data.summary.cancelled ?? 0, color: "var(--accent-rose)" },
              { icon: "📈", label: "Avg Ticket", val: fmtShort(data.summary.avg_sale ?? 0), color: "var(--accent-cyan)" },
              { icon: "🏷️", label: "Total Discounts", val: fmtShort(data.summary.total_discounts ?? 0), color: "var(--accent-amber)" },
              { icon: "🏛️", label: "Tax Collected", val: fmtShort(data.summary.total_tax ?? 0), color: "var(--accent-purple)" },
            ].map(card => (
              <div key={card.label} className="stat-card" style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{card.icon}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: card.color, fontFamily: "'JetBrains Mono', monospace" }}>{card.val}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{card.label}</div>
              </div>
            ))}
          </div>

          {/* Daily trend chart */}
          {Array.isArray(data.daily) && data.daily.length > 0 && (
            <div className="glass-card" style={{ borderRadius: 14, padding: "20px 24px" }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, color: "var(--text-primary)" }}>📅 Daily Revenue Trend</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 120, overflowX: "auto", paddingBottom: 4 }}>
                {data.daily.map((d, i) => {
                  const h = maxRevenue > 0 ? (Number(d.revenue) / maxRevenue) * 100 : 0;
                  return (
                    <div key={d.date} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: "1 0 28px", maxWidth: 48, minWidth: 24 }}>
                      <div
                        title={`${d.date}: ${fmt(d.revenue)} (${d.sales_count} sales)`}
                        style={{
                          width: "100%",
                          height: `${Math.max(h, 3)}%`,
                          background: `hsl(${210 + i * 3}, 75%, 55%)`,
                          borderRadius: "4px 4px 2px 2px",
                          transition: "opacity 0.2s",
                          cursor: "pointer",
                          minHeight: 3,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = "0.7"; }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                      />
                      <div style={{ fontSize: 9, color: "var(--text-muted)", writingMode: "vertical-rl", transform: "rotate(180deg)", lineHeight: 1 }}>
                        {d.date.slice(5)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Top Products */}
            <div className="glass-card" style={{ borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", fontWeight: 700, fontSize: 13 }}>🏆 Top 10 Products</div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Product</th>
                    <th style={{ textAlign: "right" }}>Units</th>
                    <th style={{ textAlign: "right" }}>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.topProducts || []).map((p, i) => (
                    <tr key={p.barcode}>
                      <td style={{ color: i < 3 ? "var(--accent-amber)" : "var(--text-muted)", fontWeight: 700, fontSize: 11 }}>{i + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 12 }}>{p.product_name}</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace" }}>{p.barcode}</div>
                      </td>
                      <td className="mono" style={{ textAlign: "right", color: "var(--accent-blue)" }}>{p.units_sold}</td>
                      <td className="mono" style={{ textAlign: "right", color: "var(--accent-emerald)", fontWeight: 700 }}>{fmtShort(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Payment breakdown + Branch breakdown */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Payment */}
              <div className="glass-card" style={{ borderRadius: 14, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", fontWeight: 700, fontSize: 13 }}>💳 Payment Breakdown</div>
                <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
                  {(data.paymentBreakdown || []).map(pm => {
                    const grandTotal = (data.paymentBreakdown || []).reduce((a, x) => a + Number(x.total), 0);
                    const pct = grandTotal > 0 ? (Number(pm.total) / grandTotal * 100) : 0;
                    return (
                      <div key={pm.method}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                          <span>{METHOD_ICONS[pm.method] || "💰"} {pm.method} <span style={{ color: "var(--text-muted)" }}>({pm.count})</span></span>
                          <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--text-secondary)" }}>{fmtShort(pm.total)} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div style={{ height: 4, background: "var(--bg-surface)", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent-blue)", borderRadius: 2 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Branch breakdown */}
              <div className="glass-card" style={{ borderRadius: 14, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", fontWeight: 700, fontSize: 13 }}>🏪 Sales by Branch</div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Branch</th>
                      <th style={{ textAlign: "center" }}>Sales</th>
                      <th style={{ textAlign: "right" }}>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.byBranch || []).map(b => (
                      <tr key={b.branch_name}>
                        <td style={{ fontWeight: 600, fontSize: 12 }}>{b.branch_name}</td>
                        <td className="mono" style={{ textAlign: "center" }}>{b.sales_count}</td>
                        <td className="mono" style={{ textAlign: "right", color: "var(--accent-emerald)", fontWeight: 700 }}>{fmtShort(b.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>No data available</div>
      )}
    </div>
  );
}
