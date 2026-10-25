"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/lib/context";
import { Sale } from "@/lib/types";
import {
  Receipt,
  Search,
  Filter,
  Eye,
  Calendar,
  DollarSign,
  User,
  Store,
  CreditCard,
  X,
  Printer,
  Sparkles,
} from "lucide-react";

export default function SalesPage() {
  const { currentBranch } = useApp();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentBranch) params.append("branchId", String(currentBranch.branch_id));
      if (statusFilter) params.append("status", statusFilter);
      if (search.trim()) params.append("search", search.trim());

      const res = await fetch(`/api/sales?${params.toString()}`);
      const data = await res.json();
      if (Array.isArray(data)) setSales(data);
    } catch (err) {
      console.error("Error fetching sales:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [currentBranch, statusFilter]);

  const viewSaleDetails = async (saleId: number) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/sales/${saleId}`);
      const data = await res.json();
      setSelectedSale(data);
    } catch (err) {
      console.error("Error fetching sale detail:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Receipt className="w-6 h-6 text-emerald-600" />
            <span>Sales &amp; Order History</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete transaction ledger across all branches with audit and payment details.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchSales();
            }}
            className="relative"
          >
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Sale ID or customer..."
              className="pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 font-mono w-48 sm:w-64 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-xs"
            />
          </form>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-700 focus:outline-none focus:border-blue-500 shadow-xs"
          >
            <option value="">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="OPEN">Open</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Sales Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4 font-semibold">Sale ID</th>
                <th className="py-3.5 px-4 font-semibold">Date &amp; Time</th>
                <th className="py-3.5 px-4 font-semibold">Branch</th>
                <th className="py-3.5 px-4 font-semibold">Cashier</th>
                <th className="py-3.5 px-4 font-semibold">Customer</th>
                <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Subtotal</th>
                <th className="py-3.5 px-4 font-semibold text-right">Discount</th>
                <th className="py-3.5 px-4 font-semibold text-right">Tax (18%)</th>
                <th className="py-3.5 px-4 font-semibold text-right">Total Amount</th>
                <th className="py-3.5 px-4 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    <Sparkles className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-2" />
                    Loading sales records...
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400 font-medium">
                    No sales found for the selected filters.
                  </td>
                </tr>
              ) : (
                sales.map((s) => (
                  <tr key={s.sale_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">
                      #SALE-{s.sale_id}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {new Date(s.sale_date).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{s.branch_name}</td>
                    <td className="py-3 px-4 text-slate-700">{s.cashier_name}</td>
                    <td className="py-3 px-4 text-slate-700">
                      {s.customer_name ? (
                        <div>
                          <div className="font-semibold text-slate-900">{s.customer_name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{s.customer_card}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">Walk-in</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                          s.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : s.status === "CANCELLED"
                            ? "bg-rose-50 text-rose-800 border-rose-200"
                            : "bg-amber-50 text-amber-800 border-amber-200"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      Rs. {Number(s.subtotal).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-rose-700 font-semibold">
                      {Number(s.discount_total) > 0 ? `-Rs. ${Number(s.discount_total).toFixed(2)}` : "—"}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">
                      Rs. {Number(s.tax_total).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                      Rs. {Number(s.total_amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => viewSaleDetails(s.sale_id)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors shadow-xs"
                        title="View receipt"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sale Detail & Receipt Modal */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-blue-600" />
                <span>Sale #SALE-{selectedSale.sale_id} Receipt</span>
              </h3>
              <button
                onClick={() => setSelectedSale(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              id="printable-receipt"
              className="my-4 p-5 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl font-mono text-xs shadow-xs overflow-y-auto max-h-[60vh] space-y-3"
            >
              <div className="text-center border-b border-dashed border-slate-300 pb-3">
                <div className="font-extrabold text-sm uppercase text-slate-900">NEXUS SUPERMARKET</div>
                <div className="text-[11px] text-slate-600 font-semibold">{selectedSale.branch_name}</div>
                <div className="text-[10px] text-slate-500">{selectedSale.branch_address}</div>
                <div className="text-[10px] text-slate-500">Tel: {selectedSale.branch_phone}</div>
              </div>

              <div className="text-[10px] space-y-0.5 border-b border-dashed border-slate-300 pb-2">
                <div className="flex justify-between">
                  <span>RECEIPT #:</span>
                  <span className="font-bold text-slate-900">SALE-{selectedSale.sale_id}</span>
                </div>
                <div className="flex justify-between">
                  <span>DATE:</span>
                  <span>{new Date(selectedSale.sale_date).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>CASHIER:</span>
                  <span>{selectedSale.cashier_name}</span>
                </div>
                {selectedSale.customer_name && (
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>CUSTOMER:</span>
                    <span>{selectedSale.customer_name} ({selectedSale.customer_card})</span>
                  </div>
                )}
              </div>

              {/* Items */}
              <div className="border-b border-dashed border-slate-300 pb-2 space-y-1">
                {selectedSale.items?.map((it: any) => (
                  <div key={it.sale_item_id} className="flex justify-between text-[11px]">
                    <div className="truncate max-w-[190px]">
                      {it.product_name} x {it.quantity}
                    </div>
                    <div className="font-bold text-slate-900">Rs. {Number(it.line_total).toFixed(2)}</div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>Rs. {Number(selectedSale.subtotal).toFixed(2)}</span>
                </div>
                {Number(selectedSale.discount_total) > 0 && (
                  <div className="flex justify-between text-rose-700 font-semibold">
                    <span>Discounts:</span>
                    <span>-Rs. {Number(selectedSale.discount_total).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>Rs. {Number(selectedSale.tax_total).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-extrabold text-xs pt-1 border-t border-slate-300 text-slate-900">
                  <span>TOTAL PAID:</span>
                  <span>Rs. {Number(selectedSale.total_amount).toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="text-[10px] space-y-0.5">
                <span className="font-bold text-slate-700">PAYMENT RECORDS:</span>
                {selectedSale.payments?.map((pm: any) => (
                  <div key={pm.payment_id} className="flex justify-between text-slate-600">
                    <span>{pm.method} {pm.reference ? `(${pm.reference})` : ""}:</span>
                    <span className="font-bold text-slate-800">Rs. {Number(pm.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Print Receipt</span>
              </button>
              <button
                onClick={() => setSelectedSale(null)}
                className="py-3 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
