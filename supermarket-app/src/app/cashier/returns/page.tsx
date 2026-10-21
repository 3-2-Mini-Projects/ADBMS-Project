"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCashier, ManagerUser } from "@/lib/cashierContext";
import ManagerAuthModal from "@/components/ManagerAuthModal";

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
  cashier_name: string;
  customer_name?: string | null;
  sale_date: string;
  status: string;
  total_amount: number;
  items: SaleItemReturnInfo[];
}

interface ProcessedReturnRecord {
  returnId: number;
  saleId: number;
  productName: string;
  barcode: string;
  quantity: number;
  refundAmount: number;
  restocked: boolean;
  managerName: string;
}

function ReturnsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSaleId = searchParams.get("saleId");
  const preItemId = searchParams.get("itemId");

  const { cashier } = useCashier();

  const [saleSearch, setSaleSearch] = useState(preSaleId || "");
  const [sale, setSale] = useState<SaleData | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  // Return selection form
  const [selectedItemId, setSelectedItemId] = useState<number | null>(
    preItemId ? Number(preItemId) : null
  );
  const [returnQty, setReturnQty] = useState<number>(1);
  const [returnReason, setReturnReason] = useState("Damaged product packaging");
  const [customReason, setCustomReason] = useState("");
  const [restockInventory, setRestockInventory] = useState(true);

  // Manager Approval Modal
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [processedReturn, setProcessedReturn] = useState<ProcessedReturnRecord | null>(null);

  const fetchSale = async (id: string) => {
    const cleanId = id.replace(/\D/g, "");
    if (!cleanId) return;

    setSearching(true);
    setSearchError("");
    setSale(null);
    setProcessedReturn(null);

    try {
      const res = await fetch(`/api/cashier/sales/${cleanId}`);
      const data = await res.json();
      if (data.sale_id) {
        if (data.status === "CANCELLED") {
          setSearchError(`Sale #${data.sale_id} has been voided/cancelled. Returns cannot be processed.`);
          return;
        }
        setSale(data);
        if (preItemId) {
          setSelectedItemId(Number(preItemId));
        } else if (data.items && data.items.length > 0) {
          const firstEligible = data.items.find((i: SaleItemReturnInfo) => i.remaining_returnable_qty > 0);
          if (firstEligible) setSelectedItemId(firstEligible.sale_item_id);
        }
      } else {
        setSearchError(data.error || "Sale not found");
      }
    } catch {
      setSearchError("Failed to lookup sale");
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

  // Calculate refund amount
  const calculatedRefund = selectedItem
    ? Number(
        (
          (selectedItem.unit_price - selectedItem.discount_amount / selectedItem.quantity) *
          returnQty
        ).toFixed(2)
      )
    : 0;

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) {
      alert("Please select an item to return.");
      return;
    }
    if (returnQty <= 0 || returnQty > selectedItem.remaining_returnable_qty) {
      alert(`Invalid quantity. Maximum returnable units: ${selectedItem.remaining_returnable_qty}`);
      return;
    }
    // Prompt Manager Authorization Modal
    setShowManagerModal(true);
  };

  const executeReturn = async (mgr: ManagerUser) => {
    if (!cashier || !selectedItem) return;
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
          cashierId: cashier.employee_id,
          managerId: mgr.employee_id,
          managerPin: "1234",
          restockInventory,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setProcessedReturn(data.returnRecord);
        // Refresh sale details
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
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Returns & Customer Refunds</span>
          </div>

          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
            ↩️ Returns & Customer Refunds
          </h1>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            Audit-trailed return terminal with manager authorization and conditional inventory restock
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

        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: 10, maxWidth: 500 }}>
          <input
            type="text"
            className="input"
            placeholder="Enter Receipt # or Sale ID (e.g. 1, 2, REC-BR01-000001)..."
            value={saleSearch}
            onChange={(e) => setSaleSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={searching}>
            {searching ? "Searching..." : "Find Sale"}
          </button>
        </form>

        {searchError && (
          <div
            style={{
              marginTop: 12,
              padding: "8px 12px",
              borderRadius: 8,
              background: "rgba(248, 81, 73, 0.15)",
              color: "var(--accent-rose)",
              fontSize: 12,
            }}
          >
            ⚠️ {searchError}
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
                <div style={{ fontWeight: 800, fontSize: 15, color: "var(--text-primary)" }}>
                  Receipt #{sale.receipt_number}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  Processed at {sale.branch_name} on {new Date(sale.sale_date).toLocaleDateString("en-LK")}
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
                    <th style={{ textAlign: "right" }}>Net Price</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.items.map((item) => {
                    const isSelected = selectedItemId === item.sale_item_id;
                    const canReturn = item.remaining_returnable_qty > 0;
                    return (
                      <tr
                        key={item.sale_item_id}
                        onClick={() => canReturn && setSelectedItemId(item.sale_item_id)}
                        style={{
                          cursor: canReturn ? "pointer" : "not-allowed",
                          background: isSelected ? "rgba(88, 166, 255, 0.08)" : undefined,
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
                          {fmt(item.unit_price - item.discount_amount / item.quantity)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
                  Step 2: Return Details & Refund Calculation
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
                  <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
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
                    onChange={(e) => setReturnQty(Math.max(1, Math.min(selectedItem.remaining_returnable_qty, Number(e.target.value))))}
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

                {/* Restock to shelf checkbox */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 12px",
                    background: "rgba(255, 255, 255, 0.02)",
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
                    <strong>Restock to Inventory:</strong> Item is undamaged and approved for resale
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
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Total Refund Amount</div>
                    <div style={{ fontSize: 10.5, color: "var(--text-secondary)" }}>
                      Cash or original payment refund
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
                  🛡️ Request Manager Approval & Process Refund
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

      {/* Return Success Credit Slip Receipt */}
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
                Return #{processedReturn.returnId} Processed Successfully!
              </h3>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-primary)", marginTop: 6 }}>
              Refunded <strong>{fmt(processedReturn.refundAmount)}</strong> for {processedReturn.quantity}×{" "}
              {processedReturn.productName}
            </p>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              Authorized by Manager: <strong>{processedReturn.managerName}</strong> • Restocked:{" "}
              {processedReturn.restocked ? "Yes (Inventory updated)" : "No (Written off / Damaged)"}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-primary" onClick={() => window.print()}>
              🖨️ Print Refund Credit Slip
            </button>
            <Link href="/cashier/history" className="btn btn-ghost">
              View History
            </Link>
          </div>
        </div>
      )}

      {/* Manager Approval Modal */}
      <ManagerAuthModal
        isOpen={showManagerModal}
        title="Manager Approval: Authorize Customer Refund"
        description={`Authorizing refund of ${fmt(calculatedRefund)} for ${returnQty}× ${selectedItem?.product_name}.`}
        onClose={() => setShowManagerModal(false)}
        onSuccess={(mgr) => {
          executeReturn(mgr);
        }}
      />
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
