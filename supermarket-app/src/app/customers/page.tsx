"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useApp } from "@/lib/context";
import { Customer } from "@/lib/types";
import {
  Users,
  Search,
  Plus,
  Star,
  Award,
  History,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  X,
  CreditCard,
  ArrowUpRight,
  Pencil,
  Calendar,
  Lock,
  Store,
  ChevronDown,
  Coins,
  ShieldCheck,
  FileText,
} from "lucide-react";
import RegisterCustomerModal from "@/components/RegisterCustomerModal";

interface LoyaltyLedgerItem {
  loyalty_id: number;
  customer_id: number;
  sale_id: number | null;
  branch_id: number | null;
  branch_name?: string | null;
  points: number;
  points_change?: number;
  type: string;
  transaction_type?: string;
  note: string | null;
  sale_total?: number | string | null;
  created_at: string;
}

export default function CustomersPage() {
  const pathname = usePathname();
  const { showToast, branches, currentEmployee, authenticatedUser, currentBranch } = useApp();
  const isMarketing =
    pathname?.startsWith("/marketing") ||
    currentEmployee?.role === "MARKETING" ||
    authenticatedUser?.role === "MARKETING";
  const isCashier =
    pathname?.startsWith("/cashier") ||
    currentEmployee?.role === "CASHIER" ||
    authenticatedUser?.role === "CASHIER";

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("ALL");

  // Customer Loyalty Ledger Modal State
  const [ledgerModalOpen, setLedgerModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loyaltyHistory, setLoyaltyHistory] = useState<LoyaltyLedgerItem[]>([]);
  const [tierHistory, setTierHistory] = useState<any[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);


  // Register Customer Modal State
  const [registerModalOpen, setRegisterModalOpen] = useState(false);

  // Edit Customer Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<{
    customer_id: number;
    card_no: string;
    full_name: string;
    phone: string;
    email: string;
    city: string;
    tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
    points_balance: number;
    join_date: string;
  } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchCustomers = async (queryOverride?: string, branchOverride?: string) => {
    setLoading(true);
    try {
      const q = queryOverride !== undefined ? queryOverride : search;
      const bId = branchOverride !== undefined ? branchOverride : selectedBranchId;
      const params = new URLSearchParams();
      if (q.trim()) params.append("search", q.trim());
      if (bId && bId !== "ALL") params.append("branchId", bId);
      if (isCashier) {
        params.append("isCashier", "true");
        if (currentBranch?.branch_id) {
          params.append("cashierBranchId", String(currentBranch.branch_id));
        }
      }
      const res = await fetch(`/api/customers?${params.toString()}`);
      const data = await res.json();
      if (Array.isArray(data)) setCustomers(data);
    } catch (err) {
      console.error("Error fetching customers:", err);
    } finally {
      setLoading(false);
    }
  };

  // Debounce search and reload customers automatically on search or branch change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers(search, selectedBranchId);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, selectedBranchId]);

  const openCustomerEdit = (customer: Customer) => {
    let formattedDate = "";
    if (customer.join_date) {
      try {
        formattedDate = new Date(customer.join_date).toISOString().slice(0, 10);
      } catch {
        formattedDate = "";
      }
    }
    setEditingCustomer({
      customer_id: customer.customer_id,
      card_no: customer.card_no,
      full_name: customer.full_name,
      phone: customer.phone,
      email: customer.email || "",
      city: customer.city || "Colombo",
      tier: customer.tier,
      points_balance: customer.points_balance || 0,
      join_date: formattedDate,
    });
    setEditModalOpen(true);
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    setIsUpdating(true);
    try {
      const res = await fetch("/api/customers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editingCustomer,
          role: isCashier ? "CASHIER" : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Customer updated successfully!", "success");
        setEditModalOpen(false);
        setEditingCustomer(null);
        fetchCustomers();
      } else {
        showToast(data.error || "Failed to update customer", "error");
      }
    } catch {
      showToast("Error updating customer", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const openCustomerLedger = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setLedgerModalOpen(true);
    setLoadingLedger(true);
    try {
      const res = await fetch(`/api/customers/${customer.customer_id}/loyalty`);
      const data = await res.json();
      setLoyaltyHistory(data.transactions || []);
      setTierHistory(data.tierHistory || []);
    } catch {
      showToast("Error loading loyalty ledger", "error");
    } finally {
      setLoadingLedger(false);
    }
  };


  const handleRegisterSuccess = (newMember: any) => {
    showToast(`Registered ${newMember.full_name}! Card: ${newMember.card_no}`, "success");
    setRegisterModalOpen(false);
    setSearch("");
    fetchCustomers("");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Users className="w-6 h-6 text-amber-600" />
            <span>Customers & Loyalty Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Enroll loyalty members, track point ledgers, and process rewards across all branches
          </p>
        </div>

        {/* Action Button: Register Customer (Hidden for Marketing & Cashier) */}
        {!isMarketing && !isCashier && (
          <button
            onClick={() => setRegisterModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>+ Register New Customer</span>
          </button>
        )}
      </div>

      {/* Cashier View Banner */}
      {isCashier && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold shadow-xs">
          <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Cashier Portal: Showing all branches loyalty customers & your branch customers (You can edit name, phone, email & city)</span>
        </div>
      )}

      {/* Search & Branch Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchCustomers(search, selectedBranchId);
          }}
          className="relative flex-1"
        >
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              const val = e.target.value;
              setSearch(val);
              if (!val.trim()) {
                fetchCustomers("", selectedBranchId);
              }
            }}
            placeholder="Search customer by name, card number, or phone..."
            className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 font-mono shadow-xs focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                fetchCustomers("", selectedBranchId);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors"
              title="Clear search and show all customers"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>

        {/* Branch-Wise Filter Dropdown */}
        <div className="relative min-w-[220px] sm:min-w-[260px]">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-300 shadow-xs hover:border-slate-400 transition-colors">
            <Store className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider leading-none mb-0.5">
                Branch Wise
              </div>
              <select
                value={selectedBranchId}
                onChange={(e) => {
                  const bId = e.target.value;
                  setSelectedBranchId(bId);
                  fetchCustomers(search, bId);
                }}
                className="w-full bg-transparent text-xs text-slate-900 font-bold focus:outline-none cursor-pointer truncate"
              >
                <option value="ALL" className="bg-white text-slate-900">
                  {isCashier
                    ? `All Loyalty Customers + ${currentBranch?.name || "My Branch"}`
                    : "All Branches (All Customers)"}
                </option>
                {branches.map((b) => (
                  <option key={b.branch_id} value={String(b.branch_id)} className="bg-white text-slate-900">
                    {b.name} ({b.city})
                  </option>
                ))}
              </select>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Customers Cards / Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase text-[11px] font-semibold tracking-wider">
                <th className="py-3.5 px-4 font-semibold">Card Number</th>
                <th className="py-3.5 px-4 font-semibold">Customer Name</th>
                <th className="py-3.5 px-4 font-semibold">Phone</th>
                <th className="py-3.5 px-4 font-semibold">City</th>
                <th className="py-3.5 px-4 font-semibold text-center">Membership Tier</th>
                <th className="py-3.5 px-4 font-semibold text-right">Points Balance</th>
                <th className="py-3.5 px-4 font-semibold">Joining Date</th>
                <th className="py-3.5 px-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Sparkles className="w-5 h-5 animate-spin mx-auto text-amber-500 mb-2" />
                    Loading customers...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No customers found matching search.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.customer_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-amber-700">{c.card_no}</td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      <div>{c.full_name}</div>
                      {c.email && <div className="text-[10px] text-slate-400">{c.email}</div>}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{c.phone}</td>
                    <td className="py-3 px-4 text-slate-600">{c.city || "Colombo"}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold ${
                          c.tier === "PLATINUM"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : c.tier === "GOLD"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : c.tier === "SILVER"
                            ? "bg-slate-100 text-slate-700 border border-slate-200"
                            : "bg-orange-50 text-orange-700 border border-orange-200"
                        }`}
                      >
                        {c.tier}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 text-sm">
                      {c.points_balance || 0} pts
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                      {c.join_date ? new Date(c.join_date).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1.5">

                        {/* View Loyalty Ledger Button */}
                        <button
                          onClick={() => openCustomerLedger(c)}
                          className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 shadow-xs transition-all flex items-center gap-1 text-[11px] font-semibold"
                          title="View Points Ledger & Tier History"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>Ledger</span>
                        </button>

                        {/* Edit Customer Button */}
                        <button
                          onClick={() => openCustomerEdit(c)}
                          className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 shadow-xs transition-all flex items-center gap-1 text-[11px] font-semibold"
                          title="Edit Customer Details"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Customer Loyalty Ledger */}
      {ledgerModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-600" />
                <span>Loyalty Ledger: {selectedCustomer.full_name}</span>
              </h3>
              <button
                onClick={() => setLedgerModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Transactions List */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div>
                {loadingLedger ? (
                  <div className="py-6 text-center text-slate-500 text-xs">Loading ledger records...</div>
                ) : loyaltyHistory.length === 0 ? (
                  <div className="py-6 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-200">
                    No points transactions recorded yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-600 bg-slate-50 font-semibold uppercase text-[11px] tracking-wider font-sans">
                            <th className="py-3 px-4">Date & Time</th>
                            <th className="py-3 px-4">Sale Amount</th>
                            <th className="py-3 px-4">Store Branch</th>
                            <th className="py-3 px-4 text-center">Type</th>
                            <th className="py-3 px-4">Transaction Note</th>
                            <th className="py-3 px-4 text-right">Earned Points</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                          {loyaltyHistory.map((lt: LoyaltyLedgerItem) => {
                            const isEarn = lt.type === "EARN" || lt.transaction_type === "EARNED" || Number(lt.points_change || lt.points) > 0;
                            const ptsVal = Math.abs(Number(lt.points || lt.points_change || 0));
                            return (
                              <tr key={lt.loyalty_id} className="text-slate-700 hover:bg-slate-50/70 transition-colors">
                                <td className="py-3 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                                  {new Date(lt.created_at).toLocaleString()}
                                </td>
                                <td className="py-3 px-4 font-mono text-slate-900 font-medium">
                                  {lt.sale_total ? (
                                    <span>Rs. {Number(lt.sale_total).toFixed(2)}</span>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 font-sans text-slate-700">
                                  {lt.branch_name || "—"}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span
                                    className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                                      isEarn
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        : "bg-rose-50 text-rose-700 border border-rose-200"
                                    }`}
                                  >
                                    {isEarn ? "EARNED" : "REDEEMED"}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-xs font-sans text-slate-700">
                                  {lt.note || "Points updated"}
                                </td>
                                <td
                                  className={`py-3 px-4 text-right font-bold text-sm ${
                                    isEarn ? "text-emerald-700" : "text-rose-700"
                                  }`}
                                >
                                  {isEarn ? `+${ptsVal}` : `-${ptsVal}`} pts
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex items-center justify-between text-xs px-1 text-slate-500 font-mono">
                      <span>Total Transactions: <strong className="text-slate-900">{loyaltyHistory.length}</strong></span>
                      <span className="text-emerald-700 font-bold text-sm">
                        Total Points Earned: +{loyaltyHistory.filter((lt: LoyaltyLedgerItem) => lt.type === 'EARN' || lt.transaction_type === 'EARNED' || Number(lt.points || lt.points_change) > 0).reduce((sum: number, lt: LoyaltyLedgerItem) => sum + Math.abs(Number(lt.points || lt.points_change || 0)), 0)} pts
                      </span>
                    </div>
                  </div>
                )}
              </div>

            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setLedgerModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Register Customer (with Live Card Preview & Welcome Points) */}
      <RegisterCustomerModal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        defaultCity="Colombo"
        onSuccess={handleRegisterSuccess}
      />


      {/* MODAL: Edit Customer Details */}
      {editModalOpen && editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-blue-600" />
                  <span>Edit Customer Details</span>
                </h3>
              </div>
              <button
                onClick={() => {
                  setEditModalOpen(false);
                  setEditingCustomer(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isCashier && (
              <div className="text-[11px] bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-xl flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Cashier Mode: You can update customer name, phone, email, and city. Membership tier and points balance are manager-protected.</span>
              </div>
            )}

            <form onSubmit={handleUpdateCustomer} className="space-y-4">
              {/* Row 1: Card Number & Full Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1 flex items-center justify-between">
                    <span>Card Number</span>
                    <span className="text-[10px] text-amber-700 font-mono flex items-center gap-1 font-bold">
                      <Lock className="w-2.5 h-2.5" />
                      Locked
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={editingCustomer.card_no}
                      className="w-full px-3 py-2 pr-8 rounded-xl bg-slate-100 border border-slate-300 font-mono text-xs text-amber-800 font-bold cursor-not-allowed select-none shadow-xs"
                      title="Card Number is permanently assigned and cannot be changed"
                    />
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editingCustomer.full_name}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, full_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 shadow-xs focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* Row 2: Phone Number & Joining Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={editingCustomer.phone}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-mono text-xs text-slate-900 shadow-xs focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-blue-600" />
                      <span>Joining Date</span>
                    </span>
                    <span className="text-[10px] text-amber-700 font-mono flex items-center gap-1 font-bold">
                      <Lock className="w-2.5 h-2.5" />
                      Locked
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      readOnly
                      disabled
                      value={editingCustomer.join_date}
                      className="w-full px-3 py-2 pr-8 rounded-xl bg-slate-100 border border-slate-300 font-mono text-xs text-slate-700 font-bold cursor-not-allowed select-none shadow-xs"
                      title="Joining Date is permanent and cannot be changed"
                    />
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Row 3: Email & City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1 flex items-center justify-between">
                    <span>Email <span className="text-rose-500">*</span></span>
                    <span className="text-[10px] text-emerald-700 font-mono font-bold">Required</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={editingCustomer.email}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 shadow-xs focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    placeholder="customer@example.com"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">City</label>
                  <input
                    type="text"
                    value={editingCustomer.city}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 shadow-xs focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* Row 4: Membership Tier & Points Balance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1 flex items-center justify-between">
                    <span>Membership Tier</span>
                    {isCashier && (
                      <span className="text-[10px] text-amber-700 font-mono flex items-center gap-1 font-bold">
                        <Lock className="w-2.5 h-2.5" />
                        Manager Locked
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <select
                      disabled={isCashier}
                      value={editingCustomer.tier}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, tier: e.target.value as any })}
                      className={`w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 shadow-xs ${
                        isCashier
                          ? "bg-slate-100 cursor-not-allowed select-none text-slate-600"
                          : "bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      }`}
                    >
                      <option value="BRONZE">BRONZE</option>
                      <option value="SILVER">SILVER</option>
                      <option value="GOLD">GOLD</option>
                      <option value="PLATINUM">PLATINUM</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1 flex items-center justify-between">
                    <span>Points Balance</span>
                    {isCashier && (
                      <span className="text-[10px] text-amber-700 font-mono flex items-center gap-1 font-bold">
                        <Lock className="w-2.5 h-2.5" />
                        Manager Locked
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      disabled={isCashier}
                      readOnly={isCashier}
                      value={editingCustomer.points_balance}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, points_balance: Number(e.target.value) })}
                      className={`w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs text-slate-900 shadow-xs ${
                        isCashier
                          ? "bg-slate-100 cursor-not-allowed select-none text-slate-600"
                          : "bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const cust = customers.find((c) => c.customer_id === editingCustomer.customer_id);
                    if (cust) {
                      setEditModalOpen(false);
                      openCustomerLedger(cust);
                    }
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors font-semibold"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>View Points Ledger</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditModalOpen(false);
                      setEditingCustomer(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-50 transition-colors shadow-xs"
                  >
                    {isUpdating ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
