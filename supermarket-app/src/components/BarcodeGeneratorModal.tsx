"use client";

import React, { useState, useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

export interface BarcodeItem {
  name: string;
  barcode: string;
  price?: string | number;
  category?: string;
}

interface BarcodeGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBarcode?: string;
  initialProductName?: string;
  productsList?: BarcodeItem[];
}

export default function BarcodeGeneratorModal({
  isOpen,
  onClose,
  initialBarcode = "4790001",
  initialProductName = "Milk 1L",
  productsList = [],
}: BarcodeGeneratorModalProps) {
  const [selectedBarcode, setSelectedBarcode] = useState(initialBarcode);
  const [productName, setProductName] = useState(initialProductName);
  const [barcodeFormat, setBarcodeFormat] = useState<"CODE128" | "EAN13" | "CODE39" | "UPC">("CODE128");
  const [barcodeError, setBarcodeError] = useState("");
  const [availableProducts, setAvailableProducts] = useState<BarcodeItem[]>(productsList);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // If productsList is empty, fetch products from API
  useEffect(() => {
    if (productsList.length > 0) {
      setAvailableProducts(productsList);
    } else {
      fetch("/api/cashier/products?branchId=1")
        .then((r) => r.json())
        .then((data) => {
          if (data.products && Array.isArray(data.products)) {
            setAvailableProducts(
              data.products.map((p: any) => ({
                name: p.name,
                barcode: p.barcode,
                price: p.unit_price,
                category: p.category_name,
              }))
            );
          }
        })
        .catch(() => {});
    }
  }, [productsList]);

  // Sync initial barcode props
  useEffect(() => {
    if (initialBarcode) {
      setSelectedBarcode(initialBarcode);
    }
    if (initialProductName) {
      setProductName(initialProductName);
    }
  }, [initialBarcode, initialProductName]);

  // Render barcode whenever selectedBarcode or format changes
  useEffect(() => {
    if (!isOpen || !svgRef.current || !selectedBarcode) return;
    setBarcodeError("");

    try {
      JsBarcode(svgRef.current, selectedBarcode, {
        format: barcodeFormat,
        lineColor: "#000000",
        width: 2.2,
        height: 85,
        displayValue: true,
        font: "monospace",
        fontSize: 15,
        textMargin: 6,
        background: "#ffffff",
        margin: 12,
      });
    } catch (err: any) {
      setBarcodeError(err?.message || "Invalid barcode format for selected type.");
    }
  }, [isOpen, selectedBarcode, barcodeFormat]);

  if (!isOpen) return null;

  const handleDownloadPNG = () => {
    if (!svgRef.current) return;
    try {
      const svgData = new XMLSerializer().serializeToString(svgRef.current);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const DOMURL = window.URL || window.webkitURL || window;
      const url = DOMURL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width || 360;
        canvas.height = img.height || 160;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          const pngUrl = canvas.toDataURL("image/png");
          const dlLink = document.createElement("a");
          dlLink.download = `barcode_${selectedBarcode}.png`;
          dlLink.href = pngUrl;
          dlLink.click();
        }
        DOMURL.revokeObjectURL(url);
      };
      img.src = url;
    } catch (e) {
      console.error("Failed to download PNG", e);
    }
  };

  const handlePrintBarcode = () => {
    window.print();
  };

  return (
    <div className="modal-overlay">
      <div
        className="modal-box"
        style={{
          maxWidth: 680,
          width: "100%",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          maxHeight: "92vh",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>🏷️</span>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--text-primary)" }}>
                Barcode Generator & Scanner Test Sheets
              </h3>
              <p style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                Generate valid scannable barcodes to scan with your computer camera or phone
              </p>
            </div>
          </div>
          <button className="btn btn-ghost" style={{ padding: "4px 8px" }} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* 2-Column: Left = Preview & Generator, Right = Quick Select Catalog */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 18, minHeight: 0 }}>
          {/* Left Column: Barcode Card Display */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              background: "var(--bg-surface)",
              padding: 16,
              borderRadius: 12,
              border: "1px solid var(--border)",
            }}
          >
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                Product Label / Name
              </label>
              <input
                type="text"
                className="input"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Item Name (e.g. Milk 1L)"
              />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                  Barcode Value
                </label>
                <input
                  type="text"
                  className="input"
                  value={selectedBarcode}
                  onChange={(e) => setSelectedBarcode(e.target.value)}
                  placeholder="e.g. 4790001"
                />
              </div>

              <div style={{ width: 110 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                  Format
                </label>
                <select
                  className="input"
                  value={barcodeFormat}
                  onChange={(e) => setBarcodeFormat(e.target.value as any)}
                >
                  <option value="CODE128">Code 128</option>
                  <option value="CODE39">Code 39</option>
                  <option value="EAN13">EAN-13</option>
                  <option value="UPC">UPC-A</option>
                </select>
              </div>
            </div>

            {barcodeError && (
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: 6,
                  background: "rgba(248, 81, 73, 0.15)",
                  color: "var(--accent-rose)",
                  fontSize: 11,
                }}
              >
                ⚠️ {barcodeError} (Tip: Switch to Code 128 for any custom number)
              </div>
            )}

            {/* Crisp Scannable Barcode Canvas Area */}
            <div
              style={{
                background: "#ffffff",
                padding: "20px 16px",
                borderRadius: 10,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
                border: "2px solid #e5e7eb",
              }}
              id="scannable-barcode-display"
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#111827",
                  marginBottom: 6,
                  textTransform: "uppercase",
                  textAlign: "center",
                }}
              >
                {productName}
              </div>

              {/* Real SVG rendered by JsBarcode */}
              <svg ref={svgRef} style={{ maxWidth: "100%", height: "auto" }} />

              <div style={{ fontSize: 10, color: "#6b7280", marginTop: 4 }}>
                Hold in front of camera or phone screen
              </div>
            </div>

            {/* Actions: Download / Print */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleDownloadPNG}
                style={{ flex: 1, justifyContent: "center", fontSize: 12 }}
              >
                💾 Save Image (PNG)
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handlePrintBarcode}
                style={{ flex: 1, justifyContent: "center", fontSize: 12 }}
              >
                🖨️ Print Tag
              </button>
            </div>
          </div>

          {/* Right Column: Pre-made Supermarket Barcodes */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              background: "var(--bg-surface)",
              padding: 16,
              borderRadius: 12,
              border: "1px solid var(--border)",
              minHeight: 0,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
              Existing Supermarket Items
            </div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12 }}>
              Click any product to generate its valid scannable barcode:
            </p>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                paddingRight: 4,
              }}
            >
              {availableProducts.map((p, idx) => {
                const isSelected = selectedBarcode === p.barcode;
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedBarcode(p.barcode);
                      setProductName(p.name);
                    }}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: isSelected ? "var(--bg-card2)" : "var(--bg-card)",
                      border: isSelected ? "1px solid var(--accent-emerald)" : "1px solid var(--border)",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      transition: "all 0.15s",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 12.5, color: "var(--text-primary)" }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                        Barcode: <span className="mono" style={{ color: "var(--accent-blue)" }}>{p.barcode}</span>
                        {p.category ? ` • ${p.category}` : ""}
                      </div>
                    </div>
                    {isSelected ? (
                      <span className="badge badge-completed" style={{ fontSize: 9 }}>Active</span>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>→</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer tip */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 12px",
            background: "rgba(56, 189, 248, 0.08)",
            borderRadius: 8,
            fontSize: 11,
            color: "var(--accent-blue)",
          }}
        >
          <span>
            💡 <strong>Testing Tip:</strong> Open this barcode modal, or display it on your smartphone/another tab, and point the webcam scanner at it!
          </span>
          <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
