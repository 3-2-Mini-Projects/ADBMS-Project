"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCashier, ManagerUser } from "@/lib/cashierContext";
import { useApp } from "@/lib/context";
import ManagerAuthModal from "@/components/ManagerAuthModal";
import PrintableRefundSlip, { RefundSlipData } from "@/components/PrintableRefundSlip";

interface SaleItemReturnInfo {
  sale_item_id: number;
  product_id: number;
  product_name: string;
  barcode: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  line_total: number;
  returned_quantity: number;
  remaining_returnable_qty: number;
}

interface SaleData {
  sale_id: number;
  receipt_number: string;
  branch_name: string;
  branch_code?: string;
  cashier_name: string;
  customer_name?: string | null;
  customer_card?: string | null;
  sale_date: string;
  status: string;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  total_amount: number;
  items: SaleItemReturnInfo[];
}

function ReturnsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSaleId = searchParams.get("saleId");
  const preItemId = searchParams.get("itemId");

  const { cashier } = useCashier();
  const { authenticatedUser } = useApp();
  const activeEmployeeId = cashier?.employee_id || authenticatedUser?.employee_id;

  const [saleSearch, setSaleSearch] = useState(preSaleId || "");
  const [sale, setSale] = useState<SaleData | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  // Recent sales for quick 1-click lookup
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  // Return selection form
  const [selectedItemId, setSelectedItemId] = useState<number | null>(
    preItemId ? Number(preItemId) : null
  );
  const [returnQty, setReturnQty] = useState<number>(1);
  const [returnReason, setReturnReason] = useState("Damaged product packaging");
  const [customReason, setCustomReason] = useState("");
  const [refundMethod, setRefundMethod] = useState<"CASH" | "CARD" | "STORE_CREDIT">("CASH");
  const [restockInventory, setRestockInventory] = useState(true);

  // Manager Approval Modal
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [processedReturn, setProcessedReturn] = useState<RefundSlipData | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Fetch recent sales for quick lookup
  useEffect(() => {
    const fetchRecentSales = async () => {
      setLoadingRecent(true);
      try {
        const branchParam = cashier?.branch_id ? `&branchId=${cashier.branch_id}` : "";
        const res = await fetch(`/api/cashier/sales?pageSize=5&status=COMPLETED${branchParam}`);
        const data = await res.json();
        if (data.sales && Array.isArray(data.sales)) {
          setRecentSales(data.sales);
        }
      } catch (err) {
        console.warn("Failed to load recent sales:", err);
      } finally {
        setLoadingRecent(false);
      }
    };
    fetchRecentSales();
  }, [cashier?.branch_id]);

  const fetchSale = async (queryInput: string) => {
    const cleanQuery = queryInput.trim();
    if (!cleanQuery) return;

    setSearching(true);
    setSearchError("");
    setSale(null);
    setProcessedReturn(null);

    try {
      const res = await fetch(`/api/cashier/sales/${encodeURIComponent(cleanQuery)}`);
      const data = await res.json();
      if (data.sale_id) {
        if (data.status === "CANCELLED") {
          setSearchError(`Sale #${data.sale_id} (${data.receipt_number}) was voided/cancelled. Returns cannot be processed.`);
          return;
        }
        setSale(data);
        if (preItemId) {
          setSelectedItemId(Number(preItemId));
        } else if (data.items && data.items.length > 0) {
          const firstEligible = data.items.find((i: SaleItemReturnInfo) => Number(i.remaining_returnable_qty) > 0);
          if (firstEligible) setSelectedItemId(firstEligible.sale_item_id);
        }
      } else {
        setSearchError(data.error || "Sale not found");
      }
    } catch {
      setSearchError("Failed to lookup sale. Please verify network connection or receipt number.");
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (preSaleId) {
      fetchSale(preSaleId);
    }
  }, [preSaleId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSale(saleSearch);
  };

  const selectedItem = sale?.items.find((i) => i.sale_item_id === selectedItemId);

  // Calculate tax ratio if VAT was applied on sale
  const saleSubtotal = Number(sale?.subtotal || 0);
  const saleTax = Number(sale?.tax_total || 0);
  const taxRatio = saleSubtotal > 0 && saleTax > 0 ? (saleTax / saleSubtotal) : 0;

  // Calculate refund amount (effective price after item discount, plus proportional tax)
  const itemNetPrice = selectedItem
    ? Math.max(0, Number(selectedItem.unit_price) - (Number(selectedItem.discount_amount || 0) / Number(selectedItem.quantity || 1)))
    : 0;

  const calculatedRefund = selectedItem
    ? Number((itemNetPrice * (1 + taxRatio) * returnQty).toFixed(2))
    : 0;

  // Sync returnQty within bounds when selectedItem changes
  useEffect(() => {
    if (selectedItem) {
      const maxAvailable = Number(selectedItem.remaining_returnable_qty || 0);
      setReturnQty((prev) => Math.max(1, Math.min(prev, Math.max(1, maxAvailable))));
    }
  }, [selectedItemId, selectedItem]);

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) {
      alert("Please select an eligible item to return.");
      return;
    }
    const maxQty = Number(selectedItem.remaining_returnable_qty || 0);
    if (returnQty <= 0 || returnQty > maxQty) {
      alert(`Invalid quantity. Maximum returnable units: ${maxQty}`);
      return;
    }
    // Prompt Manager Authorization Modal
    setShowManagerModal(true);
  };

  const executeReturn = async (mgr: ManagerUser, pin: string) => {
    const empId = activeEmployeeId;
    if (!empId) {
      alert("No active cashier session found. Please sign in.");
      return;
    }
    if (!selectedItem) return;

    setSubmitting(true);
    try {
      const finalReason = returnReason === "Other" ? customReason : returnReason;

      const res = await fetch("/api/cashier/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saleItemId: selectedItem.sale_item_id,
          quantity: returnQty,
          reason: finalReason || "Returned product",
          refundMethod,
          cashierId: empId,
          managerId: mgr.employee_id,
          managerPin: pin || "1234",
          restockInventory,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const record = data.returnRecord;
        setProcessedReturn({
          ...record,
          customerName: sale?.customer_name || null,
        });
        setShowPrintModal(true);
        // Refresh sale details to show updated remaining quantities & return history
        if (sale) fetchSale(String(sale.sale_id));
      } else {
        alert("Return failed: " + data.error);
      }
    } catch (err: any) {
      alert("Error processing return: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (n: number | string) =>
    `Rs. ${Number(n || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          {/* Back Navigation Button */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <button
              type="button"
              onClick={() => {
                if (preSaleId || sale?.sale_id) {
                  router.push(`/cashier/history/${preSaleId || sale?.sale_id}`);
                } else if (typeof window !== "undefined" && window.history.length > 1) {
                  router.back();
                } else {
                  router.push("/cashier/history");
                }
              }}
              className="btn btn-ghost"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 12px",
                fontSize: 12,
                fontWeight: 700,
                color: "var(--accent-blue)",
                background: "rgba(56, 189, 248, 0.08)",
                border: "1px solid rgba(56, 189, 248, 0.25)",
                borderRadius: 8,
                cursor: "pointer",
              }}
              title="Return to the previous page"
            >
              ← Back to {preSaleId || sale?.sale_id ? `Sale #${preSaleId || sale?.sale_id}` : "Previous Page"}
            </button>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>/</span>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Returns &amp; Customer Refunds</span>
          </div>

          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
            ↩️ Returns &amp; Customer Refunds
          </h1>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            Audit-trailed return terminal with manager authorization, conditional inventory restock, and customer credit slip issuance
          </p>
        </div>

        {/* Quick Action Navigation */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {(preSaleId || sale?.sale_id) && (
            <Link
              href={`/cashier/history/${preSaleId || sale?.sale_id}`}
              className="btn btn-secondary"
              style={{ padding: "6px 14px", fontSize: 12 }}
            >
              🧾 Sale #{preSaleId || sale?.sale_id} Details
            </Link>
          )}
          <Link
            href="/cashier/history"
            className="btn btn-ghost"
            style={{ padding: "6px 14px", fontSize: 12 }}
          >
            📋 All Transactions
          </Link>
        </div>
      </div>

      {/* Step 1: Search Sale */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 20,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 10 }}>
          Step 1: Locate Original Completed Sale
        </div>

        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: 10, maxWidth: 560, flexWrap: "wrap" }}>
          <input
            type="text"
            className="input"
            placeholder="Enter Receipt # or Sale ID (e.g. REC-BR03-000072, 72)..."
            value={saleSearch}
            onChange={(e) => setSaleSearch(e.target.value)}
            style={{ flex: 1, minWidth: 260 }}
          />
          <button type="submit" className="btn btn-primary" disabled={searching}>
            {searching ? "Searching..." : "🔍 Find Sale"}
          </button>
        </form>

        {/* Quick Lookup Chips */}
        {recentSales.length > 0 && !sale && (
          <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>Recent Completed Sales:</span>
            {recentSales.map((s) => (
              <button
                key={s.sale_id}
                type="button"
                onClick={() => {
                  setSaleSearch(s.receipt_number || String(s.sale_id));
                  fetchSale(String(s.sale_id));
                }}
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  padding: "4px 8px",
                  fontSize: 11,
                  color: "var(--accent-blue)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span>🧾 {s.receipt_number}</span>
                <span style={{ color: "var(--text-muted)", fontSize: 10 }}>({fmt(s.total_amount)})</span>
              </button>
            ))}
          </div>
        )}

        {searchError && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 14px",
              borderRadius: 8,
              background: "rgba(248, 81, 73, 0.15)",
              color: "var(--accent-rose)",
              fontSize: 12.5,
              border: "1px solid rgba(248, 81, 73, 0.3)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>⚠️</span>
            <span>{searchError}</span>
          </div>
        )}
      </div>

      {/* Step 2: Sale Found Details & Items Selection */}
      {sale && (
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20 }}>
          {/* Sale Items Table */}
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: "var(--text-primary)" }}>
                  Receipt #{sale.receipt_number}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
                  Processed at <strong>{sale.branch_name}</strong> by {sale.cashier_name} on{" "}
                  {new Date(sale.sale_date).toLocaleDateString("en-LK")}
                  {sale.customer_name ? ` • Customer: ${sale.customer_name}` : ""}
                </div>
              </div>
              <span className="badge badge-completed">{sale.status}</span>
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8 }}>
              Select Item to Return:
            </div>

            <div className="table-wrapper" style={{ flex: 1 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Select</th>
                    <th>Product</th>
                    <th style={{ textAlign: "center" }}>Sold</th>
                    <th style={{ textAlign: "center" }}>Ret.</th>
                    <th style={{ textAlign: "center" }}>Eligible</th>
                    <th style={{ textAlign: "right" }}>Net Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.items.map((item) => {
                    const isSelected = selectedItemId === item.sale_item_id;
                    const canReturn = Number(item.remaining_returnable_qty) > 0;
                    const netPrice = item.unit_price - (Number(item.discount_amount || 0) / Number(item.quantity || 1));
                    return (
                      <tr
                        key={item.sale_item_id}
                        onClick={() => canReturn && setSelectedItemId(item.sale_item_id)}
                        style={{
                          cursor: canReturn ? "pointer" : "not-allowed",
                          background: isSelected ? "rgba(88, 166, 255, 0.12)" : undefined,
                        }}
                      >
                        <td>
                          <input
                            type="radio"
                            name="returnItem"
                            checked={isSelected}
                            disabled={!canReturn}
                            onChange={() => setSelectedItemId(item.sale_item_id)}
                          />
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.product_name}</div>
                          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{item.barcode}</div>
                        </td>
                        <td style={{ textAlign: "center" }}>{item.quantity}</td>
                        <td style={{ textAlign: "center", color: item.returned_quantity > 0 ? "var(--accent-rose)" : "inherit" }}>
                          {item.returned_quantity}
                        </td>
                        <td style={{ textAlign: "center", fontWeight: 700, color: canReturn ? "var(--accent-emerald)" : "var(--text-muted)" }}>
                          {item.remaining_returnable_qty}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>
                          {fmt(netPrice)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Sale Summary Footer */}
            <div
              style={{
                marginTop: 12,
                padding: "8px 12px",
                borderRadius: 8,
                background: "var(--bg-surface)",
                fontSize: 11,
                color: "var(--text-muted)",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>Subtotal: {fmt(sale.subtotal)} | Tax: {fmt(sale.tax_total)}</span>
              <span>Total Paid: <strong style={{ color: "var(--text-primary)" }}>{fmt(sale.total_amount)}</strong></span>
            </div>
          </div>

          {/* Return Execution Form */}
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
            {selectedItem ? (
              <form onSubmit={handleReturnSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "var(--text-primary)" }}>
                  Step 2: Return Details &amp; Refund Calculation
                </div>

                <div
                  style={{
                    padding: "10px 14px",
                    background: "var(--bg-surface)",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                  }}
                >
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Selected Product</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>
                    {selectedItem.product_name}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
                    Remaining Returnable Units: <strong>{selectedItem.remaining_returnable_qty}</strong>
                  </div>
                </div>

                {/* Quantity Input */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                    Quantity to Return (Max {selectedItem.remaining_returnable_qty})
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={selectedItem.remaining_returnable_qty}
                    className="input"
                    value={returnQty}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      const maxAllowed = Number(selectedItem.remaining_returnable_qty || 1);
                      setReturnQty(Math.max(1, Math.min(maxAllowed, val)));
                    }}
                    required
                  />
                </div>

                {/* Return Reason */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                    Reason for Return
                  </label>
                  <select
                    className="input"
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                  >
                    <option value="Damaged product packaging">Damaged product packaging</option>
                    <option value="Expired or near expiry">Expired or near expiry</option>
                    <option value="Wrong item purchased by customer">Wrong item purchased by customer</option>
                    <option value="Defective / Quality issue">Defective / Quality issue</option>
                    <option value="Customer change of mind">Customer change of mind</option>
                    <option value="Other">Other (specify below)</option>
                  </select>
                </div>

                {returnReason === "Other" && (
                  <input
                    type="text"
                    className="input"
                    placeholder="Enter custom return reason..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    required
                  />
                )}

                {/* Refund Method Selection */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                    Refund Payout Method
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setRefundMethod("CASH")}
                      style={{
                        padding: "8px 6px",
                        fontSize: 12,
                        fontWeight: 600,
                        borderRadius: 8,
                        border: refundMethod === "CASH" ? "2px solid var(--accent-emerald)" : "1px solid var(--border)",
                        background: refundMethod === "CASH" ? "rgba(16, 185, 129, 0.12)" : "var(--bg-surface)",
                        color: refundMethod === "CASH" ? "var(--accent-emerald)" : "var(--text-secondary)",
                        cursor: "pointer",
                      }}
                    >
                      💵 Cash Drawer
                    </button>
                    <button
                      type="button"
                      onClick={() => setRefundMethod("CARD")}
                      style={{
                        padding: "8px 6px",
                        fontSize: 12,
                        fontWeight: 600,
                        borderRadius: 8,
                        border: refundMethod === "CARD" ? "2px solid var(--accent-blue)" : "1px solid var(--border)",
                        background: refundMethod === "CARD" ? "rgba(56, 189, 248, 0.12)" : "var(--bg-surface)",
                        color: refundMethod === "CARD" ? "var(--accent-blue)" : "var(--text-secondary)",
                        cursor: "pointer",
                      }}
                    >
                      💳 Card Reversal
                    </button>
                    <button
                      type="button"
                      onClick={() => setRefundMethod("STORE_CREDIT")}
                      style={{
                        padding: "8px 6px",
                        fontSize: 12,
                        fontWeight: 600,
                        borderRadius: 8,
                        border: refundMethod === "STORE_CREDIT" ? "2px solid var(--accent-purple)" : "1px solid var(--border)",
                        background: refundMethod === "STORE_CREDIT" ? "rgba(168, 85, 247, 0.12)" : "var(--bg-surface)",
                        color: refundMethod === "STORE_CREDIT" ? "var(--accent-purple)" : "var(--text-secondary)",
                        cursor: "pointer",
                      }}
                    >
                      🎫 Store Credit
                    </button>
                  </div>
                </div>

                {/* Restock to shelf checkbox */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 12px",
                    background: "var(--bg-surface)",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                  }}
                >
                  <input
                    type="checkbox"
                    id="restockCheck"
                    checked={restockInventory}
                    onChange={(e) => setRestockInventory(e.target.checked)}
                  />
                  <label htmlFor="restockCheck" style={{ fontSize: 12, cursor: "pointer", color: "var(--text-primary)" }}>
                    <strong>Restock to Inventory:</strong> Product is undamaged and approved for resale
                  </label>
                </div>

                {/* Refund Total Box */}
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: 10,
                    background: "rgba(248, 81, 73, 0.1)",
                    border: "1px solid rgba(248, 81, 73, 0.25)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Total Customer Refund</div>
                    <div style={{ fontSize: 10.5, color: "var(--text-secondary)" }}>
                      {refundMethod === "CASH" ? "Handed in cash from register" : refundMethod === "CARD" ? "Card reversal" : "Issued as credit note"}
                      {taxRatio > 0 ? " (includes tax)" : ""}
                    </div>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "var(--accent-rose)" }}>
                    {fmt(calculatedRefund)}
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: "12px 18px", fontSize: 14, justifyContent: "center" }}
                  disabled={submitting}
                >
                  🛡️ Request Manager Approval &amp; Process Refund
                </button>
              </form>
            ) : (
              <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                Select an eligible item on the left to initiate the return.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Return Success Credit Slip Receipt Banner */}
      {processedReturn && (
        <div
          style={{
            background: "rgba(16, 185, 129, 0.1)",
            border: "1px solid var(--accent-emerald)",
            borderRadius: 14,
            padding: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 22 }}>✅</span>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--accent-emerald)" }}>
                Return Note #RET-{String(processedReturn.returnId).padStart(6, "0")} Processed Successfully!
              </h3>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-primary)", marginTop: 6 }}>
              Refunded <strong>{fmt(processedReturn.refundAmount)}</strong> via <strong>{processedReturn.refundMethod}</strong> for{" "}
              {processedReturn.quantity}× {processedReturn.productName}
            </p>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
              Authorized by: <strong>{processedReturn.managerName}</strong> • Restocked:{" "}
              {processedReturn.restocked ? "Yes (Inventory updated)" : "No (Written off / Damaged)"}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-primary" onClick={() => setShowPrintModal(true)}>
              🖨️ View &amp; Print Refund Slip
            </button>
            <Link href="/cashier/history" className="btn btn-ghost">
              📋 All Transactions
            </Link>
          </div>
        </div>
      )}

      {/* Manager Approval Modal */}
      <ManagerAuthModal
        isOpen={showManagerModal}
        title="Manager Approval: Authorize Customer Refund"
        description={`Authorizing refund of ${fmt(calculatedRefund)} via ${refundMethod} for ${returnQty}× ${selectedItem?.product_name}.`}
        onClose={() => setShowManagerModal(false)}
        onSuccess={(mgr, pin) => {
          executeReturn(mgr, pin);
        }}
      />

      {/* Printable Refund Credit Note Modal */}
      {showPrintModal && processedReturn && (
        <PrintableRefundSlip
          refund={processedReturn}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
}

export default function ReturnsRefundsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading returns module...</div>}>
      <ReturnsContent />
    </Suspense>
  );
}
