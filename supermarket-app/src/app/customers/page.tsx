"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";

export default function CustomersPage() {
  const { showToast } = useApp();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Customer Loyalty Ledger Modal State
  const [ledgerModalOpen, setLedgerModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loyaltyHistory, setLoyaltyHistory] = useState<any[]>([]);
  const [tierHistory, setTierHistory] = useState<any[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);

  // Edit Customer Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<{
    customer_id: number;
    card_no: string;
    full_name: string;
    phone: string;
    email: string;
    city: string;
    tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
    points_balance: number;
    join_date: string;
  } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Add Customer Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newCust, setNewCust] = useState({
    full_name: "",
    phone: "",
    email: "",
    city: "Colombo",
  });
  const [isAdding, setIsAdding] = useState(false);

  const fetchCustomers = async (queryOverride?: string) => {
    setLoading(true);
    try {
      const q = queryOverride !== undefined ? queryOverride : search;
      const params = new URLSearchParams();
      if (q.trim()) params.append("search", q.trim());
      const res = await fetch(`/api/customers?${params.toString()}`);
      const data = await res.json();
      if (Array.isArray(data)) setCustomers(data);
    } catch (err) {
      console.error("Error fetching customers:", err);
    } finally {
      setLoading(false);
    }
  };

  // Debounce search and reload customers automatically on search change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers(search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

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
        body: JSON.stringify(editingCustomer),
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

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCust),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Customer registered! Card issued: ${data.card_no}`, "success");
        setAddModalOpen(false);
        setNewCust({ full_name: "", phone: "", email: "", city: "Colombo" });
        setSearch("");
        fetchCustomers("");
      } else {
        showToast(data.error || "Failed to register customer", "error");
      }
    } catch {
      showToast("Error registering customer", "error");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Users className="w-6 h-6 text-amber-400" />
            <span>Customers & Loyalty Management</span>
          </h1>
        </div>
      </div>

      {/* Search Controls */}
      <div className="flex items-center gap-3">
        {/* Search Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchCustomers(search);
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
                fetchCustomers("");
              }
            }}
            placeholder="Search customer by name, card number, or phone..."
            className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 font-mono focus:border-blue-500"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                fetchCustomers("");
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded transition-colors"
              title="Clear search and show all customers"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>

      {/* Customers Cards / Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                <th className="py-3.5 px-4 font-semibold">Card Number</th>
                <th className="py-3.5 px-4 font-semibold">Customer Name</th>
                <th className="py-3.5 px-4 font-semibold">Phone</th>
                <th className="py-3.5 px-4 font-semibold">City</th>
                <th className="py-3.5 px-4 font-semibold text-center">Membership Tier</th>
                <th className="py-3.5 px-4 font-semibold text-right">Points Balance</th>
                <th className="py-3.5 px-4 font-semibold">Joining Date</th>
                <th className="py-3.5 px-4 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Sparkles className="w-5 h-5 animate-spin mx-auto text-amber-400 mb-2" />
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
                  <tr key={c.customer_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-amber-400">{c.card_no}</td>
                    <td className="py-3 px-4 font-medium text-white">{c.full_name}</td>
                    <td className="py-3 px-4 font-mono text-slate-300">{c.phone}</td>
                    <td className="py-3 px-4 text-slate-400">{c.city || "Colombo"}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${c.tier === "PLATINUM"
                          ? "bg-purple-950/60 text-purple-300 border border-purple-800/60"
                          : c.tier === "GOLD"
                            ? "bg-amber-950/60 text-amber-300 border border-amber-800/60"
                            : c.tier === "SILVER"
                              ? "bg-slate-800 text-slate-300 border border-slate-700"
                              : "bg-orange-950/60 text-orange-300 border border-orange-800/60"
                          }`}
                      >
                        {c.tier}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 text-sm">
                      {c.points_balance} pts
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {c.join_date ? new Date(c.join_date).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => openCustomerEdit(c)}
                        className="px-3 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 border border-blue-500/30 transition-all flex items-center gap-1.5 mx-auto text-[11px] font-semibold"
                        title="Edit Customer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400" />
                  <span>Loyalty Ledger: {selectedCustomer.full_name}</span>
                </h3>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Card: {selectedCustomer.card_no} • Tier: {selectedCustomer.tier} • Current Points:{" "}
                  <strong className="text-emerald-400 font-bold">{selectedCustomer.points_balance} pts</strong>
                </div>
              </div>
              <button
                onClick={() => setLedgerModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Transactions List */}
            <div className="flex-1 overflow-y-auto space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-300 mb-2">Points Transaction History</h4>
                {loadingLedger ? (
                  <div className="py-6 text-center text-slate-500 text-xs">Loading ledger records...</div>
                ) : loyaltyHistory.length === 0 ? (
                  <div className="py-6 text-center text-slate-500 text-xs">No points transactions recorded.</div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="pb-2 font-semibold">Date</th>
                        <th className="pb-2 font-semibold">Sale Ref</th>
                        <th className="pb-2 font-semibold">Type</th>
                        <th className="pb-2 font-semibold text-right">Points Change</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {loyaltyHistory.map((lt) => (
                        <tr key={lt.loyalty_id} className="text-slate-300">
                          <td className="py-2 font-mono text-[11px] text-slate-400">
                            {new Date(lt.created_at).toLocaleString()}
                          </td>
                          <td className="py-2 font-mono text-blue-400">
                            {lt.sale_id ? `#SALE-${lt.sale_id}` : "Bonus/Manual"}
                          </td>
                          <td className="py-2">
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${lt.transaction_type === "EARNED"
                                ? "bg-emerald-950 text-emerald-300"
                                : "bg-rose-950 text-rose-300"
                                }`}
                            >
                              {lt.transaction_type}
                            </span>
                          </td>
                          <td
                            className={`py-2 text-right font-mono font-bold ${lt.points_change > 0 ? "text-emerald-400" : "text-rose-400"
                              }`}
                          >
                            {lt.points_change > 0 ? `+${lt.points_change}` : lt.points_change} pts
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Tier Upgrade History */}
              {tierHistory.length > 0 && (
                <div className="pt-3 border-t border-slate-800">
                  <h4 className="text-xs font-bold text-slate-300 mb-2">Customer Tier Progression (customer_tier_history)</h4>
                  <div className="space-y-1.5">
                    {tierHistory.map((th) => (
                      <div
                        key={th.history_id}
                        className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="text-slate-400">{th.old_tier}</span>
                          <span className="text-slate-500 mx-2">→</span>
                          <span className="font-bold text-amber-300">{th.new_tier}</span>
                          <div className="text-[10px] text-slate-400 mt-0.5">{th.reason || "Points threshold met"}</div>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">
                          {new Date(th.changed_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 text-right">
              <button
                onClick={() => setLedgerModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Register Customer */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Register Loyalty Customer</span>
              </h3>
              <button
                onClick={() => setAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Card Number:</span>
                <span className="text-amber-400 font-bold">Sequential Auto-Assign (e.g. C0007+)</span>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kasun Fernando"
                  value={newCust.full_name}
                  onChange={(e) => setNewCust({ ...newCust, full_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Phone Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 0771234567"
                  value={newCust.phone}
                  onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 font-mono text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Email (Optional)</label>
                <input
                  type="email"
                  placeholder="kasun@mail.com"
                  value={newCust.email}
                  onChange={(e) => setNewCust({ ...newCust, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">City</label>
                <input
                  type="text"
                  placeholder="Colombo"
                  value={newCust.city}
                  onChange={(e) => setNewCust({ ...newCust, city: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="w-2/3 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold"
                >
                  Register & Issue Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Customer Details & Joining Date */}
      {editModalOpen && editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-blue-400" />
                  <span>Edit Customer Details</span>
                </h3>
              </div>
              <button
                onClick={() => {
                  setEditModalOpen(false);
                  setEditingCustomer(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateCustomer} className="space-y-4">
              {/* Row 1: Card Number & Full Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1 flex items-center justify-between">
                    <span>Card Number</span>
                    <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
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
                      className="w-full px-3 py-2 pr-8 rounded-xl bg-slate-950/70 border border-slate-800 font-mono text-xs text-amber-300/80 font-bold cursor-not-allowed select-none opacity-90"
                      title="Card Number is permanently assigned and cannot be changed"
                    />
                    <Lock className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-300 block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editingCustomer.full_name}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, full_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Row 2: Phone Number & Joining Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={editingCustomer.phone}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 font-mono text-xs text-white focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 block mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-blue-400" />
                      <span>Joining Date</span>
                    </span>
                    <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
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
                      className="w-full px-3 py-2 pr-8 rounded-xl bg-slate-950/70 border border-slate-800 font-mono text-xs text-slate-300 font-bold cursor-not-allowed select-none opacity-90"
                      title="Joining Date is permanent and cannot be changed"
                    />
                    <Lock className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Row 3: Email & City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1 flex items-center justify-between">
                    <span>Email</span>
                    <span className="text-[10px] text-slate-500 font-mono">Optional</span>
                  </label>
                  <input
                    type="email"
                    value={editingCustomer.email}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:border-blue-500"
                    placeholder="email@example.com (optional)"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 block mb-1">City</label>
                  <input
                    type="text"
                    value={editingCustomer.city}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Row 4: Membership Tier & Points Balance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Membership Tier</label>
                  <select
                    value={editingCustomer.tier}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, tier: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:border-blue-500"
                  >
                    <option value="BRONZE">BRONZE</option>
                    <option value="SILVER">SILVER</option>
                    <option value="GOLD">GOLD</option>
                    <option value="PLATINUM">PLATINUM</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-300 block mb-1">Points Balance</label>
                  <input
                    type="number"
                    min="0"
                    value={editingCustomer.points_balance}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, points_balance: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 font-mono text-xs text-white focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    const cust = customers.find((c) => c.customer_id === editingCustomer.customer_id);
                    if (cust) {
                      setEditModalOpen(false);
                      openCustomerLedger(cust);
                    }
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors"
                >
                  <History className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditModalOpen(false);
                      setEditingCustomer(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold disabled:opacity-50 transition-colors"
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
