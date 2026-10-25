"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useApp } from "@/lib/context";
import { PurchaseOrder } from "@/lib/types";
import {
  FileSpreadsheet,
  Plus,
  Truck,
  CheckCircle2,
  Calendar,
  DollarSign,
  PackageCheck,
  Sparkles,
  X,
  Layers,
  Search,
  Filter,
  Send,
  AlertTriangle,
  ArrowLeftRight,
} from "lucide-react";

export default function PurchasesPage() {
  const { currentBranch, showToast, currentEmployee } = useApp();
  const isClerk = currentEmployee?.role === "STOCK_CLERK";

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "RECEIVED">("ALL");

  // Create PO Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [poItems, setPoItems] = useState<{ product_id: string; quantity: number; unit_cost: number }[]>([
    { product_id: "", quantity: 50, unit_cost: 200 },
  ]);
  const [isCreating, setIsCreating] = useState(false);

  // Receive PO Modal State
  interface ReceivingItemState {
    po_item_id: number;
    product_id: number;
    product_name: string;
    ordered_qty: number;
    received_quantity: number;
    damaged_quantity: number;
    discrepancy_reason: string;
    discrepancy_notes: string;
    batch_no: string;
    expiry_date: string;
    unit_cost: number;
  }

  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [batchExpiryDate, setBatchExpiryDate] = useState("");
  const [receivingItems, setReceivingItems] = useState<ReceivingItemState[]>([]);
  const [isReceiving, setIsReceiving] = useState(false);
  const [poDetails, setPoDetails] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (selectedPO) {
      setLoadingDetails(true);
      fetch(`/api/purchases/${selectedPO.po_id}`)
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d)) {
            setPoDetails(d);
            const defaultExp = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
            const mapped: ReceivingItemState[] = d.map((it: any) => ({
              po_item_id: it.po_item_id || it.product_id,
              product_id: it.product_id,
              product_name: it.product_name,
              ordered_qty: Number(it.ordered_qty || 0),
              received_quantity: Number(it.ordered_qty || 0),
              damaged_quantity: 0,
              discrepancy_reason: "NONE",
              discrepancy_notes: "",
              batch_no: `BATCH-${selectedPO.po_number || selectedPO.po_id}-${it.po_item_id || it.product_id}`,
              expiry_date: defaultExp,
              unit_cost: Number(it.unit_cost || 0),
            }));
            setReceivingItems(mapped);
          }
        })
        .catch(() => {
          setPoDetails([]);
          setReceivingItems([]);
        })
        .finally(() => setLoadingDetails(false));
    }
  }, [selectedPO]);

  useEffect(() => {
    setBatchExpiryDate(
      new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    );
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/purchases");
      const data = await res.json();
      if (Array.isArray(data)) setOrders(data);
    } catch (err) {
      console.error("Error fetching purchases:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetch("/api/suppliers")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setSuppliers(d));
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setProducts(d));
  }, []);

  const handleAddItemRow = () => {
    setPoItems([...poItems, { product_id: "", quantity: 20, unit_cost: 150 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    setPoItems(poItems.filter((_, i) => i !== index));
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !currentBranch) return;
    setIsCreating(true);
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_id: Number(supplierId),
          branch_id: currentBranch.branch_id,
          expected_date: expectedDate || null,
          created_by: currentEmployee?.employee_id || 1,
          items: poItems.filter((it) => it.product_id),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Purchase Order ${data.po_number} created!`, "success");
        setCreateModalOpen(false);
        // Reset form
        setSupplierId("");
        setExpectedDate("");
        setPoItems([{ product_id: "", quantity: 50, unit_cost: 200 }]);
        fetchOrders();
      } else {
        showToast(data.error || "Failed to create PO", "error");
      }
    } catch {
      showToast("Error creating purchase order", "error");
    } finally {
      setIsCreating(false);
    }
  };

  const handleApplyGlobalExpiry = (exp: string) => {
    setBatchExpiryDate(exp);
    setReceivingItems((prev) =>
      prev.map((item) => ({ ...item, expiry_date: exp }))
    );
  };

  const handleUpdateReceivingItem = (index: number, field: keyof ReceivingItemState, value: any) => {
    setReceivingItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleReceivePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO) return;
    setIsReceiving(true);
    try {
      const payloadItems = receivingItems.map((item) => ({
        po_item_id: item.po_item_id,
        product_id: item.product_id,
        received_quantity: Number(item.received_quantity || 0),
        damaged_quantity: Number(item.damaged_quantity || 0),
        discrepancy_reason: item.discrepancy_reason,
        discrepancy_notes: item.discrepancy_notes,
        batch_no: item.batch_no,
        expiry_date: item.expiry_date,
      }));

      const res = await fetch(`/api/purchases/${selectedPO.po_id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expiry_date: batchExpiryDate,
          received_by: currentEmployee?.employee_id || 1,
          items: payloadItems,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.has_discrepancy && Number(data.total_claim_amount) > 0) {
          showToast(
            `PO ${selectedPO.po_number} received! Discrepancy logged: Claim Rs. ${Number(data.total_claim_amount).toFixed(2)} against supplier.`,
            "info"
          );
        } else if (data.has_discrepancy) {
          showToast(
            `PO ${selectedPO.po_number} received! Shortages noted & logged in audit.`,
            "info"
          );
        } else {
          showToast(`PO ${selectedPO.po_number} received! Stock & individual batches updated.`, "success");
        }
        setReceiveModalOpen(false);
        fetchOrders();
      } else {
        showToast(data.error || "Failed to receive PO", "error");
        if (data.error && data.error.toLowerCase().includes("already been received")) {
          setReceiveModalOpen(false);
          fetchOrders();
        }
      }
    } catch {
      showToast("Error receiving purchase order", "error");
    } finally {
      setIsReceiving(false);
    }
  };

  const handleSendToSupplier = async (poId: number) => {
    try {
      const res = await fetch(`/api/purchases/${poId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SENT" }),
      });
      if (res.ok) {
        showToast("Purchase order marked as SENT to supplier! Awaiting delivery.", "success");
        fetchOrders();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to update status", "error");
      }
    } catch {
      showToast("Network error updating status", "error");
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") === "pending") {
        setStatusFilter("PENDING");
      }
    }
  }, []);

  const isPendingStatus = (st: string) => {
    const s = (st || "").toUpperCase();
    return s !== "RECEIVED" && s !== "CANCELLED";
  };

  const filteredOrders = orders.filter((po) => {
    const sName = po.supplier_name || "";
    const bName = po.branch_name || "";
    const matchesSearch =
      po.po_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "PENDING" && isPendingStatus(po.status)) ||
      (statusFilter === "RECEIVED" && po.status.toUpperCase() === "RECEIVED");
    return matchesSearch && matchesStatus;
  });

  const theme = {
    wrapper: "space-y-6 pb-12 animate-in fade-in duration-300 text-slate-900",
    title: "text-2xl font-black text-slate-900 flex items-center gap-2.5",
    subtitle: "text-xs text-slate-500 mt-1",
    searchBox: "w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 font-mono shadow-xs focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all",
    searchIcon: "text-slate-400",
    filterBtnInactive: "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 shadow-xs",
    filterBtnActive: "bg-blue-50 border border-blue-500 text-blue-700 font-bold shadow-xs",
    tableCard: "bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs",
    thead: "border-b border-slate-200 bg-slate-50 text-slate-600 uppercase text-[11px] font-semibold tracking-wider",
    tbodyDivide: "divide-y divide-slate-100",
    rowHover: "hover:bg-slate-50/70 transition-colors",
    poNumber: "text-blue-600 font-mono font-bold",
    supplierName: "text-slate-900 font-semibold",
    branchText: "text-slate-600",
    dateText: "text-slate-500 font-mono",
    itemCount: "text-slate-700 font-mono",
    costText: "text-emerald-700 font-mono font-bold",
    badgeReceived: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    badgePending: "bg-amber-50 text-amber-700 border border-amber-200",
    badgeCancelled: "bg-rose-50 text-rose-700 border border-rose-200",
    badgeOther: "bg-blue-50 text-blue-700 border border-blue-200",
    fulfilledText: "text-emerald-700 font-semibold",
    cancelledText: "text-slate-400 italic",
    emptyText: "text-slate-500",
    modalOverlay: "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200",
    modalCardSmall: "bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-slate-900",
    modalCardLarge: "bg-white border border-slate-200 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-slate-900",
    modalCardReceive: "bg-white border border-slate-200 rounded-2xl w-full max-w-5xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-slate-900",
    modalHeaderBorder: "border-slate-100",
    modalTitle: "text-slate-900 font-bold text-sm flex items-center gap-2",
    modalCloseBtn: "text-slate-400 hover:text-slate-700",
    modalInfoBox: "bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1 text-slate-700",
    modalInfoStrong: "text-slate-900 font-semibold",
    modalInfoDesc: "text-slate-500 text-[11px] pt-1",
    modalLabel: "text-xs font-semibold text-slate-700 block mb-1",
    modalInput: "w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-mono text-xs text-slate-900 shadow-xs focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100",
    modalSelect: "w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 shadow-xs focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100",
    modalItemRow: "flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200",
    modalItemSelect: "flex-1 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 shadow-xs focus:outline-none focus:border-blue-600",
    modalItemInput: "px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-mono text-slate-900 shadow-xs focus:outline-none focus:border-blue-600",
    modalItemRemoveBtn: "text-slate-400 hover:text-rose-600 p-1",
    modalFooterBorder: "border-t border-slate-100",
    modalCancelBtn: "w-1/3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors",
  };

  return (
    <div className={theme.wrapper}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className={theme.title}>
            <FileSpreadsheet className="w-6 h-6 text-blue-600" />
            <span>Purchase Orders &amp; Supplier Inflow</span>
          </h1>
          <p className={theme.subtitle}>
            Generate replenishment purchase orders and receive stock into branch inventory &amp; product batches.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/inventory/transfers"
            className="px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-xs bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeftRight className="w-4 h-4 text-blue-600" />
            <span>Stock Transfers</span>
          </Link>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center gap-2 transition-all shrink-0 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Purchase Order</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className={`w-4 h-4 absolute left-3 top-3 ${theme.searchIcon}`} />
          <input
            type="text"
            placeholder="Search by PO number, supplier, or branch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={theme.searchBox}
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-2 rounded-xl text-xs transition-all ${
              statusFilter === "ALL" ? theme.filterBtnActive : theme.filterBtnInactive
            }`}
          >
            All Orders ({orders.length})
          </button>
          <button
            onClick={() => setStatusFilter("PENDING")}
            className={`px-3 py-2 rounded-xl text-xs transition-all ${
              statusFilter === "PENDING" ? theme.filterBtnActive : theme.filterBtnInactive
            }`}
          >
            Pending ({orders.filter((o) => isPendingStatus(o.status)).length})
          </button>
          <button
            onClick={() => setStatusFilter("RECEIVED")}
            className={`px-3 py-2 rounded-xl text-xs transition-all ${
              statusFilter === "RECEIVED" ? theme.filterBtnActive : theme.filterBtnInactive
            }`}
          >
            Received ({orders.filter((o) => o.status.toUpperCase() === "RECEIVED").length})
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className={theme.tableCard}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className={theme.thead}>
                <th className="py-3.5 px-4 font-semibold">PO Number</th>
                <th className="py-3.5 px-4 font-semibold">Supplier</th>
                <th className="py-3.5 px-4 font-semibold">Branch</th>
                <th className="py-3.5 px-4 font-semibold">Order Date</th>
                <th className="py-3.5 px-4 font-semibold">Expected Date</th>
                <th className="py-3.5 px-4 font-semibold text-center">Items</th>
                <th className="py-3.5 px-4 font-semibold text-right">Total Cost</th>
                <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                <th className="py-3.5 px-4 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className={theme.tbodyDivide}>
              {loading ? (
                <tr>
                  <td colSpan={9} className={`py-12 text-center ${theme.emptyText}`}>
                    <Sparkles className="w-5 h-5 animate-spin mx-auto text-teal-500 mb-2" />
                    Loading purchase orders...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className={`py-12 text-center ${theme.emptyText}`}>
                    No purchase orders found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((po) => (
                  <tr key={po.po_id} className={theme.rowHover}>
                    <td className={`py-3.5 px-4 ${theme.poNumber}`}>{po.po_number}</td>
                    <td className={`py-3.5 px-4 ${theme.supplierName}`}>{po.supplier_name}</td>
                    <td className={`py-3.5 px-4 ${theme.branchText}`}>{po.branch_name}</td>
                    <td className={`py-3.5 px-4 ${theme.dateText}`}>
                      {new Date(po.order_date).toLocaleDateString()}
                    </td>
                    <td className={`py-3.5 px-4 ${theme.dateText}`}>
                      {po.expected_date ? new Date(po.expected_date).toLocaleDateString() : "—"}
                    </td>
                    <td className={`py-3.5 px-4 text-center ${theme.itemCount}`}>
                      {(po as any).items_count ?? 0} lines
                    </td>
                    <td className={`py-3.5 px-4 text-right ${theme.costText}`}>
                      Rs. {Number((po as any).calculated_total_cost || po.total_cost || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`text-[10px] font-mono px-2.5 py-1 rounded-full font-bold ${
                          po.status.toUpperCase() === "RECEIVED"
                            ? theme.badgeReceived
                            : po.status.toUpperCase() === "SENT"
                            ? theme.badgeOther
                            : po.status.toUpperCase() === "DRAFT"
                            ? theme.badgePending
                            : theme.badgeCancelled
                        }`}
                      >
                        {po.status === "SENT" ? "SENT (In Transit)" : po.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {po.status.toUpperCase() === "RECEIVED" ? (
                        <span className={`text-[11px] font-medium flex items-center justify-center gap-1 ${theme.fulfilledText}`}>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Fulfilled</span>
                        </span>
                      ) : po.status.toUpperCase() === "CANCELLED" ? (
                        <span className={`text-[11px] font-medium ${theme.cancelledText}`}>
                          Cancelled
                        </span>
                      ) : po.status.toUpperCase() === "DRAFT" ? (
                        <button
                          onClick={() => handleSendToSupplier(po.po_id)}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[11px] transition-colors flex items-center gap-1 mx-auto shadow-sm"
                          title="Mark order as sent to supplier"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Send to Supplier</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedPO(po);
                            setReceiveModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold text-[11px] transition-colors flex items-center gap-1 mx-auto shadow-sm"
                          title="Supplier truck has arrived - inspect and receive goods into inventory"
                        >
                          <PackageCheck className="w-3.5 h-3.5" />
                          <span>Receive Goods</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Receive PO */}
      {receiveModalOpen && selectedPO && (
        <div className={theme.modalOverlay}>
          <div className={theme.modalCardReceive}>
            {/* Header */}
            <div className={`flex items-center justify-between pb-3 border-b ${theme.modalHeaderBorder}`}>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 border border-teal-500/20">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={theme.modalTitle}>
                    <span>Receive Goods: {selectedPO.po_number}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Verify delivered quantities, configure individual batch expiry dates, and commit into branch inventory.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReceiveModalOpen(false)}
                className={`p-1.5 rounded-lg ${theme.modalCloseBtn}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* PO Summary & Quick Expiry Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className={theme.modalInfoBox}>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Supplier:</span>
                  <strong className={theme.modalInfoStrong}>{selectedPO.supplier_name}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Receiving Branch:</span>
                  <strong className={theme.modalInfoStrong}>{selectedPO.branch_name}</strong>
                </div>
                <div className="flex justify-between items-center text-[11px] pt-0.5 border-t border-slate-200/50 dark:border-slate-800">
                  <span className="text-slate-400">Order Date:</span>
                  <span className="font-mono">{selectedPO.order_date ? new Date(selectedPO.order_date).toLocaleDateString() : "-"}</span>
                </div>
              </div>

              {/* Bulk Expiry Quick-Apply */}
              <div className={`${isClerk ? "bg-teal-50/60 border-teal-200" : "bg-teal-950/30 border-teal-800/60"} border p-3 rounded-xl flex flex-col justify-between text-xs`}>
                <div className="flex items-center gap-1.5 font-semibold text-teal-700 dark:text-teal-300">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Quick Apply Expiry Date to All Items</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="date"
                    value={batchExpiryDate}
                    onChange={(e) => setBatchExpiryDate(e.target.value)}
                    className={`${theme.modalInput} !py-1 text-xs`}
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyGlobalExpiry(batchExpiryDate)}
                    className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs whitespace-nowrap shadow-sm transition-all"
                  >
                    Apply to All
                  </button>
                </div>
              </div>
            </div>

            {/* Itemized Receiving Table Form */}
            <form onSubmit={handleReceivePO} className="space-y-4">
              <div className={`${isClerk ? "bg-slate-50 border-slate-200" : "bg-slate-950/70 border-slate-800"} border rounded-xl overflow-hidden`}>
                <div className={`px-4 py-2.5 font-semibold text-xs flex justify-between items-center border-b ${isClerk ? "bg-slate-100/80 border-slate-200 text-slate-700" : "bg-slate-900 border-slate-800 text-slate-300"}`}>
                  <span className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400 font-bold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Item-by-Item Batch & Delivery Discrepancy Details</span>
                  </span>
                  <span className="text-slate-500 font-mono text-[11px]">
                    {receivingItems.length} line items
                  </span>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className={`border-b text-[10px] font-bold uppercase tracking-wider ${isClerk ? "border-slate-200 bg-slate-100/50 text-slate-500" : "border-slate-800 bg-slate-900/50 text-slate-400"}`}>
                        <th className="py-2.5 px-3">Product</th>
                        <th className="py-2.5 px-2 text-center w-16">Ordered</th>
                        <th className="py-2.5 px-2 text-center w-28">Good (Stocked)</th>
                        <th className="py-2.5 px-2 text-center w-24">Damaged</th>
                        <th className="py-2.5 px-2 w-48">Discrepancy Reason</th>
                        <th className="py-2.5 px-2 w-32">Batch Code</th>
                        <th className="py-2.5 px-2 w-32">Expiry Date</th>
                        <th className="py-2.5 px-3 text-right">Status / Claim</th>
                      </tr>
                    </thead>
                    <tbody className={isClerk ? "divide-y divide-slate-100" : "divide-y divide-slate-800/50"}>
                      {loadingDetails ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                            <Sparkles className="w-5 h-5 mx-auto animate-spin mb-1 text-teal-500" />
                            Loading line items...
                          </td>
                        </tr>
                      ) : receivingItems.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-6 text-center text-slate-400 text-xs">
                            No items found in this purchase order.
                          </td>
                        </tr>
                      ) : (
                        receivingItems.map((item, idx) => {
                          const goodQty = Number(item.received_quantity || 0);
                          const damagedQty = Number(item.damaged_quantity || 0);
                          const totalAccounted = goodQty + damagedQty;
                          const shortage = Math.max(0, item.ordered_qty - totalAccounted);
                          const excess = Math.max(0, totalAccounted - item.ordered_qty);
                          const hasIssue = damagedQty > 0 || shortage > 0;
                          const lineClaim = (damagedQty + shortage) * item.unit_cost;

                          return (
                            <tr key={idx} className={isClerk ? "hover:bg-slate-50/80 transition-colors" : "hover:bg-slate-800/30 transition-colors"}>
                              {/* Product Info */}
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-slate-900 dark:text-white">
                                  {item.product_name}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  Rs. {Number(item.unit_cost).toFixed(2)} / unit
                                </div>
                              </td>

                              {/* Ordered Qty */}
                              <td className="py-2.5 px-2 text-center">
                                <span className="inline-block px-2 py-1 rounded-lg font-mono font-bold text-xs bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                  {item.ordered_qty}
                                </span>
                              </td>

                              {/* Good Received Qty (Stocked to Inventory) */}
                              <td className="py-2.5 px-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    required
                                    value={item.received_quantity}
                                    onChange={(e) =>
                                      handleUpdateReceivingItem(
                                        idx,
                                        "received_quantity",
                                        Math.max(0, Number(e.target.value))
                                      )
                                    }
                                    className={`w-16 text-center font-mono font-bold text-xs py-1 px-1.5 rounded-lg border ${
                                      shortage > 0
                                        ? "border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
                                        : isClerk
                                        ? "border-slate-300 bg-white text-slate-900 focus:border-teal-600"
                                        : "border-slate-700 bg-slate-900 text-white focus:border-teal-500"
                                    }`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleUpdateReceivingItem(idx, "received_quantity", item.ordered_qty);
                                      handleUpdateReceivingItem(idx, "damaged_quantity", 0);
                                      handleUpdateReceivingItem(idx, "discrepancy_reason", "NONE");
                                    }}
                                    title="Set full order quantity as good stock"
                                    className="px-1 py-1 text-[10px] rounded bg-slate-200 dark:bg-slate-800 hover:bg-teal-500 hover:text-white transition-colors"
                                  >
                                    All
                                  </button>
                                </div>
                              </td>

                              {/* Damaged / Rejected Qty (Not stocked) */}
                              <td className="py-2.5 px-2 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  value={item.damaged_quantity}
                                  onChange={(e) => {
                                    const val = Math.max(0, Number(e.target.value));
                                    handleUpdateReceivingItem(idx, "damaged_quantity", val);
                                    if (val > 0 && item.discrepancy_reason === "NONE") {
                                      handleUpdateReceivingItem(idx, "discrepancy_reason", "DAMAGED_IN_TRANSIT");
                                    }
                                  }}
                                  className={`w-16 text-center font-mono font-bold text-xs py-1 px-1.5 rounded-lg border ${
                                    damagedQty > 0
                                      ? "border-rose-400 bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
                                      : isClerk
                                      ? "border-slate-300 bg-white text-slate-900 focus:border-teal-600"
                                      : "border-slate-700 bg-slate-900 text-white focus:border-teal-500"
                                  }`}
                                />
                              </td>

                              {/* Discrepancy Reason & Notes */}
                              <td className="py-2.5 px-2">
                                {hasIssue ? (
                                  <div className="space-y-1">
                                    <select
                                      value={item.discrepancy_reason}
                                      onChange={(e) => handleUpdateReceivingItem(idx, "discrepancy_reason", e.target.value)}
                                      className={`w-full text-[11px] py-1 px-1.5 rounded-lg border font-semibold ${
                                        isClerk
                                          ? "border-amber-300 bg-amber-50/50 text-amber-900 focus:border-teal-600"
                                          : "border-amber-800/80 bg-amber-950/30 text-amber-300 focus:border-teal-500"
                                      }`}
                                    >
                                      <option value="DAMAGED_IN_TRANSIT">💥 Damaged in Transit</option>
                                      <option value="PACKAGING_BROKEN">📦 Packaging Broken</option>
                                      <option value="EXPIRED_ON_ARRIVAL">⏳ Expired on Arrival</option>
                                      <option value="SUPPLIER_SHORTAGE">⚠️ Supplier Shortage</option>
                                      <option value="WRONG_PRODUCT">🔄 Wrong Product</option>
                                      <option value="QUALITY_DEFECT">❌ Quality Defect</option>
                                    </select>
                                    <input
                                      type="text"
                                      placeholder="Note / remark..."
                                      value={item.discrepancy_notes}
                                      onChange={(e) => handleUpdateReceivingItem(idx, "discrepancy_notes", e.target.value)}
                                      className={`w-full text-[10px] py-0.5 px-1.5 rounded border ${
                                        isClerk
                                          ? "border-slate-300 bg-white text-slate-800"
                                          : "border-slate-700 bg-slate-900 text-slate-200"
                                      }`}
                                    />
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic">No discrepancy</span>
                                )}
                              </td>

                              {/* Batch Number */}
                              <td className="py-2.5 px-2">
                                <input
                                  type="text"
                                  required
                                  value={item.batch_no}
                                  onChange={(e) => handleUpdateReceivingItem(idx, "batch_no", e.target.value)}
                                  placeholder="Batch No."
                                  className={`w-full font-mono text-[11px] py-1 px-1.5 rounded-lg border ${
                                    isClerk
                                      ? "border-slate-300 bg-white text-slate-900 focus:border-teal-600"
                                      : "border-slate-700 bg-slate-900 text-white focus:border-teal-500"
                                  }`}
                                />
                              </td>

                              {/* Expiry Date */}
                              <td className="py-2.5 px-2">
                                <input
                                  type="date"
                                  required
                                  value={item.expiry_date}
                                  onChange={(e) => handleUpdateReceivingItem(idx, "expiry_date", e.target.value)}
                                  className={`w-full font-mono text-[11px] py-1 px-1.5 rounded-lg border ${
                                    isClerk
                                      ? "border-slate-300 bg-white text-slate-900 focus:border-teal-600"
                                      : "border-slate-700 bg-slate-900 text-white focus:border-teal-500"
                                  }`}
                                />
                              </td>

                              {/* Status Badge & Claim */}
                              <td className="py-2.5 px-3 text-right">
                                {damagedQty > 0 || shortage > 0 ? (
                                  <div className="space-y-0.5">
                                    {damagedQty > 0 && (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800">
                                        ❌ {damagedQty} Damaged
                                      </span>
                                    )}
                                    {shortage > 0 && (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                                        ⚠️ -{shortage} Short
                                      </span>
                                    )}
                                    <div className="text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400">
                                      Claim: Rs. {lineClaim.toFixed(2)}
                                    </div>
                                  </div>
                                ) : excess > 0 ? (
                                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">
                                    +{excess} Over
                                  </span>
                                ) : (
                                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                                    ✓ 100% OK
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Delivery Discrepancy & Supplier Claim Banner */}
              {(() => {
                const totalOrdered = receivingItems.reduce((acc, it) => acc + (it.ordered_qty || 0), 0);
                const totalGood = receivingItems.reduce((acc, it) => acc + (Number(it.received_quantity) || 0), 0);
                const totalDamaged = receivingItems.reduce((acc, it) => acc + (Number(it.damaged_quantity) || 0), 0);
                const totalShortage = receivingItems.reduce((acc, it) => {
                  const accounted = Number(it.received_quantity || 0) + Number(it.damaged_quantity || 0);
                  return acc + Math.max(0, it.ordered_qty - accounted);
                }, 0);
                const totalClaim = receivingItems.reduce((acc, it) => {
                  const accounted = Number(it.received_quantity || 0) + Number(it.damaged_quantity || 0);
                  const short = Math.max(0, it.ordered_qty - accounted);
                  const dmg = Number(it.damaged_quantity || 0);
                  return acc + (dmg + short) * it.unit_cost;
                }, 0);

                if (totalDamaged > 0 || totalShortage > 0) {
                  return (
                    <div className="p-3.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
                          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          <span>Delivery Discrepancy & Supplier Claim Summary</span>
                        </div>
                        <div className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-mono font-bold text-xs shadow-sm">
                          Total Supplier Claim: Rs. {totalClaim.toFixed(2)}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                        <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <span className="text-slate-400 block text-[10px]">Ordered Total</span>
                          <strong className="text-slate-800 dark:text-white font-mono text-sm">{totalOrdered}</strong> units
                        </div>
                        <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/60">
                          <span className="text-emerald-600 dark:text-emerald-400 block text-[10px]">Good (Stocked)</span>
                          <strong className="text-emerald-700 dark:text-emerald-400 font-mono text-sm">{totalGood}</strong> units
                        </div>
                        <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800/60">
                          <span className="text-rose-600 dark:text-rose-400 block text-[10px]">Damaged (Rejected)</span>
                          <strong className="text-rose-700 dark:text-rose-400 font-mono text-sm">{totalDamaged}</strong> units
                        </div>
                        <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/60">
                          <span className="text-amber-600 dark:text-amber-400 block text-[10px]">Undelivered (Short)</span>
                          <strong className="text-amber-700 dark:text-amber-400 font-mono text-sm">{totalShortage}</strong> units
                        </div>
                      </div>

                      <div className="text-[11px] text-amber-800 dark:text-amber-300">
                        🛡️ <strong>Inventory Protection:</strong> Only the <strong>{totalGood} good units</strong> will be added to branch inventory and batches. Damaged units are rejected at the dock. An official discrepancy record and claim of <strong>Rs. {totalClaim.toFixed(2)}</strong> will be recorded in the system audit log.
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="flex flex-wrap items-center justify-between text-xs px-1 text-slate-500 font-mono">
                    <div>
                      Total Ordered: <strong className="text-slate-800 dark:text-white">{totalOrdered}</strong> units
                    </div>
                    <div>
                      Total Good Stock Receiving: <strong className="text-teal-700 dark:text-teal-400 font-bold">{totalGood}</strong> units
                    </div>
                  </div>
                );
              })()}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReceiveModalOpen(false)}
                  className={theme.modalCancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReceiving || receivingItems.length === 0}
                  className="w-2/3 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  {isReceiving ? <Sparkles className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Confirm Receipt & Update Stock</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Create PO */}
      {createModalOpen && (
        <div className={theme.modalOverlay}>
          <div className={theme.modalCardLarge}>
            <div className={`flex items-center justify-between pb-3 border-b ${theme.modalHeaderBorder}`}>
              <h3 className={theme.modalTitle}>
                <Plus className="w-4 h-4 text-teal-500" />
                <span>Create Purchase Order</span>
              </h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className={`p-1 rounded-lg ${theme.modalCloseBtn}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={theme.modalLabel}>Supplier</label>
                  <select
                    required
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className={theme.modalSelect}
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.supplier_id} value={s.supplier_id}>
                        {s.name} ({s.supplier_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={theme.modalLabel}>Expected Delivery Date</label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className={theme.modalInput}
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className={`text-xs font-bold ${isClerk ? "text-slate-900" : "text-slate-200"}`}>
                    Purchase Order Items
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs text-teal-600 hover:text-teal-700 dark:text-teal-400 font-semibold"
                  >
                    + Add Product Line
                  </button>
                </div>

                {poItems.map((item, idx) => (
                  <div key={idx} className={theme.modalItemRow}>
                    <select
                      required
                      value={item.product_id}
                      onChange={(e) => {
                        const updated = [...poItems];
                        updated[idx].product_id = e.target.value;
                        setPoItems(updated);
                      }}
                      className={theme.modalItemSelect}
                    >
                      <option value="">Select Product</option>
                      {products.map((p) => (
                        <option key={p.product_id} value={p.product_id}>
                          {p.name} ({p.barcode})
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400">Qty:</span>
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => {
                          const updated = [...poItems];
                          updated[idx].quantity = Number(e.target.value);
                          setPoItems(updated);
                        }}
                        className={`w-20 ${theme.modalItemInput}`}
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400">Cost:</span>
                      <input
                        type="number"
                        placeholder="Unit Cost"
                        value={item.unit_cost}
                        onChange={(e) => {
                          const updated = [...poItems];
                          updated[idx].unit_cost = Number(e.target.value);
                          setPoItems(updated);
                        }}
                        className={`w-24 ${theme.modalItemInput}`}
                      />
                    </div>

                    {poItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        className={theme.modalItemRemoveBtn}
                        title="Remove Line"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className={`flex items-center gap-3 pt-3 border-t ${theme.modalFooterBorder}`}>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className={theme.modalCancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-2/3 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {isCreating ? <Sparkles className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Generate Purchase Order</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
