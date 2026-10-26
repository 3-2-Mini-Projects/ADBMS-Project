"use client";

import React, { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

export interface RefundSlipData {
  returnId: number;
  saleId: number;
  receiptNumber: string;
  productName: string;
  barcode: string;
  quantity: number;
  unitPrice?: number;
  netUnitPrice?: number;
  refundAmount: number;
  refundMethod: string;
  restocked: boolean;
  reason: string;
  branchName?: string;
  branchCode?: string;
  cashierName?: string;
  managerName: string;
  returnDate: string;
  customerName?: string | null;
}

interface PrintableRefundSlipProps {
  refund: RefundSlipData;
  onClose: () => void;
}

export default function PrintableRefundSlip({ refund, onClose }: PrintableRefundSlipProps) {
  const barcodeRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, `RET-${String(refund.returnId).padStart(6, "0")}`, {
          format: "CODE128",
          width: 1.5,
          height: 38,
          displayValue: true,
          fontSize: 11,
          margin: 6,
          background: "#ffffff",
          lineColor: "#000000",
        });
      } catch (err) {
        console.warn("Barcode rendering error:", err);
      }
    }
  }, [refund.returnId]);

  const fmt = (n: number | string) =>
    `Rs. ${Number(n || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handlePrint = () => {
    window.print();
  };

  const returnDateFormatted = new Date(refund.returnDate).toLocaleString("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div
        className="modal-box"
        style={{
          maxWidth: 420,
          width: "100%",
          padding: 0,
          background: "#ffffff",
          color: "#0f172a",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
        }}
      >
        {/* Screen Action Bar (hidden in print) */}
        <div
          className="no-print"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 18px",
            background: "#0f172a",
            color: "#ffffff",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            <span>🧾</span>
            <span>Refund &amp; Credit Note #{refund.returnId}</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handlePrint}
              style={{
                background: "#10b981",
                color: "#ffffff",
                border: "none",
                borderRadius: 6,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              🖨️ Print Slip
            </button>
            <button
              onClick={onClose}
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                color: "#ffffff",
                border: "none",
                borderRadius: 6,
                padding: "6px 10px",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Printable Thermal Slip Area */}
        <div
          id="printable-refund-slip"
          style={{
            padding: "24px 20px",
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: 12,
            lineHeight: 1.45,
            color: "#000000",
            background: "#ffffff",
            maxHeight: "78vh",
            overflowY: "auto",
          }}
        >
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: 1 }}>NEXUS SUPERMARKET</div>
            <div style={{ fontSize: 11, fontWeight: 600 }}>{refund.branchName || "Retail Branch"}</div>
            <div style={{ fontSize: 10, color: "#475569" }}>
              Branch Code: {refund.branchCode || "BR"}
            </div>
            <div
              style={{
                marginTop: 8,
                padding: "3px 0",
                borderTop: "1px dashed #000",
                borderBottom: "1px dashed #000",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: 0.5,
              }}
            >
              CUSTOMER REFUND CREDIT NOTE
            </div>
          </div>

          {/* Transaction Metadata */}
          <div style={{ fontSize: 11, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Refund Note #:</span>
              <strong>RET-{String(refund.returnId).padStart(6, "0")}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Original Sale #:</span>
              <span>{refund.receiptNumber}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Date &amp; Time:</span>
              <span>{returnDateFormatted}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Customer:</span>
              <span>{refund.customerName || "Walk-in Customer"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Processing Cashier:</span>
              <span>{refund.cashierName || "Staff"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Authorized Manager:</span>
              <span>{refund.managerName}</span>
            </div>
          </div>

          {/* Returned Item Section */}
          <div style={{ borderTop: "1px solid #000", borderBottom: "1px solid #000", padding: "8px 0", margin: "10px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 11, marginBottom: 4 }}>
              <span>ITEM / DESCRIPTION</span>
              <span>REFUND</span>
            </div>
            <div style={{ fontSize: 11 }}>
              <div style={{ fontWeight: 700 }}>{refund.productName}</div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#334155" }}>
                <span>
                  {refund.quantity} × {fmt(refund.netUnitPrice || refund.unitPrice || 0)}
                </span>
                <span style={{ fontWeight: 800, color: "#000" }}>{fmt(refund.refundAmount)}</span>
              </div>
              <div style={{ fontSize: 10, color: "#64748b" }}>Barcode: {refund.barcode}</div>
            </div>
          </div>

          {/* Refund Details */}
          <div style={{ fontSize: 11, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span>Return Reason:</span>
              <span style={{ maxWidth: 180, textAlign: "right" }}>{refund.reason}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span>Refund Method:</span>
              <strong>{refund.refundMethod || "CASH"}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span>Restock Condition:</span>
              <span>{refund.restocked ? "Approved (Restocked to Shelf)" : "Damaged / Disposed"}</span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 0",
                borderTop: "2px solid #000",
                borderBottom: "2px solid #000",
                fontSize: 14,
                fontWeight: 900,
              }}
            >
              <span>TOTAL REFUNDED:</span>
              <span>{fmt(refund.refundAmount)}</span>
            </div>
          </div>

          {/* Barcode */}
          <div style={{ textAlign: "center", margin: "14px 0 10px" }}>
            <svg ref={barcodeRef} style={{ maxWidth: "100%" }}></svg>
          </div>

          {/* Signatures */}
          <div style={{ marginTop: 16, paddingTop: 10, borderTop: "1px dashed #94a3b8", fontSize: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
              <div style={{ borderTop: "1px solid #000", paddingTop: 4, textAlign: "center" }}>
                Customer Signature
              </div>
              <div style={{ borderTop: "1px solid #000", paddingTop: 4, textAlign: "center" }}>
                Manager Signature
              </div>
            </div>
            <div style={{ textAlign: "center", marginTop: 12, fontSize: 9.5, color: "#64748b" }}>
              Thank you for shopping with Nexus Supermarket.
            </div>
          </div>
        </div>

        {/* Print Styles */}
        <style jsx global>{`
          @media print {
            aside,
            header,
            nav,
            button,
            .no-print,
            main > div > div:not(:has(#printable-refund-slip)),
            main > div:not(:has(#printable-refund-slip)) {
              display: none !important;
            }

            .modal-overlay,
            .modal-box {
              position: static !important;
              background: transparent !important;
              backdrop-filter: none !important;
              -webkit-backdrop-filter: none !important;
              transform: none !important;
              overflow: visible !important;
              max-height: none !important;
              height: auto !important;
              padding: 0 !important;
              margin: 0 !important;
              border: none !important;
              box-shadow: none !important;
              display: block !important;
            }

            #printable-refund-slip {
              position: static !important;
              width: 76mm !important;
              max-width: 76mm !important;
              margin: 0 auto !important;
              padding: 0 !important;
              overflow: visible !important;
              max-height: none !important;
              background: #ffffff !important;
              color: #000000 !important;
              display: block !important;
              box-sizing: border-box !important;
              font-family: 'Courier New', Courier, monospace !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
