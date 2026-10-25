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
    phone?: string;
    email?: string;
  } | null;
  email?: {
    success?: boolean;
    recipient?: string;
    messageId?: string;
  } | null;
  sms?: {
    success?: boolean;
    recipient?: string;
    messageId?: string;
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
  tendered_cash?: number | string;
  amountTendered?: number | string;
  change_amount?: number | string;
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

  // Automatic thermal receipt print trigger if enabled in Cashier Settings
  useEffect(() => {
    try {
      const autoPrint = localStorage.getItem("adbms_autoprint_receipt");
      if (autoPrint === null || autoPrint === "true") {
        const timer = setTimeout(() => {
          window.print();
        }, 500);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

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
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
              <img
                src="/logo.png"
                alt="Nexus Supermarket Logo"
                style={{ height: 46, maxWidth: 160, objectFit: "contain" }}
              />
            </div>
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

          {/* Totals & Loyalty Point Discount */}
          {(() => {
            // Robust extraction of loyalty points:
            const pointsPayment = receipt.payments?.find((p) => p.method === "POINTS");
            const pointsRedeemed = Number(
              receipt.customer?.points_redeemed ?? (pointsPayment ? pointsPayment.amount : 0)
            );
            const grossBillTotal = Number(receipt.totalAmount || 0);
            const remainingPurchaseValue = Math.max(0, Number((grossBillTotal - pointsRedeemed).toFixed(2)));

            // Extract Cash payment details:
            const cashPayment = receipt.payments?.find((p) => p.method === "CASH");
            const cashLineAmount = cashPayment ? Number(cashPayment.amount) : 0;
            const rawTendered = receipt.tendered_cash ?? receipt.amountTendered;
            const tenderedCash = rawTendered !== undefined && rawTendered !== null && Number(rawTendered) > 0
              ? Number(rawTendered)
              : cashLineAmount;
            const rawChange = receipt.change_amount ?? receipt.changeDue;
            const changeDue = rawChange !== undefined && rawChange !== null && Number(rawChange) >= 0
              ? Number(rawChange)
              : (cashPayment && tenderedCash > cashLineAmount ? Number((tenderedCash - cashLineAmount).toFixed(2)) : 0);

            return (
              <>
                {/* 1. Bill Calculation & Discount Breakdown */}
                <div style={{ fontSize: 12, lineHeight: 1.7, marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Gross Subtotal:</span>
                    <span>{fmt(receipt.subtotal)}</span>
                  </div>
                  {Number(receipt.discountTotal) > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#b91c1c" }}>
                      <span>Promotional Discounts:</span>
                      <span>-{fmt(receipt.discountTotal)}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Tax (18% / Item Tax):</span>
                    <span>{fmt(receipt.taxTotal)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, borderTop: "1px dashed #d1d5db", paddingTop: 4, marginTop: 4 }}>
                    <span>Gross Bill Total:</span>
                    <span>{fmt(grossBillTotal)}</span>
                  </div>

                  {pointsRedeemed > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#7c3aed", fontWeight: 700 }}>
                      <span>⭐ Loyalty Point Discount ({pointsRedeemed} pts):</span>
                      <span>-{fmt(pointsRedeemed)}</span>
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 14,
                      fontWeight: 900,
                      borderTop: "2px solid #111827",
                      borderBottom: "2px solid #111827",
                      padding: "6px 0",
                      margin: "8px 0",
                    }}
                  >
                    <span>{pointsRedeemed > 0 ? "REMAINING PURCHASE VALUE:" : "TOTAL AMOUNT DUE:"}</span>
                    <span>{fmt(remainingPurchaseValue)}</span>
                  </div>
                </div>

                {/* 2. Payment & Cash Settlement Breakdown */}
                <div style={{ fontSize: 11.5, lineHeight: 1.6, marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, textTransform: "uppercase", fontSize: 11, marginBottom: 6, borderBottom: "1px solid #e5e7eb", paddingBottom: 2 }}>
                    Payment & Cash Settlement
                  </div>

                  {/* All payment methods applied */}
                  {receipt.payments?.map((p, idx) => {
                    const isPts = p.method === "POINTS";
                    return (
                      <div key={idx} style={{ display: "flex", justifyContent: "space-between", color: isPts ? "#6b21a8" : "#111827" }}>
                        <span>
                          {isPts ? "⭐ Paid via Loyalty Points:" : `Paid via ${p.method} ${p.reference ? `(${p.reference})` : ""}:`}
                        </span>
                        <span style={{ fontWeight: 600 }}>{fmt(p.amount)}</span>
                      </div>
                    );
                  })}

                  {/* Cash Settlement Details if Cash was used */}
                  {cashPayment && (
                    <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px dashed #9ca3af" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#4b5563" }}>
                        <span>Remaining Cash Due:</span>
                        <span>{fmt(cashLineAmount)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, marginTop: 2 }}>
                        <span>Customer Tendered Cash:</span>
                        <span style={{ fontWeight: 800 }}>{fmt(tenderedCash)}</span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontWeight: 900,
                          color: "#047857",
                          fontSize: 13,
                          borderTop: "1px dotted #6b7280",
                          paddingTop: 4,
                          marginTop: 4,
                        }}
                      >
                        <span>Cash Hand to Customer (Change):</span>
                        <span>{fmt(changeDue)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            );
          })()}

          {/* Loyalty Program Summary on Receipt */}
          {receipt.customer?.card_no && (() => {
            const pointsPayment = receipt.payments?.find((p) => p.method === "POINTS");
            const pointsRedeemed = Number(
              receipt.customer?.points_redeemed ?? (pointsPayment ? pointsPayment.amount : 0)
            );

            return (
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
                  <span>LOYALTY REWARDS ({receipt.customer.tier || "MEMBER"}):</span>
                  <span>{receipt.customer.card_no}</span>
                </div>
                {pointsRedeemed > 0 ? (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#7c3aed", fontWeight: 600 }}>
                      <span>Points Redeemed (Discount):</span>
                      <span>-{pointsRedeemed} pts (-{fmt(pointsRedeemed)})</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#6b7280", fontStyle: "italic", fontSize: 10 }}>
                      <span>Points Earned Today:</span>
                      <span>0 pts (Transaction used points)</span>
                    </div>
                  </>
                ) : (
                  receipt.customer.points_earned !== undefined && Number(receipt.customer.points_earned) > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#047857", fontWeight: 600 }}>
                      <span>⭐ Points Earned Today:</span>
                      <span>+{receipt.customer.points_earned} pts</span>
                    </div>
                  )
                )}
                {receipt.customer.points_balance !== undefined && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: "#1f2937", borderTop: "1px dotted #d1d5db", marginTop: 4, paddingTop: 4 }}>
                    <span>New Available Balance:</span>
                    <span>{receipt.customer.points_balance} pts</span>
                  </div>
                )}
                {receipt.email?.success && (
                  <div style={{ fontSize: 9.5, color: "#047857", textAlign: "center", marginTop: 4, paddingTop: 4, borderTop: "1px dashed #d1d5db" }}>
                    ✓ Loyalty Rewards Email sent to {receipt.email.recipient}
                  </div>
                )}
                {!receipt.email?.success && receipt.sms?.success && (
                  <div style={{ fontSize: 9.5, color: "#047857", textAlign: "center", marginTop: 4, paddingTop: 4, borderTop: "1px dashed #d1d5db" }}>
                    ✓ Loyalty SMS sent to {receipt.sms.recipient}
                  </div>
                )}
              </div>
            );
          })()}

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
