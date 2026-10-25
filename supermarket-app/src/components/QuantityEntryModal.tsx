"use client";

import React, { useState, useEffect, useRef } from "react";

export interface QuantityModalProduct {
  product_id: number;
  barcode: string;
  name: string;
  brand?: string;
  unit_price: number | string;
  available_stock: number;
  category_name?: string;
}

interface QuantityEntryModalProps {
  isOpen: boolean;
  product: QuantityModalProduct | null;
  currentCartQty?: number;
  initialMode?: "add" | "set";
  defaultQuantity?: number;
  onConfirm: (quantity: number, mode: "add" | "set") => void;
  onClose: () => void;
}

export default function QuantityEntryModal({
  isOpen,
  product,
  currentCartQty = 0,
  initialMode = "add",
  defaultQuantity = 1,
  onConfirm,
  onClose,
}: QuantityEntryModalProps) {
  const [quantityStr, setQuantityStr] = useState<string>("1");
  const [mode, setMode] = useState<"add" | "set">(initialMode);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const inputRef = useRef<HTMLInputElement>(null);

  // Reset and autofocus input whenever modal opens
  useEffect(() => {
    if (isOpen && product) {
      const defaultQty =
        initialMode === "set" && currentCartQty > 0
          ? String(currentCartQty)
          : String(defaultQuantity > 0 ? defaultQuantity : 1);
      setQuantityStr(defaultQty);
      setMode(initialMode);
      setErrorMsg("");

      // Focus and select all text after render so typing immediately replaces "1"
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [isOpen, product, currentCartQty, initialMode]);

  if (!isOpen || !product) return null;

  const unitPrice = Number(product.unit_price || 0);
  const parsedQty = parseInt(quantityStr, 10);
  const isValidNumber = !isNaN(parsedQty) && parsedQty > 0;
  const currentQty = isValidNumber ? parsedQty : 0;

  // Calculate total units after operation
  const totalAfter = mode === "add" ? currentCartQty + currentQty : currentQty;
  const exceedsStock = totalAfter > product.available_stock;
  const isOutOfStock = product.available_stock <= 0;

  const lineTotal = unitPrice * currentQty;

  const fmt = (n: number) =>
    `Rs. ${n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!isValidNumber || currentQty <= 0) {
      setErrorMsg("Please enter a valid quantity of at least 1.");
      inputRef.current?.focus();
      return;
    }

    if (mode === "add" && currentCartQty + currentQty > product.available_stock) {
      const maxCanAdd = Math.max(0, product.available_stock - currentCartQty);
      setErrorMsg(`Cannot add ${currentQty}. Only ${maxCanAdd} more units available in stock.`);
      inputRef.current?.focus();
      return;
    }

    if (mode === "set" && currentQty > product.available_stock) {
      setErrorMsg(`Exceeds available stock (${product.available_stock} units).`);
      inputRef.current?.focus();
      return;
    }

    onConfirm(currentQty, mode);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = (isValidNumber ? parsedQty : 0) + 1;
      const maxAllowed = mode === "add" ? Math.max(1, product.available_stock - currentCartQty) : product.available_stock;
      if (next <= maxAllowed) {
        setQuantityStr(String(next));
        setErrorMsg("");
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.max(1, (isValidNumber ? parsedQty : 1) - 1);
      setQuantityStr(String(next));
      setErrorMsg("");
    }
  };

  const handlePresetClick = (qty: number) => {
    setQuantityStr(String(qty));
    setErrorMsg("");
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  };

  const handleStepper = (delta: number) => {
    const cur = isValidNumber ? parsedQty : 1;
    const next = Math.max(1, cur + delta);
    setQuantityStr(String(next));
    setErrorMsg("");
    inputRef.current?.focus();
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-box"
        style={{
          width: "100%",
          maxWidth: 480,
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 16,
          boxShadow: "0 20px 40px -10px rgba(15, 23, 42, 0.15)",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          animation: "fadeIn 0.15s ease-out",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  background: "#eff6ff",
                  color: "#2563eb",
                  padding: "2px 8px",
                  borderRadius: 6,
                  border: "1px solid #bfdbfe",
                }}
              >
                🏷️ {product.barcode}
              </span>
              {product.category_name && (
                <span
                  style={{
                    fontSize: 11,
                    color: "#64748b",
                    background: "#f1f5f9",
                    padding: "2px 8px",
                    borderRadius: 6,
                  }}
                >
                  {product.category_name}
                </span>
              )}
            </div>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#0f172a",
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              {product.name}
            </h2>
            {product.brand && (
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                {product.brand}
              </div>
            )}
          </div>

          <button
            type="button"
            className="btn btn-ghost"
            style={{
              padding: "4px 8px",
              fontSize: 14,
              color: "#64748b",
              borderRadius: 8,
            }}
            onClick={onClose}
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Product Stock & Unit Price Pill Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#f8fafc",
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #e2e8f0",
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: "#64748b" }}>Unit Price</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#059669" }}>
              {fmt(unitPrice)}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "#64748b" }}>Available Stock</div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: isOutOfStock
                  ? "#e11d48"
                  : "#0f172a",
              }}
            >
              {product.available_stock} units
            </div>
          </div>
        </div>

        {/* In-Cart Status & Mode Selector if already in cart */}
        {currentCartQty > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              padding: "8px 12px",
              borderRadius: 8,
              fontSize: 12,
            }}
          >
            <span style={{ color: "#1d4ed8", fontWeight: 600 }}>
              🛒 Already in cart: <strong>{currentCartQty}</strong> units
            </span>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                type="button"
                className={`btn ${mode === "add" ? "btn-primary" : "btn-ghost"}`}
                style={{ padding: "3px 8px", fontSize: 11 }}
                onClick={() => {
                  setMode("add");
                  setQuantityStr("1");
                  setErrorMsg("");
                  inputRef.current?.focus();
                  inputRef.current?.select();
                }}
              >
                + Add More
              </button>
              <button
                type="button"
                className={`btn ${mode === "set" ? "btn-primary" : "btn-ghost"}`}
                style={{ padding: "3px 8px", fontSize: 11 }}
                onClick={() => {
                  setMode("set");
                  setQuantityStr(String(currentCartQty));
                  setErrorMsg("");
                  inputRef.current?.focus();
                  inputRef.current?.select();
                }}
              >
                Set Total
              </button>
            </div>
          </div>
        )}

        {/* Quantity Input Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                fontWeight: 700,
                color: "#334155",
                marginBottom: 6,
              }}
            >
              <span>{mode === "add" ? "Quantity to Add" : "Total Quantity"}</span>
              <span style={{ fontSize: 11, fontWeight: 400, color: "#64748b" }}>
                Type number and press Enter ↵
              </span>
            </label>

            {/* Huge Number Input with Stepper Controls */}
            <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
              <button
                type="button"
                onClick={() => handleStepper(-1)}
                className="btn btn-ghost"
                style={{
                  width: 52,
                  fontSize: 22,
                  fontWeight: 700,
                  background: "#f8fafc",
                  border: "1px solid #cbd5e1",
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#0f172a",
                }}
                title="Decrease (ArrowDown)"
              >
                -
              </button>

              <div style={{ position: "relative", flex: 1 }}>
                <input
                  ref={inputRef}
                  type="number"
                  min={1}
                  max={product.available_stock}
                  value={quantityStr}
                  onChange={(e) => {
                    setQuantityStr(e.target.value);
                    setErrorMsg("");
                  }}
                  onKeyDown={handleKeyDown}
                  className="input"
                  style={{
                    width: "100%",
                    height: 56,
                    fontSize: 28,
                    fontWeight: 900,
                    textAlign: "center",
                    letterSpacing: 1,
                    color: exceedsStock ? "#e11d48" : "#059669",
                    borderColor: exceedsStock
                      ? "#e11d48"
                      : "#059669",
                    boxShadow: "0 0 10px rgba(16, 185, 129, 0.12)",
                    background: "#ffffff",
                  }}
                  placeholder="1"
                  autoComplete="off"
                />
              </div>

              <button
                type="button"
                onClick={() => handleStepper(1)}
                className="btn btn-ghost"
                style={{
                  width: 52,
                  fontSize: 22,
                  fontWeight: 700,
                  background: "#f8fafc",
                  border: "1px solid #cbd5e1",
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#0f172a",
                }}
                title="Increase (ArrowUp)"
              >
                +
              </button>
            </div>
          </div>

          {/* Quick Presets */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#64748b", marginRight: 2 }}>
              Quick:
            </span>
            {[1, 2, 3, 5, 10, 12, 20].map((preset) => {
              const maxCanAdd =
                mode === "add"
                  ? Math.max(0, product.available_stock - currentCartQty)
                  : product.available_stock;
              const disabled = preset > maxCanAdd;
              return (
                <button
                  key={preset}
                  type="button"
                  className="btn btn-ghost"
                  disabled={disabled}
                  onClick={() => handlePresetClick(preset)}
                  style={{
                    padding: "3px 8px",
                    fontSize: 11.5,
                    fontWeight: 600,
                    borderRadius: 6,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    color: "#334155",
                    opacity: disabled ? 0.4 : 1,
                  }}
                >
                  +{preset}
                </button>
              );
            })}
            {product.available_stock > 0 && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  const maxVal =
                    mode === "add"
                      ? Math.max(1, product.available_stock - currentCartQty)
                      : product.available_stock;
                  handlePresetClick(maxVal);
                }}
                style={{
                  padding: "3px 8px",
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 6,
                  color: "#2563eb",
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                }}
              >
                Max Stock ({product.available_stock})
              </button>
            )}
          </div>

          {/* Live Line Calculation & Total */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              padding: "10px 14px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: "#64748b" }}>Line Total</div>
              <div style={{ fontSize: 11, color: "#475569" }}>
                {fmt(unitPrice)} × {currentQty} units
              </div>
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#059669" }}>
              {fmt(lineTotal)}
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                background: "#fff1f2",
                border: "1px solid #fecdd3",
                color: "#e11d48",
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
              marginTop: 6,
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: "#94a3b8",
                marginRight: "auto",
                fontFamily: "monospace",
              }}
            >
              [Enter ↵] Confirm &nbsp;•&nbsp; [Esc] Cancel
            </span>

            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              style={{ padding: "10px 16px", fontSize: 13 }}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn btn-emerald"
              disabled={!isValidNumber || currentQty <= 0 || exceedsStock}
              style={{
                padding: "10px 22px",
                fontSize: 14,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 8,
                background:
                  !isValidNumber || currentQty <= 0 || exceedsStock
                    ? "#e2e8f0"
                    : "#10b981",
                color:
                  !isValidNumber || currentQty <= 0 || exceedsStock
                    ? "#94a3b8"
                    : "#ffffff",
                boxShadow:
                  !isValidNumber || currentQty <= 0 || exceedsStock
                    ? "none"
                    : "0 4px 14px rgba(16, 185, 129, 0.35)",
              }}
            >
              <span>✓</span>
              <span>Add to Cart ({fmt(lineTotal)})</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
