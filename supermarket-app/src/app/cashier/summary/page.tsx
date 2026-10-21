"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCashier } from "@/lib/cashierContext";

interface CashierSummaryData {
  transactions_count: number;
  total_sales: number;
  total_tax: number;
  total_discount: number;
  total_subtotal: number;
  total_tendered_cash: number;
  total_change: number;
}

interface PaymentMethodBreakdown {
  method: string;
  count: number;
  total_amount: number;
}

interface ActiveCashier {
  employee_id: number;
  full_name: string;
  transactions_count: number;
  total_sales: number;
}

interface BranchDailySummary {
  summary_id: number;
  branch_id: number;
  branch_name: string;
  branch_code: string;
  summary_date: string;
  transactions_count: number;
  total_sales: number;
  total_tax: number;
}

interface CashierHistoricalDay {
  sale_date: string;
  transactions_count: number;
  total_sales: number;
  total_tax: number;
  total_discount: number;
}

export default function CashierDailySummaryPage() {
  const router = useRouter();
  const { cashier } = useCashier();

  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [activeTab, setActiveTab] = useState<"MY_CASHIER" | "BRANCH_OVERVIEW">("MY_CASHIER");

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const [cashierSummary, setCashierSummary] = useState<CashierSummaryData | null>(null);
  const [paymentsByMethod, setPaymentsByMethod] = useState<PaymentMethodBreakdown[]>([]);
  const [cashierReturns, setCashierReturns] = useState<{ returns_count: number; total_refunds: number }>({
    returns_count: 0,
    total_refunds: 0,
  });

  const [branchSummaryForDate, setBranchSummaryForDate] = useState<any>(null);
  const [activeCashiers, setActiveCashiers] = useState<ActiveCashier[]>([]);
  const [branchSummaries, setBranchSummaries] = useState<BranchDailySummary[]>([]);
  const [cashierHistory, setCashierHistory] = useState<CashierHistoricalDay[]>([]);

  const fetchSummary = useCallback(async () => {
    if (!cashier) return;
    setLoading(true);
    setSyncMessage(null);
    try {
      const res = await fetch(
        `/api/cashier/summary?branchId=${cashier.branch_id}&cashierId=${cashier.employee_id}&date=${selectedDate}`
      );
      const data = await res.json();
      if (res.ok) {
        setCashierSummary(data.cashierSummary);
        setPaymentsByMethod(data.cashierPaymentsByMethod || []);
        setCashierReturns(data.cashierReturns || { returns_count: 0, total_refunds: 0 });
        setBranchSummaryForDate(data.branchSummaryForDate);
        setActiveCashiers(data.activeCashiers || []);
        setBranchSummaries(data.branchSummaries || []);
        setCashierHistory(data.cashierDailyBreakdown || []);
      }
    } catch (err) {
      console.error("Failed to load daily summary:", err);
    } finally {
      setLoading(false);
    }
  }, [cashier, selectedDate]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleSyncSummary = async () => {
    if (!cashier) return;
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/cashier/summary/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: cashier.branch_id,
          date: selectedDate,
        }),
      });

      let result: any = null;
      try {
        result = await res.json();
      } catch {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Server returned HTTP ${res.status}`);
      }

      if (res.ok && result.success) {
        setSyncMessage(`✓ Daily sales summary synchronized into database for ${selectedDate}`);
        fetchSummary();
      } else {
        setSyncMessage(`⚠️ Sync notice: ${result?.message || result?.error || "Failed to sync"}`);
      }
    } catch (err: any) {
      setSyncMessage(`⚠️ Error syncing summary: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const fmt = (n: number | string) =>
    `Rs. ${Number(n || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const netCashInTill =
    (cashierSummary?.total_tendered_cash || 0) -
    (cashierSummary?.total_change || 0) -
    (cashierReturns?.total_refunds || 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 40 }}>
      {/* Top Header & Breadcrumb */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <button
              type="button"
              onClick={() => router.push("/cashier/dashboard")}
              className="btn btn-ghost"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                fontSize: 12,
                fontWeight: 700,
                color: "var(--accent-blue)",
                background: "rgba(56, 189, 248, 0.08)",
                border: "1px solid rgba(56, 189, 248, 0.25)",
                borderRadius: 8,
              }}
            >
              ← Back to Dashboard
            </button>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>/</span>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Daily Sales Summary</span>
          </div>

          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
            📑 Cashier & Branch Daily Summary
          </h1>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            End-of-day sales reconciliation, cash drawer balancing, and branch revenue aggregates
          </p>
        </div>

        {/* Date Selector & Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-card)", padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)" }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Date:</span>
            <input
              type="date"
              className="input"
              style={{ padding: "4px 8px", fontSize: 12, width: 140 }}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={todayStr}
            />
            {selectedDate !== todayStr && (
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: "2px 8px", fontSize: 11 }}
                onClick={() => setSelectedDate(todayStr)}
              >
                Today
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleSyncSummary}
            disabled={syncing}
            className="btn btn-secondary"
            style={{ padding: "8px 14px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
            title="Recalculate & record official daily sales summary into database"
          >
            {syncing ? "Syncing..." : "🔄 Reconcile & Record Summary"}
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="btn btn-primary"
            style={{ padding: "8px 14px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
          >
            🖨️ Print Summary
          </button>
        </div>
      </div>

      {syncMessage && (
        <div
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            background: syncMessage.startsWith("✓") ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)",
            border: `1px solid ${syncMessage.startsWith("✓") ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
            color: syncMessage.startsWith("✓") ? "#34d399" : "#fbbf24",
            fontSize: 12.5,
            fontWeight: 600,
          }}
        >
          {syncMessage}
        </div>
      )}

      {/* Overview Stat Cards for Selected Date */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        {/* Card 1: Completed Sales */}
        <div className="stat-card">
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: 11.5, textTransform: "uppercase" }}>
            <span>YOUR TRANSACTIONS</span>
            <span style={{ fontSize: 16 }}>🧾</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "var(--accent-emerald)", marginTop: 8 }}>
            {cashierSummary?.transactions_count || 0}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
            Completed sales by you on {selectedDate}
          </div>
        </div>

        {/* Card 2: Cashier Net Sales */}
        <div className="stat-card">
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: 11.5, textTransform: "uppercase" }}>
            <span>YOUR NET SALES</span>
            <span style={{ fontSize: 16 }}>💰</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", marginTop: 8 }}>
            {fmt(cashierSummary?.total_sales || 0)}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
            Tax: {fmt(cashierSummary?.total_tax || 0)} • Disc: -{fmt(cashierSummary?.total_discount || 0)}
          </div>
        </div>

        {/* Card 3: Net Cash In Drawer */}
        <div className="stat-card">
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: 11.5, textTransform: "uppercase" }}>
            <span>CASH DRAWER BALANCE</span>
            <span style={{ fontSize: 16 }}>💵</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--accent-blue)", marginTop: 8 }}>
            {fmt(netCashInTill)}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
            Tendered: {fmt(cashierSummary?.total_tendered_cash || 0)} • Change: -{fmt(cashierSummary?.total_change || 0)}
          </div>
        </div>

        {/* Card 4: Branch Daily Performance */}
        <div className="stat-card">
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: 11.5, textTransform: "uppercase" }}>
            <span>BRANCH TOTAL ({cashier?.branch_code})</span>
            <span style={{ fontSize: 16 }}>🏢</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--accent-purple)", marginTop: 8 }}>
            {fmt(branchSummaryForDate?.total_sales || 0)}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
            {branchSummaryForDate?.transactions_count || 0} total branch sales on {selectedDate}
          </div>
        </div>
      </div>

      {/* Tabs for switching between My Cashier Summary and Branch Overview */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", gap: 12 }}>
        <button
          type="button"
          onClick={() => setActiveTab("MY_CASHIER")}
          style={{
            padding: "10px 18px",
            fontSize: 13,
            fontWeight: 700,
            background: "none",
            border: "none",
            borderBottom: activeTab === "MY_CASHIER" ? "2px solid var(--accent-emerald)" : "2px solid transparent",
            color: activeTab === "MY_CASHIER" ? "var(--text-primary)" : "var(--text-muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span>👤</span>
          <span>My Shift & Cash Drawer Summary</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("BRANCH_OVERVIEW")}
          style={{
            padding: "10px 18px",
            fontSize: 13,
            fontWeight: 700,
            background: "none",
            border: "none",
            borderBottom: activeTab === "BRANCH_OVERVIEW" ? "2px solid var(--accent-blue)" : "2px solid transparent",
            color: activeTab === "BRANCH_OVERVIEW" ? "var(--text-primary)" : "var(--text-muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span>🏢</span>
          <span>Branch Performance & History</span>
        </button>
      </div>

      {/* TAB 1: My Cashier Shift & Cash Drawer Summary */}
      {activeTab === "MY_CASHIER" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* 2-Column: Payment Methods Breakdown & Cash Drawer Balancing */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20 }}>
            {/* Payment Methods Breakdown */}
            <div
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: 20,
              }}
            >
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                💳 Sales Breakdown by Payment Method
              </h3>

              {paymentsByMethod.length === 0 ? (
                <div style={{ textAlign: "center", padding: 30, color: "var(--text-muted)", fontSize: 12 }}>
                  No payment collections recorded for this date.
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Payment Method</th>
                        <th style={{ textAlign: "center" }}>Transactions</th>
                        <th style={{ textAlign: "right" }}>Total Collected</th>
                        <th style={{ textAlign: "right" }}>Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentsByMethod.map((pm) => {
                        const grandTotal = paymentsByMethod.reduce((acc, p) => acc + Number(p.total_amount), 0);
                        const pct = grandTotal > 0 ? ((Number(pm.total_amount) / grandTotal) * 100).toFixed(1) : "0.0";
                        return (
                          <tr key={pm.method}>
                            <td>
                              <span
                                className={
                                  pm.method === "CASH"
                                    ? "badge badge-completed"
                                    : pm.method === "CARD"
                                    ? "badge badge-open"
                                    : "badge"
                                }
                                style={{ fontWeight: 700 }}
                              >
                                {pm.method === "POINTS" ? "⭐ POINTS" : pm.method}
                              </span>
                            </td>
                            <td style={{ textAlign: "center", fontWeight: 700 }}>{pm.count}</td>
                            <td style={{ textAlign: "right", fontWeight: 800, color: "var(--text-primary)" }}>
                              {fmt(pm.total_amount)}
                            </td>
                            <td style={{ textAlign: "right", color: "var(--text-muted)", fontSize: 11.5 }}>
                              {pct}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Cash Drawer & Till Audit */}
            <div
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: 20,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                  💵 Cash Drawer Audit & Reconciliation
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12.5 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}>
                    <span>Gross Cash Tendered from Customers:</span>
                    <strong style={{ color: "var(--text-primary)" }}>{fmt(cashierSummary?.total_tendered_cash || 0)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--accent-amber)" }}>
                    <span>Less: Change Handed Over:</span>
                    <strong>-{fmt(cashierSummary?.total_change || 0)}</strong>
                  </div>
                  {cashierReturns.total_refunds > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", color: "var(--accent-rose)" }}>
                      <span>Less: Cash Refunds Handed to Customers:</span>
                      <strong>-{fmt(cashierReturns.total_refunds)}</strong>
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      paddingTop: 12,
                      borderTop: "1px solid var(--border)",
                      fontSize: 15,
                      fontWeight: 800,
                      color: "var(--accent-emerald)",
                    }}
                  >
                    <span>Expected Net Cash in Till:</span>
                    <span>{fmt(netCashInTill)}</span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: 20,
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "rgba(16, 185, 129, 0.08)",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                  fontSize: 11,
                  color: "var(--text-secondary)",
                }}
              >
                💡 Cashier should count physical cash notes and verify against <strong>{fmt(netCashInTill)}</strong> before shift handover.
              </div>
            </div>
          </div>

          {/* Cashier's Past 15 Days History */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: 20,
            }}
          >
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 14 }}>
              📅 Your Daily Sales Performance History (Last 15 Days)
            </h3>

            {cashierHistory.length === 0 ? (
              <div style={{ textAlign: "center", padding: 30, color: "var(--text-muted)", fontSize: 12 }}>
                No prior sales history found.
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th style={{ textAlign: "center" }}>Transactions</th>
                      <th style={{ textAlign: "right" }}>Gross Total</th>
                      <th style={{ textAlign: "right" }}>Total Tax</th>
                      <th style={{ textAlign: "right" }}>Total Discount</th>
                      <th style={{ textAlign: "right" }}>Net Revenue</th>
                      <th style={{ textAlign: "center" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashierHistory.map((day) => (
                      <tr key={day.sale_date}>
                        <td className="mono" style={{ fontWeight: 700, color: "var(--accent-blue)" }}>
                          {day.sale_date}
                        </td>
                        <td style={{ textAlign: "center", fontWeight: 700 }}>{day.transactions_count}</td>
                        <td style={{ textAlign: "right" }}>{fmt(Number(day.total_sales) + Number(day.total_discount))}</td>
                        <td style={{ textAlign: "right", color: "var(--accent-blue)" }}>{fmt(day.total_tax)}</td>
                        <td style={{ textAlign: "right", color: Number(day.total_discount) > 0 ? "var(--accent-rose)" : "inherit" }}>
                          {Number(day.total_discount) > 0 ? `-${fmt(day.total_discount)}` : "0.00"}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 800, color: "var(--accent-emerald)" }}>
                          {fmt(day.total_sales)}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ padding: "3px 8px", fontSize: 11 }}
                            onClick={() => setSelectedDate(day.sale_date)}
                          >
                            Inspect Day ↗
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Branch Performance & History */}
      {activeTab === "BRANCH_OVERVIEW" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Active Cashiers Contribution on Selected Date */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: 20,
            }}
          >
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 14 }}>
              👥 Cashier Contributions for {cashier?.branch_name} on {selectedDate}
            </h3>

            {activeCashiers.length === 0 ? (
              <div style={{ textAlign: "center", padding: 30, color: "var(--text-muted)", fontSize: 12 }}>
                No active cashiers recorded on this date for {cashier?.branch_name}.
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Cashier Name</th>
                      <th>Staff ID</th>
                      <th style={{ textAlign: "center" }}>Receipts Issued</th>
                      <th style={{ textAlign: "right" }}>Total Sales</th>
                      <th style={{ textAlign: "right" }}>Branch Contribution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeCashiers.map((c) => {
                      const branchTotal = branchSummaryForDate?.total_sales || 1;
                      const pct = ((Number(c.total_sales) / branchTotal) * 100).toFixed(1);
                      const isMe = c.employee_id === cashier?.employee_id;
                      return (
                        <tr key={c.employee_id} style={isMe ? { background: "rgba(16, 185, 129, 0.05)" } : {}}>
                          <td style={{ fontWeight: 700, color: isMe ? "var(--accent-emerald)" : "var(--text-primary)" }}>
                            {c.full_name} {isMe && "(You)"}
                          </td>
                          <td className="mono">#{c.employee_id}</td>
                          <td style={{ textAlign: "center", fontWeight: 700 }}>{c.transactions_count}</td>
                          <td style={{ textAlign: "right", fontWeight: 800, color: "var(--text-primary)" }}>
                            {fmt(c.total_sales)}
                          </td>
                          <td style={{ textAlign: "right", color: "var(--text-muted)", fontSize: 12 }}>
                            {pct}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Official Daily Sales Summary Table (daily_sales_summary DB records) */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: 20,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                  🏛️ Recorded Branch Daily Summaries (daily_sales_summary)
                </h3>
                <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
                  Official end-of-day ledger records synced to database
                </p>
              </div>
            </div>

            {branchSummaries.length === 0 ? (
              <div style={{ textAlign: "center", padding: 30, color: "var(--text-muted)", fontSize: 12 }}>
                No daily summaries recorded yet for {cashier?.branch_name}. Click &quot;Reconcile &amp; Record Summary&quot; above to sync today&apos;s totals.
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Summary ID</th>
                      <th>Date</th>
                      <th>Branch</th>
                      <th style={{ textAlign: "center" }}>Transactions</th>
                      <th style={{ textAlign: "right" }}>Total Tax</th>
                      <th style={{ textAlign: "right" }}>Total Sales</th>
                      <th style={{ textAlign: "center" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branchSummaries.map((bs) => (
                      <tr key={bs.summary_id}>
                        <td className="mono" style={{ fontWeight: 700, color: "var(--accent-purple)" }}>
                          #DSS-{bs.summary_id}
                        </td>
                        <td>
                          {new Date(bs.summary_date).toLocaleDateString("en-LK", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td>
                          {bs.branch_name} ({bs.branch_code})
                        </td>
                        <td style={{ textAlign: "center", fontWeight: 700 }}>
                          {bs.transactions_count}
                        </td>
                        <td style={{ textAlign: "right", color: "var(--accent-blue)" }}>
                          {fmt(bs.total_tax)}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 800, color: "var(--accent-emerald)" }}>
                          {fmt(bs.total_sales)}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ padding: "3px 8px", fontSize: 11 }}
                            onClick={() => {
                              const d = new Date(bs.summary_date).toISOString().split("T")[0];
                              setSelectedDate(d);
                              setActiveTab("MY_CASHIER");
                            }}
                          >
                            View Details ↗
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
