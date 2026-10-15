"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";

interface RecentSale {
  sale_id: number;
  sale_date: string;
  status: string;
  total_amount: string | number;
  branch_name: string;
  cashier_name: string;
  customer_name: string | null;
  items_count: number;
}

interface TodayStats {
  total_txns: number;
  today_revenue: string | number;
  cancelled_count: number;
  avg_ticket: string | number;
}

interface Cashier {
  cashier_name: string;
  sales_count: number;
  total: string | number;
}

interface MonitorData {
  recent: RecentSale[];
  todayStats: TodayStats;
  activeCashiers: Cashier[];
}

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: "var(--accent-emerald)",
  CANCELLED: "var(--accent-rose)",
  OPEN:      "var(--accent-amber)",
};

export default function SalesMonitorPage() {
  const [data, setData] = useState<MonitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState<{ branch_id: number; name: string }[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [newSaleIds, setNewSaleIds] = useState<Set<number>>(new Set());
  const prevIdsRef = useRef<Set<number>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/branches").then(r => r.json()).then(d => { if (Array.isArray(d)) setBranches(d); });
  }, []);

  const fetchData = useCallback(async (isAuto = false) => {
    if (!isAuto) setLoading(true);
    try {
      const p = new URLSearchParams();
      if (branchId) p.set("branchId", branchId);
      const res = await fetch(`/api/sales/monitor?${p}`);
      const d: MonitorData = await res.json();
      if (d.recent) {
        const currentIds = new Set(d.recent.map(s => s.sale_id));
        const prev = prevIdsRef.current;
        const fresh = new Set<number>();
        currentIds.forEach(id => { if (prev.size > 0 && !prev.has(id)) fresh.add(id); });
        setNewSaleIds(fresh);
        prevIdsRef.current = currentIds;
        setTimeout(() => setNewSaleIds(new Set()), 3000);
        setData(d);
        setLastUpdated(new Date());
      }
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoRefresh) {
      intervalRef.current = setInterval(() => fetchData(true), 10000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, fetchData]);

  const fmt = (v: string | number) => `Rs. ${Number(v).toLocaleString("en-LK", { minimumFractionDigits: 2 })}`;
  const fmtShort = (v: string | number) => {
    const n = Number(v);
    if (n >= 1_000_000) return `Rs. ${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000)     return `Rs. ${(n / 1_000).toFixed(1)}K`;
    return `Rs. ${n.toFixed(0)}`;
  };

  const todayStats = data?.todayStats;
  const maxCashierTotal = Math.max(...(data?.activeCashiers?.map(c => Number(c.total)) || [1]));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
            <span>🖥️</span>
            Live Sales Monitor
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 500, color: "var(--accent-emerald)", background: "rgba(63, 185, 80, 0.1)", border: "1px solid rgba(63, 185, 80, 0.25)", padding: "3px 10px", borderRadius: 20 }}>
              <span className="pulse-live" />
              LIVE
            </span>
          </h1>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            Real-time transaction feed · Today&apos;s performance · {lastUpdated ? `Last updated ${lastUpdated.toLocaleTimeString("en-LK")}` : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select className="input" style={{ width: 160 }} value={branchId} onChange={e => setBranchId(e.target.value)}>
            <option value="">All Branches</option>
            {branches.map(b => <option key={b.branch_id} value={b.branch_id}>{b.name}</option>)}
          </select>
          <button
            className={autoRefresh ? "btn btn-emerald" : "btn btn-ghost"}
            style={{ fontSize: 12 }}
            onClick={() => setAutoRefresh(v => !v)}
          >
            {autoRefresh ? "⏸ Pause" : "▶ Auto-Refresh"}
          </button>
          <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => fetchData()}>↻ Refresh</button>
        </div>
      </div>

      {/* Today's KPI stats */}
      {todayStats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          {[
            { icon: "💰", label: "Today Revenue", val: fmtShort(todayStats.today_revenue), color: "var(--accent-emerald)", sub: "Completed sales" },
            { icon: "🧾", label: "Total Transactions", val: todayStats.total_txns, color: "var(--accent-blue)", sub: "All statuses" },
            { icon: "📈", label: "Avg Ticket", val: fmtShort(todayStats.avg_ticket), color: "var(--accent-cyan)", sub: "Per completed sale" },
            { icon: "❌", label: "Cancelled", val: todayStats.cancelled_count, color: "var(--accent-rose)", sub: "Today" },
          ].map(card => (
            <div key={card.label} className="stat-card" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20 }}>{card.icon}</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)", flex: 1 }}>{card.label}</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: card.color, fontFamily: "'JetBrains Mono', monospace" }}>{card.val}</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{card.sub}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16 }}>
        {/* Live feed */}
        <div className="glass-card" style={{ borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
            <span className="pulse-live" />
            <span style={{ fontWeight: 700, fontSize: 13 }}>Live Transaction Feed</span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)" }}>Last 20 transactions</span>
          </div>

          {loading ? (
            <div style={{ padding: 60, textAlign: "center" }}>
              <div style={{ width: 32, height: 32, border: "3px solid var(--border)", borderTopColor: "var(--accent-blue)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Loading live feed…</div>
            </div>
          ) : (
            <div style={{ overflowY: "auto", flex: 1 }}>
              {data?.recent?.map((sale) => {
                const isNew = newSaleIds.has(sale.sale_id);
                return (
                  <div
                    key={sale.sale_id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "12px 18px",
                      borderBottom: "1px solid rgba(30, 45, 61, 0.4)",
                      gap: 14,
                      background: isNew ? "rgba(63, 185, 80, 0.06)" : "transparent",
                      transition: "background 0.5s",
                      animation: isNew ? "fadeIn 0.4s ease" : undefined,
                    }}
                  >
                    {/* Status dot */}
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLOR[sale.status] || "var(--text-muted)", flexShrink: 0 }} />

                    {/* Sale info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: "var(--accent-blue)" }}>
                          #SALE-{sale.sale_id}
                        </span>
                        <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: `rgba(${sale.status === "COMPLETED" ? "63,185,80" : sale.status === "CANCELLED" ? "248,81,73" : "210,153,34"},0.12)`, color: STATUS_COLOR[sale.status], fontWeight: 700, fontFamily: "monospace" }}>
                          {sale.status}
                        </span>
                        {isNew && <span style={{ fontSize: 10, color: "var(--accent-emerald)", fontWeight: 700, animation: "pulse-dot 1s infinite" }}>● NEW</span>}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                        {sale.cashier_name} · {sale.branch_name} · {sale.items_count} item{sale.items_count !== 1 ? "s" : ""}
                        {sale.customer_name && ` · ${sale.customer_name}`}
                      </div>
                    </div>

                    {/* Right side */}
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: 14, color: sale.status === "COMPLETED" ? "var(--accent-emerald)" : "var(--text-muted)" }}>
                        {fmt(sale.total_amount)}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                        {new Date(sale.sale_date).toLocaleTimeString("en-LK")}
                      </div>
                    </div>
                  </div>
                );
              })}
              {(!data?.recent || data.recent.length === 0) && (
                <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                  No transactions yet today
                </div>
              )}
            </div>
          )}
        </div>

        {/* Active cashiers */}
        <div className="glass-card" style={{ borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", fontWeight: 700, fontSize: 13 }}>
            👤 Active Cashiers Today
          </div>
          <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
            {data?.activeCashiers?.length ? data.activeCashiers.map((c, i) => {
              const pct = maxCashierTotal > 0 ? (Number(c.total) / maxCashierTotal * 100) : 0;
              return (
                <div key={c.cashier_name}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{
                        width: 24, height: 24, borderRadius: "50%",
                        background: `hsl(${210 + i * 30}, 70%, 50%)`,
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 800, color: "#fff", flexShrink: 0,
                      }}>{c.cashier_name[0]}</span>
                      <span style={{ fontWeight: 600 }}>{c.cashier_name}</span>
                    </span>
                    <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--accent-emerald)" }}>{fmtShort(c.total)}</span>
                  </div>
                  <div style={{ height: 5, background: "var(--bg-surface)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: `hsl(${210 + i * 30}, 70%, 50%)`, borderRadius: 3, transition: "width 0.5s" }} />
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>{c.sales_count} sales</div>
                </div>
              );
            }) : (
              <div style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center", padding: 24 }}>No active cashiers today</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
