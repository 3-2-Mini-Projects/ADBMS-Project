"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useCashier } from "@/lib/cashierContext";
import PrintableReceipt, { ReceiptData } from "@/components/PrintableReceipt";
import CameraBarcodeScannerModal from "@/components/CameraBarcodeScannerModal";

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
    sale_date: string;
    status: string;
    subtotal: string | number;
    discount_total: string | number;
    tax_total: string | number;
    total_amount: string | number;
    customer_name: string;
    customer_card?: string;
    payment_methods?: string;
    items_count: number;
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

interface ProductStock {
  product_id: number;
  barcode: string;
  name: string;
  brand?: string;
  unit_price: string | number;
  tax_rate: string | number;
  category_name?: string;
  quantity_on_hand: number;
  reserved_qty: number;
  available_stock: number;
}

export default function CashierDashboardPage() {
  const { cashier } = useCashier();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [stockSearch, setStockSearch] = useState("");
  const [stockResults, setStockResults] = useState<ProductStock[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [showCameraScanner, setShowCameraScanner] = useState(false);

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

  // Stock quick search
  const handleStockSearch = async (q: string) => {
    setStockSearch(q);
    if (!q.trim() || !cashier) {
      setStockResults([]);
      return;
    }
    setStockLoading(true);
    try {
      const res = await fetch(
        `/api/cashier/products?branchId=${cashier.branch_id}&search=${encodeURIComponent(q)}`
      );
      const json = await res.json();
      setStockResults(json.products || []);
    } catch (err) {
      console.error("Stock search error", err);
    } finally {
      setStockLoading(false);
    }
  };

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
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
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
            <span className="badge badge-completed">CASHIER ROLE</span>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
            Terminal assigned to: <strong>{cashier?.branch_name || "Colombo Main"}</strong> • Ready for checkout
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

      {/* Quick Actions Grid */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
          ⚡ Quick Cashier Actions
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 14,
          }}
        >
          <Link
            href="/cashier/pos"
            style={{
              padding: "16px 18px",
              borderRadius: 12,
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              textDecoration: "none",
              color: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 14,
              transition: "transform 0.15s, border-color 0.15s",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: "rgba(16, 185, 129, 0.15)",
                color: "var(--accent-emerald)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
              }}
            >
              🛒
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>New POS Sale</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Fast billing & scanner</div>
            </div>
          </Link>

          <Link
            href="/cashier/history"
            style={{
              padding: "16px 18px",
              borderRadius: 12,
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              textDecoration: "none",
              color: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 14,
              transition: "transform 0.15s, border-color 0.15s",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: "rgba(88, 166, 255, 0.15)",
                color: "var(--accent-blue)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
              }}
            >
              📋
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>Transaction History</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Receipts & reprints</div>
            </div>
          </Link>

          <Link
            href="/cashier/products"
            style={{
              padding: "16px 18px",
              borderRadius: 12,
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              textDecoration: "none",
              color: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 14,
              transition: "transform 0.15s, border-color 0.15s",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: "rgba(188, 140, 255, 0.15)",
                color: "var(--accent-purple)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
              }}
            >
              🔍
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>Stock Lookup</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Price & branch stock</div>
            </div>
          </Link>

          <Link
            href="/cashier/returns"
            style={{
              padding: "16px 18px",
              borderRadius: 12,
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              textDecoration: "none",
              color: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 14,
              transition: "transform 0.15s, border-color 0.15s",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: "rgba(210, 153, 34, 0.15)",
                color: "var(--accent-amber)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
              }}
            >
              ↩️
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>Returns & Refunds</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Manager-authorized</div>
            </div>
          </Link>
        </div>
      </div>

      {/* 2-Column Section: Stock Quick Lookup & Access Restriction Notice */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
        }}
      >
        {/* Component C: Stock Information & Price Check Widget */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 20,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
              <span>📦</span> Quick Price & Branch Stock Lookup
            </div>
            <span style={{ fontSize: 11, color: "var(--accent-cyan)" }}>
              {cashier?.branch_name}
            </span>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <input
                type="text"
                className="input"
                placeholder="Scan barcode or enter product name (e.g. 4790001, Milk)..."
                value={stockSearch}
                onChange={(e) => handleStockSearch(e.target.value)}
              />
              {stockLoading && (
                <span style={{ position: "absolute", right: 12, top: 10, fontSize: 11, color: "var(--text-muted)" }}>
                  Searching...
                </span>
              )}
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowCameraScanner(true)}
              title="Scan barcode with camera"
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px" }}
            >
              <span>📷</span> Camera Scan
            </button>
          </div>

          {/* Search Results List */}
          <div style={{ flex: 1, minHeight: 180, maxHeight: 220, overflowY: "auto" }}>
            {stockResults.length === 0 ? (
              <div
                style={{
                  height: "100%",
                  minHeight: 160,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-muted)",
                  fontSize: 12,
                  textAlign: "center",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <span>🔍</span>
                <span>Type product name or scan barcode to view price and available stock</span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {stockResults.map((p) => {
                  const isAvailable = p.available_stock > 0;
                  return (
                    <div
                      key={p.product_id}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          Barcode: <span className="mono">{p.barcode}</span> • Category: {p.category_name || "General"}
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--accent-emerald)" }}>
                          {fmt(p.unit_price)}
                        </div>
                        <div
                          style={{
                            fontSize: 10.5,
                            fontWeight: 600,
                            color: isAvailable ? "var(--text-secondary)" : "var(--accent-rose)",
                          }}
                        >
                          Stock: {p.available_stock} units
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Access Restrictions & Permissions Guard */}
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
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span>🛡️</span> Cashier Access & Security Boundaries
            </div>

            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 14, lineHeight: 1.5 }}>
              In accordance with supermarket ADBMS security specifications, accounts with the <strong>CASHIER</strong> role operate under strict operational boundaries:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "Sales & Checkout", allowed: true, desc: "Process payments, scan barcodes, print receipts" },
                { label: "Branch Stock Lookup", allowed: true, desc: "View selling price and assigned branch stock" },
                { label: "Returns & Voiding", allowed: "restricted", desc: "Requires Manager PIN authorization" },
                { label: "Employee & Payroll Management", allowed: false, desc: "Restricted to HR & Admins" },
                { label: "Supplier & Purchase Orders", allowed: false, desc: "Restricted to Stock Managers" },
                { label: "Product & Price Editing", allowed: false, desc: "Restricted to Catalog Managers" },
                { label: "Company-Wide Profit Reports", allowed: false, desc: "Restricted to Executives & Branch Managers" },
              ].map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 10px",
                    borderRadius: 6,
                    background: "rgba(255, 255, 255, 0.02)",
                    fontSize: 11.5,
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.label}</span>
                    <span style={{ color: "var(--text-muted)", marginLeft: 6 }}>— {item.desc}</span>
                  </div>
                  <span>
                    {item.allowed === true && (
                      <span className="badge badge-completed" style={{ fontSize: 9.5 }}>ALLOWED</span>
                    )}
                    {item.allowed === "restricted" && (
                      <span className="badge badge-open" style={{ fontSize: 9.5 }}>MGR AUTH</span>
                    )}
                    {item.allowed === false && (
                      <span className="badge badge-cancelled" style={{ fontSize: 9.5 }}>RESTRICTED</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              padding: "8px 12px",
              borderRadius: 8,
              background: "rgba(56, 189, 248, 0.08)",
              border: "1px solid rgba(56, 189, 248, 0.2)",
              fontSize: 11,
              color: "var(--accent-blue)",
            }}
          >
            💡 Note: Database transactions enforce branch isolation so cashiers only interact with their designated branch inventory.
          </div>
        </div>
      </div>

      {/* Component A: Recent Sales Processed by Logged-in Cashier */}
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
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
              Recent Sales by {cashier?.full_name}
            </h3>
            <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
              Last 10 completed and processed checkout receipts
            </p>
          </div>
          <Link href="/cashier/history" className="btn btn-ghost" style={{ fontSize: 12, padding: "6px 12px" }}>
            View Full History →
          </Link>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 30, color: "var(--text-muted)" }}>
            Loading transactions...
          </div>
        ) : !data?.recentSales || data.recentSales.length === 0 ? (
          <div style={{ textAlign: "center", padding: 30, color: "var(--text-muted)" }}>
            No sales processed yet for this cashier session. Launch POS to start selling!
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sale ID</th>
                  <th>Date & Time</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Payment Method</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.recentSales.map((s) => (
                  <tr key={s.sale_id}>
                    <td className="mono" style={{ fontWeight: 700, color: "var(--accent-blue)" }}>
                      #{s.sale_id}
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
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{s.customer_name}</div>
                      {s.customer_card && (
                        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{s.customer_card}</div>
                      )}
                    </td>
                    <td>{s.items_count} items</td>
                    <td>
                      <span className="mono" style={{ fontSize: 11 }}>
                        {s.payment_methods || "CASH"}
                      </span>
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

      {/* Camera Barcode Scanner Modal */}
      <CameraBarcodeScannerModal
        isOpen={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onScan={(code) => {
          handleStockSearch(code);
        }}
      />
    </div>
  );
}
