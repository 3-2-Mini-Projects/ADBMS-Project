"use client";

import React, { useState, useEffect } from "react";
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
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [batchExpiryDate, setBatchExpiryDate] = useState("");
  const [isReceiving, setIsReceiving] = useState(false);
  const [poDetails, setPoDetails] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (selectedPO) {
      setLoadingDetails(true);
      fetch(`/api/purchases/${selectedPO.po_id}`)
        .then((r) => r.json())
        .then((d) => Array.isArray(d) && setPoDetails(d))
        .catch(() => setPoDetails([]))
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

  const handleReceivePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO) return;
    setIsReceiving(true);
    try {
      const res = await fetch(`/api/purchases/${selectedPO.po_id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expiry_date: batchExpiryDate,
          received_by: currentEmployee?.employee_id || 1,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`PO ${selectedPO.po_number} received! Stock & batches updated.`, "success");
        setReceiveModalOpen(false);
        fetchOrders();
      } else {
        showToast(data.error || "Failed to receive PO", "error");
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
    wrapper: isClerk
      ? "space-y-6 animate-in fade-in duration-300 bg-slate-50/90 -m-6 p-6 sm:p-8 min-h-[calc(100vh-4rem)] text-slate-800"
      : "space-y-6 animate-in fade-in duration-300 text-slate-100",
    title: isClerk
      ? "text-2xl font-black text-slate-900 flex items-center gap-2.5"
      : "text-2xl font-black text-white flex items-center gap-2.5",
    subtitle: isClerk ? "text-xs text-slate-500 mt-1" : "text-xs text-slate-400 mt-1",
    searchBox: isClerk
      ? "w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 font-mono shadow-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100 transition-all"
      : "w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 font-mono focus:border-teal-500 focus:outline-none transition-colors",
    searchIcon: isClerk ? "text-slate-400" : "text-slate-500",
    filterBtnInactive: isClerk
      ? "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 shadow-sm"
      : "bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white",
    filterBtnActive: isClerk
      ? "bg-teal-50 border border-teal-500 text-teal-800 font-bold shadow-sm"
      : "bg-teal-500/20 border border-teal-500/50 text-teal-300 font-bold",
    tableCard: isClerk
      ? "bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
      : "glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-2xl",
    thead: isClerk
      ? "border-b border-slate-200 bg-slate-50/80 text-slate-600 uppercase text-[11px] font-semibold tracking-wider"
      : "border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase text-[11px] font-semibold tracking-wider",
    tbodyDivide: isClerk ? "divide-y divide-slate-100" : "divide-y divide-slate-800/60",
    rowHover: isClerk ? "hover:bg-teal-50/30 transition-colors" : "hover:bg-slate-800/40 transition-colors",
    poNumber: isClerk ? "text-teal-700 font-mono font-bold" : "text-teal-400 font-mono font-bold",
    supplierName: isClerk ? "text-slate-900 font-semibold" : "text-white font-medium",
    branchText: isClerk ? "text-slate-600" : "text-slate-300",
    dateText: isClerk ? "text-slate-500 font-mono" : "text-slate-400 font-mono",
    itemCount: isClerk ? "text-slate-700 font-mono" : "text-slate-300 font-mono",
    costText: isClerk ? "text-emerald-700 font-mono font-bold" : "text-emerald-400 font-mono font-bold",
    badgeReceived: isClerk
      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
      : "bg-emerald-950/60 text-emerald-400 border border-emerald-800/60",
    badgePending: isClerk
      ? "bg-amber-50 text-amber-700 border border-amber-200"
      : "bg-amber-950/60 text-amber-400 border border-amber-800/60",
    badgeCancelled: isClerk
      ? "bg-rose-50 text-rose-700 border border-rose-200"
      : "bg-rose-950/60 text-rose-400 border border-rose-800/60",
    badgeOther: isClerk
      ? "bg-blue-50 text-blue-700 border border-blue-200"
      : "bg-blue-950/60 text-blue-400 border border-blue-800/60",
    fulfilledText: isClerk ? "text-emerald-700 font-semibold" : "text-emerald-400 font-semibold",
    cancelledText: isClerk ? "text-slate-400 italic" : "text-slate-500 italic",
    emptyText: isClerk ? "text-slate-500" : "text-slate-500",
    modalOverlay: isClerk
      ? "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      : "fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200",
    modalCardSmall: isClerk
      ? "bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-slate-900"
      : "bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-white",
    modalCardLarge: isClerk
      ? "bg-white border border-slate-200 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-slate-900"
      : "bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-white",
    modalHeaderBorder: isClerk ? "border-slate-100" : "border-slate-800",
    modalTitle: isClerk ? "text-slate-900 font-bold text-sm flex items-center gap-2" : "text-white font-bold text-sm flex items-center gap-2",
    modalCloseBtn: isClerk ? "text-slate-400 hover:text-slate-700" : "text-slate-400 hover:text-white",
    modalInfoBox: isClerk
      ? "bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1 text-slate-700"
      : "bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1 text-slate-300",
    modalInfoStrong: isClerk ? "text-slate-900 font-semibold" : "text-white font-semibold",
    modalInfoDesc: isClerk ? "text-slate-500 text-[11px] pt-1" : "text-slate-400 text-[11px] pt-1",
    modalLabel: isClerk ? "text-xs font-semibold text-slate-700 block mb-1" : "text-xs text-slate-300 block mb-1",
    modalInput: isClerk
      ? "w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-mono text-xs text-slate-900 shadow-sm focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
      : "w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 font-mono text-xs text-white focus:outline-none focus:border-teal-500",
    modalSelect: isClerk
      ? "w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
      : "w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500",
    modalItemRow: isClerk
      ? "flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200"
      : "flex items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800",
    modalItemSelect: isClerk
      ? "flex-1 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 shadow-sm focus:outline-none focus:border-teal-600"
      : "flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500",
    modalItemInput: isClerk
      ? "px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-mono text-slate-900 shadow-sm focus:outline-none focus:border-teal-600"
      : "px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:border-teal-500",
    modalItemRemoveBtn: isClerk ? "text-slate-400 hover:text-rose-600 p-1" : "text-slate-500 hover:text-rose-400 p-1",
    modalFooterBorder: isClerk ? "border-t border-slate-100" : "border-t border-slate-800",
    modalCancelBtn: isClerk
      ? "w-1/3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors"
      : "w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold",
  };

  return (
    <div className={theme.wrapper}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={theme.title}>
            <FileSpreadsheet className={`w-6 h-6 ${isClerk ? "text-teal-600" : "text-teal-400"}`} />
            <span>Purchase Orders & Supplier Inflow</span>
          </h1>
          <p className={theme.subtitle}>
            Generate replenishment purchase orders and receive stock into branch inventory & product batches.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-950/40 flex items-center gap-2 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Purchase Order</span>
        </button>
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
          <div className={theme.modalCardSmall}>
            <div className={`flex items-center justify-between pb-3 border-b ${theme.modalHeaderBorder}`}>
              <h3 className={theme.modalTitle}>
                <PackageCheck className="w-4 h-4 text-teal-500" />
                <span>Receive Goods: {selectedPO.po_number}</span>
              </h3>
              <button
                onClick={() => setReceiveModalOpen(false)}
                className={`p-1 rounded-lg ${theme.modalCloseBtn}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className={theme.modalInfoBox}>
              <div>Supplier: <strong className={theme.modalInfoStrong}>{selectedPO.supplier_name}</strong></div>
              <div>Receiving Branch: <strong className={theme.modalInfoStrong}>{selectedPO.branch_name}</strong></div>
              <div className={theme.modalInfoDesc}>
                Receiving will add order quantities directly to branch inventory and register FIFO batch codes automatically.
              </div>
            </div>

            {/* Items Breakdown via vw_purchase_order_details */}
            <div className="border border-slate-800 rounded-xl overflow-hidden text-xs bg-slate-900/60 my-2">
              <div className="bg-slate-800/60 px-3 py-1.5 font-semibold text-slate-300 flex justify-between items-center text-[11px]">
                <span className="flex items-center gap-1.5 text-teal-400">
                  <Sparkles className="w-3 h-3" />
                  <span>Items to Receive (vw_purchase_order_details)</span>
                </span>
                <span className="text-slate-400">{poDetails.length} items</span>
              </div>
              <div className="max-h-36 overflow-y-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] text-slate-400">
                      <th className="py-1 px-3">Product</th>
                      <th className="py-1 px-3 text-right">Qty</th>
                      <th className="py-1 px-3 text-right">Unit Cost</th>
                      <th className="py-1 px-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingDetails ? (
                      <tr>
                        <td colSpan={4} className="py-3 text-center text-slate-500 text-[11px]">
                          Loading items from database view...
                        </td>
                      </tr>
                    ) : poDetails.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-3 text-center text-slate-500 text-[11px]">
                          No items found for this order.
                        </td>
                      </tr>
                    ) : (
                      poDetails.map((it, idx) => (
                        <tr key={idx} className="border-b border-slate-800/40 text-[11px]">
                          <td className="py-1.5 px-3 text-slate-200">{it.product_name}</td>
                          <td className="py-1.5 px-3 text-right font-mono text-slate-300 font-bold">{it.ordered_qty}</td>
                          <td className="py-1.5 px-3 text-right font-mono text-slate-400">Rs. {Number(it.unit_cost).toFixed(2)}</td>
                          <td className="py-1.5 px-3 text-right font-mono text-teal-400 font-semibold">
                            Rs. {Number(it.line_cost).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <form onSubmit={handleReceivePO} className="space-y-4">
              <div>
                <label className={theme.modalLabel}>Batch Expiry Date</label>
                <input
                  type="date"
                  required
                  value={batchExpiryDate}
                  onChange={(e) => setBatchExpiryDate(e.target.value)}
                  className={theme.modalInput}
                />
              </div>

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
                  disabled={isReceiving}
                  className="w-2/3 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
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
