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
  Edit2,
  Loader2,
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

  // Edit Branch Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    city: "",
    region: "",
    address: "",
    phone: "",
    manager_id: "",
    is_active: 1,
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const handleOpenEdit = (b: Branch) => {
    setSelectedBranch(b);
    setEditForm({
      name: b.name,
      city: b.city,
      region: b.region,
      address: b.address || "",
      phone: b.phone || "",
      manager_id: b.manager_id ? String(b.manager_id) : "",
      is_active: b.is_active ?? 1,
    });
    setEditModalOpen(true);
  };

  const handleUpdateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) return;
    setIsUpdating(true);
    try {
      const res = await fetch("/api/branches", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch_id: selectedBranch.branch_id,
          name: editForm.name,
          city: editForm.city,
          region: editForm.region,
          address: editForm.address,
          phone: editForm.phone,
          manager_id: editForm.manager_id ? Number(editForm.manager_id) : null,
          is_active: Number(editForm.is_active),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Branch "${editForm.name}" updated successfully!`, "success");
        setEditModalOpen(false);
        refreshAppData();
      } else {
        showToast(data.error || "Failed to update branch", "error");
      }
    } catch {
      showToast("Error updating branch", "error");
    } finally {
      setIsUpdating(false);
    }
  };
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
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Store className="w-6 h-6 text-blue-600" />
            <span>Supermarket Branches & Outlets</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Enterprise multi-branch configurations, location managers, and outlet operating status.
          </p>
        </div>

        <button
          onClick={() => setAddModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center gap-2 transition-all shrink-0"
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
            className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold">
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    {b.branch_code}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
              </div>

              <h2 className="text-lg font-bold text-slate-900">{b.name}</h2>
              <div className="text-xs text-slate-500 font-medium mt-0.5">
                {b.city}, {b.region} Region
              </div>

              <div className="space-y-2 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600">
                {b.manager_name && (
                  <div className="flex items-center gap-2 text-slate-700">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    <span>Manager: <strong className="text-slate-900 font-semibold">{b.manager_name}</strong></span>
                  </div>
                )}
                {b.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono text-slate-700">{b.phone}</span>
                  </div>
                )}
                {b.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-600">{b.address}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Opened {new Date(b.opened_date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span
                  className={`font-mono text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    b.is_active === 1
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}
                >
                  {b.is_active === 1 ? "OPERATIONAL" : "INACTIVE"}
                </span>
                <span className="text-slate-400 font-mono text-[11px]">#{b.branch_code}</span>
              </div>
              <button
                type="button"
                onClick={() => handleOpenEdit(b)}
                className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition-all flex items-center gap-1.5"
              >
                <Edit2 className="w-3 h-3 text-blue-600" />
                <span>Edit</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Add Branch */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>Configure New Branch</span>
              </h3>
              <button
                onClick={() => setAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddBranch} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-700 font-medium block mb-1">Branch Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BR04"
                    value={newBranch.branch_code}
                    onChange={(e) => setNewBranch({ ...newBranch, branch_code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-mono text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-700 font-medium block mb-1">City</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Galle"
                    value={newBranch.city}
                    onChange={(e) => setNewBranch({ ...newBranch, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-700 font-medium block mb-1">Branch Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Galle Fort Mega Mart"
                  value={newBranch.name}
                  onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-700 font-medium block mb-1">Region</label>
                  <input
                    type="text"
                    placeholder="Southern"
                    value={newBranch.region}
                    onChange={(e) => setNewBranch({ ...newBranch, region: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-700 font-medium block mb-1">Branch Manager</label>
                  <select
                    value={newBranch.manager_id}
                    onChange={(e) => setNewBranch({ ...newBranch, manager_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select Manager (Optional)</option>
                    {employees
                      .filter((e) => e.role === "MANAGER" && e.is_active === 1)
                      .map((m) => (
                        <option key={m.employee_id} value={m.employee_id}>
                          {m.full_name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-700 font-medium block mb-1">Street Address</label>
                <input
                  type="text"
                  placeholder="50 Rampart Street, Galle"
                  value={newBranch.address}
                  onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-700 font-medium block mb-1">Contact Phone</label>
                <input
                  type="text"
                  placeholder="0912223344"
                  value={newBranch.phone}
                  onChange={(e) => setNewBranch({ ...newBranch, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-mono text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-2/3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                >
                  Initialize Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Branch */}
      {editModalOpen && selectedBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-600" />
                <span>Edit Branch Details</span>
              </h3>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateBranch} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Branch Code</label>
                  <input
                    type="text"
                    disabled
                    value={selectedBranch.branch_code}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 font-mono text-xs text-slate-600 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-700 font-medium block mb-1">Operating Status</label>
                  <select
                    value={editForm.is_active}
                    onChange={(e) => setEditForm({ ...editForm, is_active: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value={1}>OPERATIONAL</option>
                    <option value={0}>INACTIVE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-700 font-medium block mb-1">Branch Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-700 font-medium block mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-700 font-medium block mb-1">Region</label>
                  <input
                    type="text"
                    required
                    value={editForm.region}
                    onChange={(e) => setEditForm({ ...editForm, region: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-700 font-medium block mb-1">Branch Manager</label>
                <select
                  value={editForm.manager_id}
                  onChange={(e) => setEditForm({ ...editForm, manager_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">None / Unassigned</option>
                  {employees
                    .filter((e) => e.role === "MANAGER" && e.is_active === 1)
                    .map((m) => (
                      <option key={m.employee_id} value={m.employee_id}>
                        {m.full_name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-700 font-medium block mb-1">Street Address</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-700 font-medium block mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-mono text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="w-2/3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Modifications</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
