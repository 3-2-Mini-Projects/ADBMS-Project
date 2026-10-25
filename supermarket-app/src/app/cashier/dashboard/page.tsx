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
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Welcome Hero Banner */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white relative overflow-hidden shadow-xs border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white p-2 border border-white/20 shadow-md flex items-center justify-center shrink-0">
            <img
              src="/logo.png"
              alt="Nexus Supermarket Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="!text-white">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 !text-white text-[11px] font-semibold uppercase tracking-wider mb-1.5">
              <span>Point of Sale Terminal</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight !text-white">
              Welcome back, {cashier?.full_name} 👋
            </h1>

            <p className="text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed !text-white">

              Branch:{" "}
              <strong className="!text-white">
                {cashier?.branch_name}
              </strong>
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3 flex-wrap">
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/20 backdrop-blur-xs font-semibold text-xs shadow-xs transition-all flex items-center gap-1.5"
            title="Refresh Live Data"
          >
            <span>🔄</span> Refresh
          </button>
          <Link
            href="/cashier/summary"
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/20 backdrop-blur-xs font-semibold text-xs shadow-xs transition-all flex items-center gap-1.5"
          >
            <span>📑</span> Daily Summary
          </Link>
          <Link
            href="/cashier/pos"
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-2"
          >
            <span>🛒</span> Launch POS Terminal
          </Link>
        </div>
      </div>

      {/* Today's Sales Stat Cards (Cashier Specific) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Revenue */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today&apos;s Sales</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 text-base">
              💰
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-600 font-mono tracking-tight">
              {fmt(data?.cashierToday.total_sales || 0)}
            </div>
            <div className="mt-2 text-[11px] text-slate-500 font-medium">
              Completed sales by you today
            </div>
          </div>
        </div>

        {/* Card 2: Today's Transactions Count */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Receipts Issued</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 text-base">
              🧾
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              {data?.cashierToday.transactions_count || 0}
            </div>
            <div className="mt-2 text-[11px] text-slate-500 font-medium">
              Checkout receipts processed today
            </div>
          </div>
        </div>

        {/* Card 3: Today's Tax Collected */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tax &amp; Discounts</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 text-base">
              📊
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              {fmt(data?.cashierToday.total_tax || 0)}
            </div>
            <div className="mt-2 text-[11px] text-rose-600 font-medium">
              Discounts: -{fmt(data?.cashierToday.total_discount || 0)}
            </div>
          </div>
        </div>

        {/* Card 4: Branch Daily Comparison */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Branch Total Today</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 text-base">
              🏢
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              {fmt(data?.branchToday.total_sales || 0)}
            </div>
            <div className="mt-2 text-[11px] text-slate-500 font-medium">
              {data?.branchToday.transactions_count || 0} branch transactions
            </div>
          </div>
        </div>
      </div>

      {/* Component A: Latest 50 Transactions of That Day */}
      <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
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
      <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
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
              background: "#f8fafc",
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
