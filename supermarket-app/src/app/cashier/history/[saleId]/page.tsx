"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCashier, ManagerUser } from "@/lib/cashierContext";
import PrintableReceipt, { ReceiptData } from "@/components/PrintableReceipt";
import ManagerAuthModal from "@/components/ManagerAuthModal";

interface SaleDetailsData {
  sale_id: number;
  receipt_number: string;
  branch_id: number;
  branch_name: string;
  branch_code: string;
  branch_address?: string;
  branch_phone?: string;
  branch_city?: string;
  cashier_id: number;
  cashier_name: string;
  customer_id?: number | null;
  customer_name?: string | null;
  customer_card?: string | null;
  customer_phone?: string | null;
  customer_tier?: string | null;
  customer_points?: number | null;
  sale_date: string;
  status: "COMPLETED" | "OPEN" | "CANCELLED";
  subtotal: string | number;
  discount_total: string | number;
  tax_total: string | number;
  total_amount: string | number;
  items: Array<{
    sale_item_id: number;
    product_id: number;
    product_name: string;
    barcode: string;
    brand?: string;
    quantity: number;
    unit_price: string | number;
    discount_amount: string | number;
    line_total: string | number;
    returned_quantity: number;
    remaining_returnable_qty: number;
  }>;
  payments: Array<{
    payment_id: number;
    method: string;
    amount: string | number;
    reference?: string | null;
    paid_at: string;
  }>;
  returns: Array<{
    return_id: number;
    sale_item_id: number;
    product_name: string;
    quantity: number;
    reason: string;
    refund_amount: string | number;
    return_date: string;
    processed_by_name: string;
  }>;
}

function SaleDetailInner({ saleId }: { saleId: string }) {
  const router = useRouter();
  const { cashier } = useCashier();

  const [sale, setSale] = useState<SaleDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const fetchSaleDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cashier/sales/${saleId}`);
      const data = await res.json();
      if (data.sale_id) {
        setSale(data);
      } else {
        setError(data.error || "Sale not found");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load sale");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSaleDetail();
  }, [saleId]);

  const handleManagerCancelApproved = async (mgr: ManagerUser) => {
    if (!cashier) return;
    try {
      const res = await fetch("/api/cashier/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saleId: Number(saleId),
          cashierId: cashier.employee_id,
          managerId: mgr.employee_id,
          managerPin: "1234",
          reason: cancelReason || "Customer Void / Cancellation",
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchSaleDetail();
      } else {
        alert("Cancellation failed: " + data.error);
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const fmt = (n: number | string) =>
    `Rs. ${Number(n || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
        Loading sale record #{saleId}...
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <h2 style={{ color: "var(--accent-rose)", marginBottom: 12 }}>Transaction Not Found</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: 20 }}>{error || "Could not locate sale"}</p>
        <Link href="/cashier/history" className="btn btn-primary">
          ← Back to History
        </Link>
      </div>
    );
  }

  const receiptData: ReceiptData = {
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
          card_no: sale.customer_card || undefined,
          tier: sale.customer_tier || undefined,
          points_balance: sale.customer_points || undefined,
        }
      : null,
    items: sale.items || [],
    subtotal: sale.subtotal,
    discountTotal: sale.discount_total,
    taxTotal: sale.tax_total,
    totalAmount: sale.total_amount,
    payments: sale.payments || [],
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Top Breadcrumb & Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
            <Link href="/cashier/history" style={{ color: "var(--accent-blue)", textDecoration: "none" }}>
              ← Transaction History
            </Link>
            <span>/</span>
            <span>Sale #{sale.sale_id}</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 10 }}>
            <span>🧾 {sale.receipt_number}</span>
            <span
              className={
                sale.status === "COMPLETED"
                  ? "badge badge-completed"
                  : sale.status === "OPEN"
                  ? "badge badge-open"
                  : "badge badge-cancelled"
              }
            >
              {sale.status}
            </span>
          </h1>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-primary" onClick={() => setShowPrintModal(true)}>
            🖨️ Print Receipt
          </button>

          {sale.status === "COMPLETED" && (
            <>
              <Link href={`/cashier/returns?saleId=${sale.sale_id}`} className="btn btn-ghost">
                ↩️ Process Return
              </Link>

              <button
                className="btn btn-danger"
                onClick={() => {
                  setCancelReason("Cashier Void Request");
                  setShowCancelModal(true);
                }}
              >
                🚫 Void / Cancel Sale
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sale Info Summary Card */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          background: "var(--bg-card)",
          padding: 20,
          borderRadius: 14,
          border: "1px solid var(--border)",
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Branch Location</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginTop: 4 }}>
            {sale.branch_name} ({sale.branch_code})
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{sale.branch_city}</div>
        </div>

        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Processing Cashier</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginTop: 4 }}>
            {sale.cashier_name}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>Employee #{sale.cashier_id}</div>
        </div>

        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Transaction Date</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginTop: 4 }}>
            {new Date(sale.sale_date).toLocaleString("en-LK", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>Status: {sale.status}</div>
        </div>

        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Customer Info</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginTop: 4 }}>
            {sale.customer_name || "Walk-in Customer"}
          </div>
          {sale.customer_card && (
            <div style={{ fontSize: 11, color: "var(--accent-blue)" }}>
              Card: {sale.customer_card} ({sale.customer_tier})
            </div>
          )}
        </div>
      </div>

      {/* Sale Items Table */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 20,
        }}
      >
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 14 }}>
          Purchased Line Items ({sale.items.length})
        </h3>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Barcode</th>
                <th style={{ textAlign: "center" }}>Qty Sold</th>
                <th style={{ textAlign: "right" }}>Unit Price</th>
                <th style={{ textAlign: "right" }}>Discount</th>
                <th style={{ textAlign: "right" }}>Line Total</th>
                <th style={{ textAlign: "center" }}>Returned Units</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item) => (
                <tr key={item.sale_item_id}>
                  <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.product_name}</td>
                  <td className="mono">{item.barcode}</td>
                  <td style={{ textAlign: "center", fontWeight: 700 }}>{item.quantity}</td>
                  <td style={{ textAlign: "right" }}>{fmt(item.unit_price)}</td>
                  <td style={{ textAlign: "right", color: Number(item.discount_amount) > 0 ? "var(--accent-rose)" : "inherit" }}>
                    {Number(item.discount_amount) > 0 ? `-${fmt(item.discount_amount)}` : "0.00"}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 800, color: "var(--text-primary)" }}>
                    {fmt(item.line_total)}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {item.returned_quantity > 0 ? (
                      <span className="badge badge-cancelled" style={{ fontSize: 10 }}>
                        {item.returned_quantity} returned
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-muted)", fontSize: 11 }}>0</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {sale.status === "COMPLETED" && item.remaining_returnable_qty > 0 && (
                      <Link
                        href={`/cashier/returns?saleId=${sale.sale_id}&itemId=${item.sale_item_id}`}
                        className="btn btn-ghost"
                        style={{ padding: "3px 8px", fontSize: 11 }}
                      >
                        ↩ Return Item
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculation Totals Breakdown */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <div style={{ width: 280, display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5 }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}>
              <span>Subtotal:</span>
              <span>{fmt(sale.subtotal)}</span>
            </div>
            {Number(sale.discount_total) > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--accent-rose)" }}>
                <span>Total Discount:</span>
                <span>-{fmt(sale.discount_total)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}>
              <span>Tax Total:</span>
              <span>{fmt(sale.tax_total)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 16,
                fontWeight: 900,
                color: "var(--accent-emerald)",
                paddingTop: 8,
                borderTop: "1px solid var(--border)",
              }}
            >
              <span>Total Paid:</span>
              <span>{fmt(sale.total_amount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column: Payments & Returns Log */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Payments Table */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 20,
          }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
            💳 Payment Breakdown
          </h3>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Reference</th>
                  <th>Amount</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {sale.payments.map((p) => (
                  <tr key={p.payment_id}>
                    <td>
                      <span className="badge badge-completed">{p.method}</span>
                    </td>
                    <td className="mono">{p.reference || "—"}</td>
                    <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>{fmt(p.amount)}</td>
                    <td style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {new Date(p.paid_at).toLocaleTimeString("en-LK")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Returns History Log */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 20,
          }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
            ↩️ Returns Processed on this Sale
          </h3>
          {sale.returns.length === 0 ? (
            <div style={{ textAlign: "center", padding: 30, color: "var(--text-muted)", fontSize: 12 }}>
              No items returned from this transaction.
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Refund</th>
                    <th>Reason</th>
                    <th>Approved By</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.returns.map((r) => (
                    <tr key={r.return_id}>
                      <td style={{ fontWeight: 600 }}>{r.product_name}</td>
                      <td>{r.quantity}</td>
                      <td style={{ color: "var(--accent-rose)", fontWeight: 700 }}>{fmt(r.refund_amount)}</td>
                      <td style={{ fontSize: 11 }}>{r.reason}</td>
                      <td style={{ fontSize: 11, color: "var(--text-muted)" }}>{r.processed_by_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Manager Approval Modal for Voiding */}
      <ManagerAuthModal
        isOpen={showCancelModal}
        title="Manager Approval: Void / Cancel Transaction"
        description={`Authorizing cancellation for Sale #${sale.sale_id} (${fmt(sale.total_amount)}). Restocks branch inventory.`}
        onClose={() => setShowCancelModal(false)}
        onSuccess={(mgr) => {
          handleManagerCancelApproved(mgr);
        }}
      />

      {/* Printable Receipt Modal */}
      {showPrintModal && (
        <PrintableReceipt
          receipt={receiptData}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
}

export default function SaleDetailPage({ params }: { params: Promise<{ saleId: string }> }) {
  const { saleId } = use(params);
  return (
    <React.Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading transaction #{saleId}...</div>}>
      <SaleDetailInner saleId={saleId} />
    </React.Suspense>
  );
}

