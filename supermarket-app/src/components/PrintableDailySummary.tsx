"use client";

import React from "react";

export interface DailySummaryPrintData {
  branch: {
    name: string;
    branch_code: string;
    city?: string;
    address?: string;
    phone?: string;
  };
  cashier: {
    full_name: string;
    employee_id: number;
    role?: string;
  };
  summaryDate: string;
  generatedAt: string;
  cashierSummary: {
    transactions_count: number;
    total_sales: number;
    total_tax: number;
    total_discount: number;
    total_subtotal: number;
    total_tendered_cash: number;
    total_change: number;
  } | null;
  paymentsByMethod: Array<{
    method: string;
    count: number;
    total_amount: number;
  }>;
  cashierReturns: {
    returns_count: number;
    total_refunds: number;
  };
  branchSummaryForDate?: {
    transactions_count: number;
    total_sales: number;
    total_tax: number;
    total_discount: number;
    total_subtotal: number;
  } | null;
  activeCashiers?: Array<{
    employee_id: number;
    full_name: string;
    transactions_count: number;
    total_sales: number;
  }>;
}

interface PrintableDailySummaryProps {
  data: DailySummaryPrintData;
  onClose: () => void;
}

export default function PrintableDailySummary({
  data,
  onClose,
}: PrintableDailySummaryProps) {
  const fmt = (val: number | string) =>
    `Rs. ${Number(val || 0).toLocaleString("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const handlePrint = () => {
    window.print();
  };

  const netCashInDrawer =
    (data.cashierSummary?.total_tendered_cash || 0) -
    (data.cashierSummary?.total_change || 0) -
    (data.cashierReturns?.total_refunds || 0);

  const totalPaymentsCollected = data.paymentsByMethod.reduce(
    (acc, p) => acc + Number(p.total_amount),
    0
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0, 0, 0, 0.82)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        className="card animate-fade-in"
        style={{
          maxWidth: 680,
          width: "100%",
          maxHeight: "94vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: 14,
          overflow: "hidden",
          border: "1px solid var(--border)",
        }}
      >
        {/* Modal Action Topbar */}
        <div
          className="no-print"
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--bg-surface)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>📑</span>
            <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
              Printable Daily Sales Summary &amp; Reconciliation
            </span>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handlePrint}
              style={{ padding: "6px 14px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
            >
              🖨️ Print Official Summary
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              style={{ padding: "6px 10px", fontSize: 12 }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Paper Document */}
        <div
          id="printable-daily-summary"
          style={{
            padding: "28px 32px",
            overflowY: "auto",
            flex: 1,
            background: "#ffffff",
            color: "#0f172a",
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          {/* Document Header */}
          <div style={{ textAlign: "center", borderBottom: "2px solid #0f172a", paddingBottom: 14, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
              <img
                src="/logo.png"
                alt="Nexus Supermarket Logo"
                style={{ height: 48, maxWidth: 180, objectFit: "contain" }}
              />
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 900, letterSpacing: "1px", margin: 0, textTransform: "uppercase", color: "#0f172a" }}>
              NEXUS SUPERMARKET
            </h1>
            <div style={{ fontSize: 13, fontWeight: 700, marginTop: 3, color: "#334155" }}>
              DAILY SALES SUMMARY &amp; END-OF-DAY RECONCILIATION REPORT (Z-REPORT)
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
              Branch: <strong>{data.branch.name}</strong> ({data.branch.branch_code})
              {data.branch.city ? ` • ${data.branch.city}` : ""}
              {data.branch.phone ? ` • Tel: ${data.branch.phone}` : ""}
            </div>
          </div>

          {/* Metadata Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px 24px",
              padding: "10px 14px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 6,
              marginBottom: 16,
              fontSize: 11.5,
            }}
          >
            <div>
              <span style={{ color: "#64748b" }}>Summary Date: </span>
              <strong>{data.summaryDate}</strong>
            </div>
            <div>
              <span style={{ color: "#64748b" }}>Generated At: </span>
              <strong>{data.generatedAt}</strong>
            </div>
            <div>
              <span style={{ color: "#64748b" }}>Processing Cashier: </span>
              <strong>
                {data.cashier.full_name} (Emp #{data.cashier.employee_id})
              </strong>
            </div>
            <div>
              <span style={{ color: "#64748b" }}>Terminal Branch ID: </span>
              <strong>
                {data.branch.branch_code} (#{data.branch.name})
              </strong>
            </div>
          </div>

          {/* Section 1: Cashier Shift Revenue KPI Table */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                textTransform: "uppercase",
                borderBottom: "1px solid #cbd5e1",
                paddingBottom: 4,
                marginBottom: 8,
                color: "#1e293b",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>1. Cashier Shift Sales Totals</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>
                {data.cashierSummary?.transactions_count || 0} Transactions Completed
              </span>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
              <tbody>
                <tr style={{ borderBottom: "1px dotted #e2e8f0" }}>
                  <td style={{ padding: "4px 0", color: "#475569" }}>Gross Subtotal:</td>
                  <td style={{ padding: "4px 0", textAlign: "right", fontWeight: 600 }}>
                    {fmt(data.cashierSummary?.total_subtotal || 0)}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px dotted #e2e8f0" }}>
                  <td style={{ padding: "4px 0", color: "#b91c1c" }}>Less: Promotional &amp; Member Discounts:</td>
                  <td style={{ padding: "4px 0", textAlign: "right", color: "#b91c1c", fontWeight: 600 }}>
                    -{fmt(data.cashierSummary?.total_discount || 0)}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px dotted #e2e8f0" }}>
                  <td style={{ padding: "4px 0", color: "#475569" }}>Value Added Tax (VAT / Levies):</td>
                  <td style={{ padding: "4px 0", textAlign: "right", fontWeight: 600 }}>
                    +{fmt(data.cashierSummary?.total_tax || 0)}
                  </td>
                </tr>
                <tr style={{ borderBottom: "2px solid #0f172a", background: "#f1f5f9" }}>
                  <td style={{ padding: "6px 8px", fontWeight: 800, fontSize: 12.5, color: "#0f172a" }}>
                    TOTAL NET SALES REVENUE:
                  </td>
                  <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 900, fontSize: 13, color: "#047857" }}>
                    {fmt(data.cashierSummary?.total_sales || 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 2: Payment Collections Breakdown */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                textTransform: "uppercase",
                borderBottom: "1px solid #cbd5e1",
                paddingBottom: 4,
                marginBottom: 8,
                color: "#1e293b",
              }}
            >
              2. Settlement &amp; Payment Collections
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #94a3b8", background: "#f8fafc", textAlign: "left" }}>
                  <th style={{ padding: "5px 6px" }}>Method</th>
                  <th style={{ padding: "5px 6px", textAlign: "center" }}>Transactions</th>
                  <th style={{ padding: "5px 6px", textAlign: "right" }}>Total Amount</th>
                  <th style={{ padding: "5px 6px", textAlign: "right" }}>Share (%)</th>
                </tr>
              </thead>
              <tbody>
                {data.paymentsByMethod.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: "8px 0", textAlign: "center", color: "#64748b" }}>
                      No settlements recorded on this date.
                    </td>
                  </tr>
                ) : (
                  data.paymentsByMethod.map((pm) => {
                    const share =
                      totalPaymentsCollected > 0
                        ? ((Number(pm.total_amount) / totalPaymentsCollected) * 100).toFixed(1)
                        : "0.0";
                    return (
                      <tr key={pm.method} style={{ borderBottom: "1px dotted #e2e8f0" }}>
                        <td style={{ padding: "5px 6px", fontWeight: 700 }}>
                          {pm.method === "POINTS" ? "LOYALTY POINTS" : pm.method}
                        </td>
                        <td style={{ padding: "5px 6px", textAlign: "center" }}>{pm.count}</td>
                        <td style={{ padding: "5px 6px", textAlign: "right", fontWeight: 700 }}>
                          {fmt(pm.total_amount)}
                        </td>
                        <td style={{ padding: "5px 6px", textAlign: "right", color: "#64748b" }}>
                          {share}%
                        </td>
                      </tr>
                    );
                  })
                )}
                <tr style={{ borderTop: "1px solid #0f172a", fontWeight: 800 }}>
                  <td style={{ padding: "5px 6px" }}>TOTAL SETTLED:</td>
                  <td style={{ padding: "5px 6px", textAlign: "center" }}>
                    {data.paymentsByMethod.reduce((acc, p) => acc + p.count, 0)}
                  </td>
                  <td style={{ padding: "5px 6px", textAlign: "right", color: "#047857" }}>
                    {fmt(totalPaymentsCollected)}
                  </td>
                  <td style={{ padding: "5px 6px", textAlign: "right" }}>100%</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 3: Physical Cash Drawer Audit */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                textTransform: "uppercase",
                borderBottom: "1px solid #cbd5e1",
                paddingBottom: 4,
                marginBottom: 8,
                color: "#1e293b",
              }}
            >
              3. Cash Drawer Audit &amp; Balancing (Till Reconciliation)
            </div>

            <div
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: 6,
                padding: "10px 14px",
                background: "#f8fafc",
                fontSize: 11.5,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span>Gross Customer Cash Notes Tendered:</span>
                <strong>{fmt(data.cashierSummary?.total_tendered_cash || 0)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, color: "#d97706" }}>
                <span>Less: Change Handed Over to Customers:</span>
                <strong>-{fmt(data.cashierSummary?.total_change || 0)}</strong>
              </div>
              {data.cashierReturns.total_refunds > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, color: "#dc2626" }}>
                  <span>Less: Cash Refunds Handed to Customers ({data.cashierReturns.returns_count} returns):</span>
                  <strong>-{fmt(data.cashierReturns.total_refunds)}</strong>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  paddingTop: 6,
                  borderTop: "1px dashed #94a3b8",
                  fontWeight: 900,
                  fontSize: 12.5,
                  color: "#0f172a",
                }}
              >
                <span>EXPECTED PHYSICAL CASH IN DRAWER:</span>
                <span style={{ color: "#0369a1", fontSize: 13.5 }}>{fmt(netCashInDrawer)}</span>
              </div>
            </div>
          </div>

          {/* Section 4: Active Cashiers Contribution (if available) */}
          {data.activeCashiers && data.activeCashiers.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  borderBottom: "1px solid #cbd5e1",
                  paddingBottom: 4,
                  marginBottom: 8,
                  color: "#1e293b",
                }}
              >
                4. Branch Cashier Shift Overview ({data.branch.name})
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #94a3b8", background: "#f8fafc", textAlign: "left" }}>
                    <th style={{ padding: "4px 6px" }}>Cashier Name</th>
                    <th style={{ padding: "4px 6px" }}>Staff ID</th>
                    <th style={{ padding: "4px 6px", textAlign: "center" }}>Receipts</th>
                    <th style={{ padding: "4px 6px", textAlign: "right" }}>Total Sales</th>
                    <th style={{ padding: "4px 6px", textAlign: "right" }}>Contribution</th>
                  </tr>
                </thead>
                <tbody>
                  {data.activeCashiers.map((c) => {
                    const branchTotal = data.branchSummaryForDate?.total_sales || 1;
                    const pct = ((Number(c.total_sales) / branchTotal) * 100).toFixed(1);
                    return (
                      <tr key={c.employee_id} style={{ borderBottom: "1px dotted #e2e8f0" }}>
                        <td style={{ padding: "4px 6px", fontWeight: 600 }}>{c.full_name}</td>
                        <td style={{ padding: "4px 6px" }}>#{c.employee_id}</td>
                        <td style={{ padding: "4px 6px", textAlign: "center" }}>{c.transactions_count}</td>
                        <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 700 }}>
                          {fmt(c.total_sales)}
                        </td>
                        <td style={{ padding: "4px 6px", textAlign: "right", color: "#64748b" }}>
                          {pct}%
                        </td>
                      </tr>
                    );
                  })}
                  <tr style={{ borderTop: "1px solid #0f172a", fontWeight: 800 }}>
                    <td colSpan={2} style={{ padding: "4px 6px" }}>BRANCH DAILY TOTAL:</td>
                    <td style={{ padding: "4px 6px", textAlign: "center" }}>
                      {data.branchSummaryForDate?.transactions_count || 0}
                    </td>
                    <td style={{ padding: "4px 6px", textAlign: "right", color: "#047857" }}>
                      {fmt(data.branchSummaryForDate?.total_sales || 0)}
                    </td>
                    <td style={{ padding: "4px 6px", textAlign: "right" }}>100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Section 5: Authorization Signatures */}
          <div style={{ marginTop: 28, paddingTop: 14, borderTop: "1px solid #94a3b8" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
              <div>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 30 }}>
                  Cashier Handover Verification:
                </div>
                <div style={{ borderBottom: "1px solid #0f172a", marginBottom: 4 }} />
                <div style={{ fontSize: 11, fontWeight: 700 }}>
                  {data.cashier.full_name} (Cashier)
                </div>
                <div style={{ fontSize: 10, color: "#64748b" }}>Date &amp; Time: __________________</div>
              </div>

              <div>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 30 }}>
                  Shift Supervisor / Branch Manager Authorization:
                </div>
                <div style={{ borderBottom: "1px solid #0f172a", marginBottom: 4 }} />
                <div style={{ fontSize: 11, fontWeight: 700 }}>
                  Branch Manager / Supervisor Signature
                </div>
                <div style={{ fontSize: 10, color: "#64748b" }}>Drawer Count Verified: [  ] Yes  [  ] Discrepancy</div>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div style={{ textAlign: "center", marginTop: 20, fontSize: 9.5, color: "#94a3b8" }}>
            Nexus Supermarket Automated POS Ledger System • End-of-Day Official Audit Record
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className="no-print"
          style={{
            padding: "12px 20px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            background: "var(--bg-surface)",
          }}
        >
          <button type="button" className="btn btn-ghost" onClick={onClose} style={{ padding: "6px 14px", fontSize: 12 }}>
            Close Preview
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handlePrint}
            style={{ padding: "6px 18px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
          >
            🖨️ Print Report
          </button>
        </div>
      </div>
    </div>
  );
}
