"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/lib/context";
import { Branch } from "@/lib/types";
import {
  Store,
  Plus,
  MapPin,
  Phone,
  User,
  Calendar,
  Sparkles,
  X,
  Building2,
  CheckCircle2,
} from "lucide-react";

export default function BranchesPage() {
  const { branches, employees, showToast, refreshAppData } = useApp();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newBranch, setNewBranch] = useState({
    branch_code: "",
    name: "",
    city: "",
    region: "Western",
    address: "",
    phone: "",
    manager_id: "",
    opened_date: "",
  });

  useEffect(() => {
    setNewBranch((prev) => ({
      ...prev,
      opened_date: new Date().toISOString().split("T")[0],
    }));
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newBranch,
          manager_id: newBranch.manager_id ? Number(newBranch.manager_id) : null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Branch "${newBranch.name}" created successfully!`, "success");
        setAddModalOpen(false);
        setNewBranch({
          branch_code: "",
          name: "",
          city: "",
          region: "Western",
          address: "",
          phone: "",
          manager_id: "",
          opened_date: new Date().toISOString().split("T")[0],
        });
        refreshAppData();
      } else {
        showToast(data.error || "Failed to create branch", "error");
      }
    } catch {
      showToast("Error creating branch", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Store className="w-6 h-6 text-blue-400" />
            <span>Supermarket Branches & Outlets</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Enterprise multi-branch configurations, location managers, and outlet operating status.
          </p>
        </div>

        <button
          onClick={() => setAddModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-950/40 flex items-center gap-2 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Branch</span>
        </button>
      </div>

      {/* Branches Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {branches.map((b) => (
          <div
            key={b.branch_id}
            className="glass-card rounded-2xl p-6 border border-slate-800 hover:border-blue-500/40 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-blue-300">
                    {b.branch_code}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
              </div>

              <h2 className="text-lg font-bold text-white">{b.name}</h2>
              <div className="text-xs text-slate-400 font-medium mt-0.5">
                {b.city}, {b.region} Region
              </div>

              <div className="space-y-2 mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-400">
                {b.manager_name && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    <span>Manager: <strong className="text-white font-semibold">{b.manager_name}</strong></span>
                  </div>
                )}
                {b.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-mono text-slate-300">{b.phone}</span>
                  </div>
                )}
                {b.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>{b.address}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Opened {new Date(b.opened_date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-mono text-[11px] font-bold">OPERATIONAL</span>
              <span className="text-slate-400 font-mono text-[11px]">Branch ID #{b.branch_id}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Add Branch */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                <span>Configure New Branch</span>
              </h3>
              <button
                onClick={() => setAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddBranch} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Branch Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BR04"
                    value={newBranch.branch_code}
                    onChange={(e) => setNewBranch({ ...newBranch, branch_code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 font-mono text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">City</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Galle"
                    value={newBranch.city}
                    onChange={(e) => setNewBranch({ ...newBranch, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Branch Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Galle Fort Mega Mart"
                  value={newBranch.name}
                  onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Region</label>
                  <input
                    type="text"
                    placeholder="Southern"
                    value={newBranch.region}
                    onChange={(e) => setNewBranch({ ...newBranch, region: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Branch Manager</label>
                  <select
                    value={newBranch.manager_id}
                    onChange={(e) => setNewBranch({ ...newBranch, manager_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  >
                    <option value="">Select Manager</option>
                    {employees.map((e) => (
                      <option key={e.employee_id} value={e.employee_id}>
                        {e.full_name} ({e.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Street Address</label>
                <input
                  type="text"
                  placeholder="50 Rampart Street, Galle"
                  value={newBranch.address}
                  onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Contact Phone</label>
                <input
                  type="text"
                  placeholder="0912223344"
                  value={newBranch.phone}
                  onChange={(e) => setNewBranch({ ...newBranch, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 font-mono text-xs text-white"
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
                  disabled={isSubmitting}
                  className="w-2/3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
                >
                  Initialize Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
