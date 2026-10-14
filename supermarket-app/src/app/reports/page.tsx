"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/lib/context";
import {
  BarChart3,
  Calendar,
  DollarSign,
  TrendingUp,
  Receipt,
  RotateCcw,
  CreditCard,
  Building2,
  User,
  Sparkles,
  Download,
  Filter,
} from "lucide-react";

export default function ReportsPage() {
  const { currentBranch } = useApp();
  const [activeReport, setActiveReport] = useState<
    "daily_sales" | "branch_sales" | "cashier_sales" | "payment_summary" | "returns" | "daily_summary"
  >("daily_sales");

  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentBranch) params.append("branchId", String(currentBranch.branch_id));
      const res = await fetch(`/api/reports?${params.toString()}`);
      const data = await res.json();
      setReportData(data);
    } catch (err) {
      console.error("Error loading reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [currentBranch]);

  const dailySales = reportData?.dailySales ?? [];
  const branchSales = reportData?.branchSales ?? [];
  const cashierSales = reportData?.cashierSales ?? [];
  const paymentSummary = reportData?.paymentSummary ?? [];
  const returnReport = reportData?.returnReport ?? [];
  const dailySummaryTable = reportData?.dailySummaryTable ?? [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-blue-400" />
            <span>ADBMS Analytics & Reporting Hub</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time querying of the database views: daily_sales_vw, branch_sales_vw, cashier_sales_vw, payment_summary_vw, and return_report_vw.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Export / Print</span>
          </button>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
        <button
          onClick={() => setActiveReport("daily_sales")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeReport === "daily_sales"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
              : "bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>daily_sales_vw</span>
        </button>

        <button
          onClick={() => setActiveReport("branch_sales")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeReport === "branch_sales"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
              : "bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>branch_sales_vw</span>
        </button>

        <button
          onClick={() => setActiveReport("cashier_sales")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeReport === "cashier_sales"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
              : "bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>cashier_sales_vw</span>
        </button>

        <button
          onClick={() => setActiveReport("payment_summary")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeReport === "payment_summary"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
              : "bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>payment_summary_vw</span>
        </button>

        <button
          onClick={() => setActiveReport("returns")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeReport === "returns"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
              : "bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>return_report_vw</span>
        </button>

        <button
          onClick={() => setActiveReport("daily_summary")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeReport === "daily_summary"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
              : "bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>daily_sales_summary (Table)</span>
        </button>
      </div>

      {/* REPORT CONTENT */}
      {loading ? (
        <div className="py-20 text-center text-slate-500">
          <Sparkles className="w-6 h-6 animate-spin mx-auto text-blue-400 mb-2" />
          Querying SQL views from database...
        </div>
      ) : (
        <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
          {/* TAB 1: DAILY SALES VIEW */}
          {activeReport === "daily_sales" && (
            <div>
              <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span>VIEW: daily_sales_vw</span>
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Aggregated daily transactions, gross subtotal, discounts, and net sales per branch.
                  </p>
                </div>
                <span className="font-mono text-xs text-slate-400">{dailySales.length} days recorded</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400">
                      <th className="py-3 px-4 font-semibold">Sale Date</th>
                      <th className="py-3 px-4 font-semibold">Branch</th>
                      <th className="py-3 px-4 font-semibold text-center">Transactions</th>
                      <th className="py-3 px-4 font-semibold text-right">Subtotal</th>
                      <th className="py-3 px-4 font-semibold text-right">Total Discount</th>
                      <th className="py-3 px-4 font-semibold text-right">Total Tax (18%)</th>
                      <th className="py-3 px-4 font-semibold text-right">Total Sales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {dailySales.map((r: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-400">
                          {new Date(r.sale_date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-slate-200">{r.branch_name || `Branch #${r.branch_id}`}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-white">
                          {r.transaction_count}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-300">
                          Rs. {Number(r.subtotal).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-rose-400">
                          {Number(r.total_discount) > 0 ? `-Rs. ${Number(r.total_discount).toFixed(2)}` : "—"}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-400">
                          Rs. {Number(r.total_tax).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 text-sm">
                          Rs. {Number(r.total_sales).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: BRANCH SALES VIEW */}
          {activeReport === "branch_sales" && (
            <div>
              <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-400" />
                    <span>VIEW: branch_sales_vw</span>
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Comparative branch revenue performance across all historical transactions.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400">
                      <th className="py-3 px-4 font-semibold">Branch</th>
                      <th className="py-3 px-4 font-semibold">Location</th>
                      <th className="py-3 px-4 font-semibold text-center">Transactions</th>
                      <th className="py-3 px-4 font-semibold text-right">Subtotal</th>
                      <th className="py-3 px-4 font-semibold text-right">Discounts</th>
                      <th className="py-3 px-4 font-semibold text-right">Total Tax</th>
                      <th className="py-3 px-4 font-semibold text-right">Total Sales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {branchSales.map((r: any) => (
                      <tr key={r.branch_id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-white">{r.branch_name}</td>
                        <td className="py-3 px-4 text-slate-400">{r.city}, {r.region}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-white">{r.transactions}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-300">
                          Rs. {Number(r.subtotal).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-rose-400">
                          -Rs. {Number(r.total_discount).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-400">
                          Rs. {Number(r.total_tax).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 text-sm">
                          Rs. {Number(r.total_sales).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: CASHIER SALES VIEW */}
          {activeReport === "cashier_sales" && (
            <div>
              <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-400" />
                    <span>VIEW: cashier_sales_vw</span>
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Cashier checkout volume, receipts generated, and total cashier cash register totals.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400">
                      <th className="py-3 px-4 font-semibold">Cashier</th>
                      <th className="py-3 px-4 font-semibold">Email</th>
                      <th className="py-3 px-4 font-semibold">Branch</th>
                      <th className="py-3 px-4 font-semibold text-center">Receipts Count</th>
                      <th className="py-3 px-4 font-semibold text-right">Subtotal</th>
                      <th className="py-3 px-4 font-semibold text-right">Discounts</th>
                      <th className="py-3 px-4 font-semibold text-right">Total Net Sales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {cashierSales.map((r: any) => (
                      <tr key={r.cashier_id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-white">{r.cashier_name}</td>
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{r.email}</td>
                        <td className="py-3 px-4 text-slate-300">{r.branch_name}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-white">{r.transaction_count}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-300">
                          Rs. {Number(r.subtotal).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-rose-400">
                          -Rs. {Number(r.total_discount).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 text-sm">
                          Rs. {Number(r.total_sales).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: PAYMENT SUMMARY VIEW */}
          {activeReport === "payment_summary" && (
            <div>
              <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-400" />
                    <span>VIEW: payment_summary_vw</span>
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Aggregated payment methods (CASH, CARD, MOBILE, POINTS) and payment transaction counts.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400">
                      <th className="py-3 px-4 font-semibold">Payment Method</th>
                      <th className="py-3 px-4 font-semibold text-center">Payment Count</th>
                      <th className="py-3 px-4 font-semibold text-right">Total Collected Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {paymentSummary.map((r: any) => (
                      <tr key={r.method} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-white font-mono">{r.method}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-white">{r.payment_count}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 text-sm">
                          Rs. {Number(r.total_amount).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: RETURNS REPORT VIEW */}
          {activeReport === "returns" && (
            <div>
              <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-rose-400" />
                    <span>VIEW: return_report_vw</span>
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Returns report view matching items, reasons, processing managers, and refund amounts.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400">
                      <th className="py-3 px-4 font-semibold">Return ID</th>
                      <th className="py-3 px-4 font-semibold">Date</th>
                      <th className="py-3 px-4 font-semibold">Sale Ref</th>
                      <th className="py-3 px-4 font-semibold">Product</th>
                      <th className="py-3 px-4 font-semibold text-center">Returned Qty</th>
                      <th className="py-3 px-4 font-semibold">Reason</th>
                      <th className="py-3 px-4 font-semibold">Processed By</th>
                      <th className="py-3 px-4 font-semibold text-right">Refund Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {returnReport.map((r: any) => (
                      <tr key={r.return_id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-rose-400">#RET-{r.return_id}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                          {new Date(r.return_date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 font-mono text-blue-400">#SALE-{r.sale_id}</td>
                        <td className="py-3 px-4 text-white font-medium">{r.product_name}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold">{r.quantity}</td>
                        <td className="py-3 px-4 text-slate-300">{r.reason}</td>
                        <td className="py-3 px-4 text-slate-400">{r.processor_name || "Manager"}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-400">
                          Rs. {Number(r.refund_amount).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: DAILY SALES SUMMARY TABLE */}
          {activeReport === "daily_summary" && (
            <div>
              <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-blue-400" />
                    <span>BASE TABLE: daily_sales_summary (Populated by Event)</span>
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Persistent summary snapshot table updated by scheduled MySQL event GenerateDailySalesSummary.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400">
                      <th className="py-3 px-4 font-semibold">Summary Date</th>
                      <th className="py-3 px-4 font-semibold">Branch</th>
                      <th className="py-3 px-4 font-semibold text-center">Transactions Count</th>
                      <th className="py-3 px-4 font-semibold text-right">Total Sales</th>
                      <th className="py-3 px-4 font-semibold text-right">Total Tax</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {dailySummaryTable.map((r: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-400">
                          {new Date(r.summary_date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-slate-200">{r.branch_name || `Branch #${r.branch_id}`}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-white">
                          {r.transactions_count}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 text-sm">
                          Rs. {Number(r.total_sales).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-400">
                          Rs. {Number(r.total_tax).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
