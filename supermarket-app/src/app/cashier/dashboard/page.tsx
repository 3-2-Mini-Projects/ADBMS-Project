"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useCashier } from "@/lib/cashierContext";
import PrintableReceipt, { ReceiptData } from "@/components/PrintableReceipt";

interface DashboardData {
  cashierToday: {
    transactions_count: number;
    total_sales: number;
    total_tax: number;
    total_discount: number;
    total_subtotal: number;
    lifetime_transactions: number;
    lifetime_sales: number;
  };
  branchToday: {
    transactions_count: number;
    total_sales: number;
    total_tax: number;
  };
  recentSales: Array<{
    sale_id: number;
    receipt_number?: string;
    branch_id?: number;
    branch_code?: string;
    branch_name?: string;
    cashier_id?: number;
    cashier_name?: string;
    sale_date: string;
    status: string;
    subtotal: string | number;
    discount_total: string | number;
    tax_total: string | number;
    total_amount: string | number;
    customer_name: string;
    customer_card?: string;
    payment_methods?: string;
    payment_references?: string;
    items_count: number;
  }>;
  todayReturns: Array<{
    return_id: number;
    sale_item_id: number;
    sale_id: number;
    product_id: number;
    product_name: string;
    barcode: string;
    quantity: number;
    reason: string;
    refund_amount: string | number;
    return_date: string;
    processor_name: string;
  }>;
  branchSummaries: Array<{
    summary_id: number;
    summary_date: string;
    transactions_count: number;
    total_sales: string | number;
    total_tax: string | number;
  }>;
  lowStockCount: number;
}

export default function CashierDashboardPage() {
  const { cashier } = useCashier();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!cashier) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/cashier/dashboard?cashierId=${cashier.employee_id}&branchId=${cashier.branch_id}`
      );
      const resData = await res.json();
      setData(resData);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, [cashier]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const openReceipt = async (saleId: number) => {
    try {
      const res = await fetch(`/api/cashier/sales/${saleId}`);
      const sale = await res.json();
      if (sale.sale_id) {
        setSelectedReceipt({
          saleId: sale.sale_id,
          receiptNumber: sale.receipt_number,
          saleDate: sale.sale_date,
          branch: {
            name: sale.branch_name,
            branch_code: sale.branch_code,
            address: sale.branch_address,
            phone: sale.branch_phone,
            city: sale.branch_city,
          },
          cashier: {
            full_name: sale.cashier_name,
            employee_id: sale.cashier_id,
          },
          customer: sale.customer_name
            ? {
                full_name: sale.customer_name,
                card_no: sale.customer_card,
                tier: sale.customer_tier,
                points_balance: sale.customer_points,
              }
            : null,
          items: sale.items || [],
          subtotal: sale.subtotal,
          discountTotal: sale.discount_total,
          taxTotal: sale.tax_total,
          totalAmount: sale.total_amount,
          tendered_cash: sale.tendered_cash ?? sale.amountTendered,
          amountTendered: sale.amountTendered !== undefined ? Number(sale.amountTendered) : (sale.tendered_cash !== undefined && sale.tendered_cash !== null ? Number(sale.tendered_cash) : undefined),
          changeDue: sale.changeDue !== undefined ? Number(sale.changeDue) : (sale.change_amount !== undefined && sale.change_amount !== null ? Number(sale.change_amount) : undefined),
          change_amount: sale.change_amount ?? sale.changeDue,
          payments: sale.payments || [],
        });
      }
    } catch (err) {
      console.error("Error viewing receipt", err);
    }
  };

  const fmt = (n: number | string) =>
    `Rs. ${Number(n || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 40 }}>
      {/* Welcome Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(2, 132, 199, 0.08) 100%)",
          padding: "20px 24px",
          borderRadius: 16,
          border: "1px solid var(--border)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>
              Welcome back, {cashier?.full_name || "Cashier"} 👋
            </h1>
            <span className="badge badge-completed">
              {cashier?.role || "CASHIER"} • ID: #{cashier?.employee_id ?? "—"}
            </span>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
            Cashier: <strong style={{ color: "var(--accent-emerald)" }}>{cashier?.full_name || "Cashier"}</strong> • Terminal assigned to: <strong>{cashier?.branch_name || "Colombo Main"}</strong> ({cashier?.branch_code || "POS"}) • Ready for checkout
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={fetchDashboardData} className="btn btn-ghost" title="Refresh Live Data">
            🔄 Refresh
          </button>
          <Link href="/cashier/pos" className="btn btn-emerald" style={{ padding: "8px 18px", fontSize: 14 }}>
            🛒 Launch POS Terminal
          </Link>
        </div>
      </div>

      {/* Today's Sales Stat Cards (Cashier Specific) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {/* Card 1: Today's Revenue */}
        <div className="stat-card">
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: 12 }}>
            <span>TODAY&apos;S COLLECTED SALES</span>
            <span style={{ fontSize: 16 }}>💰</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--accent-emerald)", marginTop: 10 }}>
            {fmt(data?.cashierToday.total_sales || 0)}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
            Completed sales by you today
          </div>
        </div>

        {/* Card 2: Today's Transactions Count */}
        <div className="stat-card">
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: 12 }}>
            <span>TRANSACTIONS COUNT</span>
            <span style={{ fontSize: 16 }}>🧾</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", marginTop: 10 }}>
            {data?.cashierToday.transactions_count || 0}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
            Checkout receipts processed today
          </div>
        </div>

        {/* Card 3: Today's Tax Collected */}
        <div className="stat-card">
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: 12 }}>
            <span>TAX & DISCOUNTS</span>
            <span style={{ fontSize: 16 }}>📊</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--accent-blue)", marginTop: 10 }}>
            {fmt(data?.cashierToday.total_tax || 0)}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
            Discounts: -{fmt(data?.cashierToday.total_discount || 0)}
          </div>
        </div>

        {/* Card 4: Branch Daily Comparison */}
        <div className="stat-card">
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: 12 }}>
            <span>BRANCH TODAY TOTAL</span>
            <span style={{ fontSize: 16 }}>🏢</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--accent-purple)", marginTop: 10 }}>
            {fmt(data?.branchToday.total_sales || 0)}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
            {data?.branchToday.transactions_count || 0} branch transactions today
          </div>
        </div>
      </div>

      {/* Component A: Latest 50 Transactions of That Day */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 20,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                Latest 50 Branch Transactions
              </h3>
              <span className="badge badge-completed" style={{ fontSize: 11 }}>
                {data?.recentSales?.length || 0} Records
              </span>
              {cashier && (
                <span
                  style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 6,
                    background: "rgba(16, 185, 129, 0.12)",
                    color: "var(--accent-emerald)",
                    border: "1px solid rgba(16, 185, 129, 0.25)",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 600,
                  }}
                >
                  📍 {cashier.branch_name} ({cashier.branch_code})
                </span>
              )}
            </div>
            <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
              Showing latest 50 transactions processed for <strong>{cashier?.branch_name || "this branch"}</strong> with receipt reference numbers
            </p>
          </div>
          <Link href="/cashier/history" className="btn btn-ghost" style={{ fontSize: 12, padding: "6px 12px" }}>
            View Full History →
          </Link>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 30, color: "var(--text-muted)" }}>
            Loading branch transactions...
          </div>
        ) : !data?.recentSales || data.recentSales.length === 0 ? (
          <div style={{ textAlign: "center", padding: 30, color: "var(--text-muted)" }}>
            No transactions found for {cashier?.branch_name || "this branch"}. Launch POS to start selling!
          </div>
        ) : (
          <div className="table-wrapper" style={{ maxHeight: 440, overflowY: "auto" }}>
            <table className="data-table">
              <thead style={{ position: "sticky", top: 0, background: "var(--bg-card)", zIndex: 2 }}>
                <tr>
                  <th>Reference No</th>
                  <th>Date & Time</th>
                  <th>Cashier</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Payment Method</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.recentSales.map((s) => {
                  const refNo = s.receipt_number || `REC-${s.branch_code || cashier?.branch_code || "BR"}-${String(s.sale_id).padStart(6, "0")}`;
                  return (
                    <tr key={s.sale_id}>
                      <td>
                        <div className="mono" style={{ fontWeight: 800, color: "var(--accent-blue)", fontSize: 12.5 }}>
                          {refNo}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Sale #{s.sale_id}</div>
                      </td>
                      <td>
                        {new Date(s.sale_date).toLocaleString("en-LK", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 12 }}>
                          {s.cashier_name || (s.cashier_id === cashier?.employee_id ? cashier?.full_name : `Staff #${s.cashier_id}`)}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{s.customer_name}</div>
                        {s.customer_card && (
                          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{s.customer_card}</div>
                        )}
                      </td>
                      <td>{s.items_count} items</td>
                      <td>
                        <div className="mono" style={{ fontSize: 11, fontWeight: 700 }}>
                          {s.payment_methods || "CASH"}
                        </div>
                        {s.payment_references && (
                          <div
                            style={{
                              fontSize: 10,
                              color: "var(--text-muted)",
                              maxWidth: 130,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={s.payment_references}
                          >
                            Ref: {s.payment_references}
                          </div>
                        )}
                      </td>
                      <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                        {fmt(s.total_amount)}
                      </td>
                      <td>
                        <span
                          className={
                            s.status === "COMPLETED"
                              ? "badge badge-completed"
                              : s.status === "OPEN"
                              ? "badge badge-open"
                              : "badge badge-cancelled"
                          }
                        >
                          {s.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: "4px 10px", fontSize: 11 }}
                          onClick={() => openReceipt(s.sale_id)}
                        >
                          🧾 View Receipt
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Component B: Latest 10 Return Details of That Day */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 20,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>↩️</span>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                Latest 10 Returns of Today
              </h3>
              <span className="badge badge-open" style={{ fontSize: 11 }}>
                {data?.todayReturns?.length || 0} Returns
              </span>
            </div>
            <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
              Manager-authorized customer returns & refund items for {cashier?.branch_name || "this branch"}
            </p>
          </div>
          <Link href="/cashier/returns" className="btn btn-ghost" style={{ fontSize: 12, padding: "6px 12px" }}>
            Process Returns & Refunds →
          </Link>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 30, color: "var(--text-muted)" }}>
            Loading return details...
          </div>
        ) : !data?.todayReturns || data.todayReturns.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "32px 16px",
              color: "var(--text-muted)",
              background: "rgba(255, 255, 255, 0.01)",
              borderRadius: 10,
              border: "1px dashed var(--border)",
              fontSize: 13,
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6 }}>✅</div>
            <div>No returns or customer refunds processed today.</div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Return ID</th>
                  <th>Return Time</th>
                  <th>Sale ID</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Reason</th>
                  <th>Refund Amount</th>
                  <th>Authorized By</th>
                </tr>
              </thead>
              <tbody>
                {data.todayReturns.map((r) => (
                  <tr key={r.return_id}>
                    <td className="mono" style={{ fontWeight: 700, color: "var(--accent-amber)" }}>
                      #RET-{r.return_id}
                    </td>
                    <td>
                      {new Date(r.return_date).toLocaleString("en-LK", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: "2px 6px", fontSize: 11, fontFamily: "monospace" }}
                        onClick={() => openReceipt(r.sale_id)}
                        title="Click to view original sale receipt"
                      >
                        #{r.sale_id} ↗
                      </button>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{r.product_name}</div>
                      <div style={{ fontSize: 10.5, color: "var(--text-muted)", fontFamily: "monospace" }}>
                        {r.barcode}
                      </div>
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {r.quantity} pcs
                    </td>
                    <td>
                      <span className="badge badge-open" style={{ fontSize: 10.5 }}>
                        {r.reason}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: "var(--accent-rose)" }}>
                      -{fmt(r.refund_amount)}
                    </td>
                    <td style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      🛡️ {r.processor_name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {selectedReceipt && (
        <PrintableReceipt
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
}
