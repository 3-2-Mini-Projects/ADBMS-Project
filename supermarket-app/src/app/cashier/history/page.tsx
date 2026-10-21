"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useCashier } from "@/lib/cashierContext";
import PrintableReceipt, { ReceiptData } from "@/components/PrintableReceipt";

interface SaleRow {
  sale_id: number;
  receipt_number: string;
  branch_id: number;
  branch_name: string;
  cashier_id: number;
  cashier_name: string;
  customer_id?: number | null;
  customer_name?: string | null;
  customer_card?: string | null;
  sale_date: string;
  status: "COMPLETED" | "OPEN" | "CANCELLED";
  subtotal: string | number;
  discount_total: string | number;
  tax_total: string | number;
  total_amount: string | number;
  items_count: number;
  payment_methods?: string;
  returns_count?: number;
}

export default function TransactionHistoryPage() {
  const { cashier } = useCashier();

  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("all");
  const [scopeAllCashiers, setScopeAllCashiers] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Receipt Modal
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);

  const fetchSales = useCallback(async () => {
    if (!cashier) return;
    setLoading(true);
    try {
      const p = new URLSearchParams();
      p.set("branchId", String(cashier.branch_id));
      if (!scopeAllCashiers) {
        p.set("cashierId", String(cashier.employee_id));
      } else {
        p.set("allCashiers", "true");
      }
      if (status !== "ALL") p.set("status", status);
      if (search.trim()) p.set("search", search.trim());
      if (dateFilter !== "all") p.set("dateFilter", dateFilter);
      p.set("page", String(page));
      p.set("pageSize", String(pageSize));

      const res = await fetch(`/api/cashier/sales?${p.toString()}`);
      const data = await res.json();

      setSales(data.sales || []);
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages || 1);
        setTotalCount(data.pagination.totalCount || 0);
      }
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    } finally {
      setLoading(false);
    }
  }, [cashier, scopeAllCashiers, status, search, dateFilter, page, pageSize]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchSales();
  };

  const openReceiptModal = async (saleId: number) => {
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
          amountTendered: sale.tendered_cash ?? sale.amountTendered,
          change_amount: sale.change_amount ?? sale.changeDue,
          changeDue: sale.change_amount ?? sale.changeDue,
          payments: sale.payments || [],
        });
      }
    } catch (err) {
      console.error("Error opening receipt modal:", err);
    }
  };

  const fmt = (n: number | string) =>
    `Rs. ${Number(n || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header & Title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
            📋 Transaction History & Ledger
          </h1>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            Search historical checkout records, verify payments, and reprint receipts
          </p>
        </div>

        {/* Scope Toggle: Cashier Personal vs All Branch */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: 4,
            }}
          >
            <button
              className={`btn ${!scopeAllCashiers ? "btn-primary" : "btn-ghost"}`}
              style={{ padding: "4px 10px", fontSize: 11 }}
              onClick={() => {
                setScopeAllCashiers(false);
                setPage(1);
              }}
            >
              My Sales ({cashier?.full_name?.split(" ")[0]})
            </button>
            <button
              className={`btn ${scopeAllCashiers ? "btn-primary" : "btn-ghost"}`}
              style={{ padding: "4px 10px", fontSize: 11 }}
              onClick={() => {
                setScopeAllCashiers(true);
                setPage(1);
              }}
            >
              All Sales
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
          background: "var(--bg-card)",
          padding: "14px 18px",
          borderRadius: 12,
          border: "1px solid var(--border)",
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: 6, flex: 1, minWidth: 260 }}>
          <input
            type="text"
            className="input"
            placeholder="Search Receipt #, Sale ID, or Customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>

        {/* Date Filter */}
        <select
          className="input"
          style={{ width: 140 }}
          value={dateFilter}
          onChange={(e) => {
            setDateFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">All Dates</option>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
        </select>

        {/* Status Filter */}
        <select
          className="input"
          style={{ width: 140 }}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="ALL">All Statuses</option>
          <option value="COMPLETED">Completed</option>
          <option value="OPEN">Open</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        {/* Items Per Page */}
        <select
          className="input"
          style={{ width: 100 }}
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(1);
          }}
        >
          <option value={10}>10 / page</option>
          <option value={20}>20 / page</option>
          <option value={50}>50 / page</option>
        </select>

        <button
          className="btn btn-ghost"
          onClick={() => {
            setSearch("");
            setStatus("ALL");
            setDateFilter("all");
            setPage(1);
          }}
        >
          Reset
        </button>
      </div>

      {/* Data Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Receipt Number</th>
              <th>Date & Time</th>
              <th>Cashier</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total Amount</th>
              <th>Status</th>
              <th>Payment Method</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                  Loading transactions...
                </td>
              </tr>
            ) : sales.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                  No transactions match the selected filters.
                </td>
              </tr>
            ) : (
              sales.map((s) => (
                <tr key={s.sale_id}>
                  <td className="mono" style={{ fontWeight: 700, color: "var(--accent-blue)" }}>
                    <Link
                      href={`/cashier/history/${s.sale_id}`}
                      style={{ color: "inherit", textDecoration: "none" }}
                    >
                      {s.receipt_number}
                    </Link>
                  </td>
                  <td>
                    {new Date(s.sale_date).toLocaleString("en-LK", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{s.cashier_name}</span>
                  </td>
                  <td>
                    {s.customer_name ? (
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{s.customer_name}</div>
                        {s.customer_card && (
                          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{s.customer_card}</div>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>Walk-in</span>
                    )}
                  </td>
                  <td>{s.items_count} items</td>
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
                    {Number(s.returns_count || 0) > 0 && (
                      <span className="badge badge-open" style={{ marginLeft: 4, fontSize: 9 }}>
                        Return ({s.returns_count})
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="mono" style={{ fontSize: 11 }}>
                      {s.payment_methods || "CASH"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 6 }}>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: "4px 8px", fontSize: 11 }}
                        onClick={() => openReceiptModal(s.sale_id)}
                        title="View & Print Receipt"
                      >
                        🧾 Receipt
                      </button>
                      <Link
                        href={`/cashier/history/${s.sale_id}`}
                        className="btn btn-ghost"
                        style={{ padding: "4px 8px", fontSize: 11 }}
                      >
                        Details →
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          padding: "12px 16px",
          background: "var(--bg-card)",
          borderRadius: 10,
          border: "1px solid var(--border)",
        }}
      >
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalCount} total sales)
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          <button
            className="btn btn-ghost"
            style={{ padding: "4px 10px", fontSize: 12 }}
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            ← Previous
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum = i + 1;
            if (totalPages > 5 && page > 3) {
              pageNum = page - 2 + i;
              if (pageNum > totalPages) pageNum = totalPages - (4 - i);
            }
            return (
              <button
                key={pageNum}
                className={`btn ${page === pageNum ? "btn-primary" : "btn-ghost"}`}
                style={{ padding: "4px 10px", fontSize: 12 }}
                onClick={() => setPage(pageNum)}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            className="btn btn-ghost"
            style={{ padding: "4px 10px", fontSize: 12 }}
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next →
          </button>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      {selectedReceipt && (
        <PrintableReceipt
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
}
