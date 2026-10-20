"use client";

import React, { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

export interface ReceiptData {
  saleId: number;
  receiptNumber: string;
  saleDate: string;
  branch: {
    name: string;
    branch_code?: string;
    address?: string;
    phone?: string;
    city?: string;
  };
  cashier: {
    full_name: string;
    employee_id?: number;
  };
  customer?: {
    full_name?: string;
    card_no?: string;
    tier?: string;
    points_balance?: number;
    points_earned?: number;
    points_redeemed?: number;
  } | null;
  items: Array<{
    product_name: string;
    barcode?: string;
    quantity: number;
    unit_price: number | string;
    discount_amount?: number | string;
    line_total: number | string;
  }>;
  subtotal: number | string;
  discountTotal: number | string;
  taxTotal: number | string;
  totalAmount: number | string;
  amountTendered?: number | string;
  changeDue?: number | string;
  payments: Array<{
    method: string;
    amount: number | string;
    reference?: string | null;
  }>;
}

interface PrintableReceiptProps {
  receipt: ReceiptData;
  onClose?: () => void;
  onNewSale?: () => void;
}

export default function PrintableReceipt({
  receipt,
  onClose,
  onNewSale,
}: PrintableReceiptProps) {
  const fmt = (val: number | string) =>
    `Rs. ${Number(val || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(receipt.saleDate).toLocaleString("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const barcodeRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (barcodeRef.current && receipt.receiptNumber) {
      try {
        JsBarcode(barcodeRef.current, receipt.receiptNumber, {
          format: "CODE128",
          width: 1.6,
          height: 42,
          displayValue: true,
          font: "monospace",
          fontSize: 12,
          textMargin: 3,
          background: "#ffffff",
          margin: 6,
        });
      } catch (err) {
        console.warn("Could not generate receipt barcode", err);
      }
    }
  }, [receipt.receiptNumber]);

  return (
    <div className="modal-overlay">
      <div
        className="modal-box"
        style={{
          maxWidth: 460,
          width: "100%",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--bg-surface)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>🧾</span>
            <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
              Transaction Receipt
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary" onClick={handlePrint} style={{ padding: "6px 12px", fontSize: 12 }}>
              🖨️ Print Receipt
            </button>
            {onClose && (
              <button
                className="btn btn-ghost"
                onClick={onClose}
                style={{ padding: "6px 10px", fontSize: 12 }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Printable Area */}
        <div
          style={{
            padding: 24,
            overflowY: "auto",
            flex: 1,
            background: "#ffffff",
            color: "#111827",
            fontFamily: "'Courier New', Courier, monospace",
          }}
          id="printable-receipt"
        >
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900, letterSpacing: "1px", margin: 0, textTransform: "uppercase" }}>
              NEXUS SUPERMARKET
            </h2>
            <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2 }}>
              {receipt.branch?.name || "Colombo Main Branch"}
            </div>
            {receipt.branch?.address && (
              <div style={{ fontSize: 11, color: "#4b5563" }}>{receipt.branch.address}</div>
            )}
            {receipt.branch?.phone && (
              <div style={{ fontSize: 11, color: "#4b5563" }}>Tel: {receipt.branch.phone}</div>
            )}
            <div
              style={{
                borderBottom: "1px dashed #6b7280",
                margin: "12px 0",
              }}
            />
          </div>

          {/* Meta Info */}
          <div style={{ fontSize: 11.5, lineHeight: 1.6, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Receipt No:</span>
              <strong>{receipt.receiptNumber}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Date & Time:</span>
              <span>{formattedDate}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Cashier:</span>
              <span>{receipt.cashier?.full_name || "Cashier"}</span>
            </div>
            {receipt.customer?.full_name && (
              <div style={{ display: "flex", justifyContent: "space-between", color: "#1e3a8a", fontWeight: 600 }}>
                <span>Loyalty Customer:</span>
                <span>{receipt.customer.full_name} ({receipt.customer.tier || "Member"})</span>
              </div>
            )}
          </div>

          <div style={{ borderBottom: "1px dashed #6b7280", marginBottom: 10 }} />

          {/* Itemized Table */}
          <table style={{ width: "100%", fontSize: 11.5, borderCollapse: "collapse", marginBottom: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #9ca3af", textAlign: "left" }}>
                <th style={{ padding: "4px 0" }}>Item</th>
                <th style={{ padding: "4px 0", textAlign: "center" }}>Qty</th>
                <th style={{ padding: "4px 0", textAlign: "right" }}>Price</th>
                <th style={{ padding: "4px 0", textAlign: "right" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {receipt.items.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: "1px dotted #e5e7eb" }}>
                  <td style={{ padding: "5px 0" }}>
                    <div style={{ fontWeight: 600 }}>{item.product_name}</div>
                    {item.barcode && (
                      <div style={{ fontSize: 9.5, color: "#6b7280" }}>{item.barcode}</div>
                    )}
                    {Number(item.discount_amount || 0) > 0 && (
                      <div style={{ fontSize: 9.5, color: "#b91c1c" }}>
                        Disc: -Rs. {Number(item.discount_amount).toFixed(2)}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "5px 0", textAlign: "center", verticalAlign: "top" }}>
                    {item.quantity}
                  </td>
                  <td style={{ padding: "5px 0", textAlign: "right", verticalAlign: "top" }}>
                    {Number(item.unit_price).toFixed(2)}
                  </td>
                  <td style={{ padding: "5px 0", textAlign: "right", verticalAlign: "top", fontWeight: 700 }}>
                    {Number(item.line_total).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ borderBottom: "1px dashed #6b7280", margin: "10px 0" }} />

          {/* Totals */}
          <div style={{ fontSize: 12, lineHeight: 1.7, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Subtotal:</span>
              <span>{fmt(receipt.subtotal)}</span>
            </div>
            {Number(receipt.discountTotal) > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", color: "#b91c1c" }}>
                <span>Total Discount:</span>
                <span>-{fmt(receipt.discountTotal)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Tax Total (18% / Item Tax):</span>
              <span>{fmt(receipt.taxTotal)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 15,
                fontWeight: 900,
                borderTop: "1px solid #111827",
                borderBottom: "1px solid #111827",
                padding: "6px 0",
                margin: "6px 0",
              }}
            >
              <span>TOTAL DUE:</span>
              <span>{fmt(receipt.totalAmount)}</span>
            </div>
          </div>

          {/* Payment breakdown */}
          <div style={{ fontSize: 11.5, lineHeight: 1.6, marginBottom: 14 }}>
            <div style={{ fontWeight: 700, textTransform: "uppercase", fontSize: 11, marginBottom: 4 }}>
              Payment Breakdown
            </div>
            {receipt.payments.map((p, idx) => (
              <div key={idx} style={{ display: "flex", justifyContent: "space-between" }}>
                <span>
                  {p.method} {p.reference ? `(${p.reference})` : ""}:
                </span>
                <span>{fmt(p.amount)}</span>
              </div>
            ))}
            {receipt.amountTendered && Number(receipt.amountTendered) > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Amount Tendered:</span>
                <span>{fmt(receipt.amountTendered)}</span>
              </div>
            )}
            {receipt.changeDue !== undefined && Number(receipt.changeDue) > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, color: "#047857" }}>
                <span>Change Given:</span>
                <span>{fmt(receipt.changeDue)}</span>
              </div>
            )}
          </div>

          {/* Loyalty Program Summary on Receipt */}
          {receipt.customer?.card_no && (
            <div
              style={{
                background: "#f9fafb",
                border: "1px dashed #9ca3af",
                padding: "8px 10px",
                borderRadius: 4,
                marginBottom: 12,
                fontSize: 11,
                lineHeight: 1.6,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: "#111827" }}>
                <span>LOYALTY REWARDS ({receipt.customer.tier}):</span>
                <span>{receipt.customer.card_no}</span>
              </div>
              {receipt.customer.points_earned !== undefined && Number(receipt.customer.points_earned) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "#047857", fontWeight: 600 }}>
                  <span>⭐ Points Earned Today:</span>
                  <span>+{receipt.customer.points_earned} pts</span>
                </div>
              )}
              {receipt.customer.points_redeemed !== undefined && Number(receipt.customer.points_redeemed) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "#b91c1c", fontWeight: 600 }}>
                  <span>Points Redeemed:</span>
                  <span>-{receipt.customer.points_redeemed} pts</span>
                </div>
              )}
              {receipt.customer.points_balance !== undefined && (
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: "#1f2937", borderTop: "1px dotted #d1d5db", marginTop: 4, paddingTop: 4 }}>
                  <span>New Available Balance:</span>
                  <span>{receipt.customer.points_balance} pts</span>
                </div>
              )}
            </div>
          )}

          <div style={{ borderBottom: "1px dashed #6b7280", margin: "12px 0" }} />

          {/* Barcode & Footer message */}
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
              <svg ref={barcodeRef} style={{ maxWidth: "100%", height: "auto" }} />
            </div>
            <div style={{ fontSize: 10, color: "#4b5563" }}>
              Thank you for shopping with NEXUS SUPERMARKET!
            </div>
            <div style={{ fontSize: 9.5, color: "#6b7280", marginTop: 2 }}>
              Please retain this receipt for returns within 7 days.
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            background: "var(--bg-surface)",
          }}
        >
          {onNewSale ? (
            <button className="btn btn-emerald" onClick={onNewSale} style={{ flex: 1, justifyContent: "center" }}>
              🛒 Start New Sale
            </button>
          ) : (
            <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1, justifyContent: "center" }}>
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
