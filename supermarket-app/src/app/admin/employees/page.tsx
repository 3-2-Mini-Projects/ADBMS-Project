"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/lib/context";
import { Employee, UserRole } from "@/lib/types";
import {
  UserCog,
  Plus,
  Search,
  ShieldCheck,
  Edit2,
  DollarSign,
  Calendar,
  Building2,
  Mail,
  Phone,
  Sparkles,
  X,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  KeyRound,
  Trash2,
  RotateCcw,
  Eye,
  Users,
  UserX,
  AlertTriangle,
  QrCode,
  Printer,
  Download,
  Store,
} from "lucide-react";

export default function EmployeesPage() {
  const { branches, showToast, refreshAppData } = useApp();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchFilter, setBranchFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [search, setSearch] = useState("");

  // Add Employee Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newEmp, setNewEmp] = useState({
    branch_id: "1",
    full_name: "",
    role: "CASHIER",
    email: "",
    phone: "",
    monthly_salary: "60000",
    hire_date: "",
  });
  const [isAdding, setIsAdding] = useState(false);
  const [createdActivation, setCreatedActivation] = useState<{
    full_name: string;
    email: string;
    role: string;
  } | null>(null);
  const [badgeModalOpen, setBadgeModalOpen] = useState(false);
  const [badgeData, setBadgeData] = useState<{
    employee_id: number;
    full_name: string;
    role: string;
    email: string;
    branch_name: string;
    badge_code: string;
    qr_data_url: string;
  } | null>(null);
  const [loadingBadge, setLoadingBadge] = useState(false);

  const loadBadgeForEmployee = async (empId: number) => {
    setLoadingBadge(true);
    try {
      const res = await fetch(`/api/employees/${empId}/badge`);
      const data = await res.json();
      if (res.ok && data.qr_data_url) {
        setBadgeData(data);
        setBadgeModalOpen(true);
      } else {
        showToast(data.error || "Failed to generate badge QR code", "error");
      }
    } catch {
      showToast("Error generating staff badge", "error");
    } finally {
      setLoadingBadge(false);
    }
  };
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "DELETED">("ACTIVE");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [empToDelete, setEmpToDelete] = useState<Employee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewDetailsEmp, setViewDetailsEmp] = useState<Employee | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleDeleteEmployee = async () => {
    if (!empToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/employees?employee_id=${empToDelete.employee_id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || `Deleted ${empToDelete.full_name}`, "info");
        setDeleteModalOpen(false);
        setEmpToDelete(null);
        fetchEmployees();
        refreshAppData();
      } else {
        showToast(data.error || "Failed to delete employee", "error");
      }
    } catch {
      showToast("Error deleting employee", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestoreEmployee = async (emp: Employee) => {
    setIsRestoring(true);
    try {
      const res = await fetch("/api/employees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: emp.employee_id,
          is_active: 1,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Restored "${emp.full_name}" to active staff!`, "success");
        if (viewDetailsEmp && viewDetailsEmp.employee_id === emp.employee_id) {
          setViewDetailsEmp(null);
        }
        fetchEmployees();
        refreshAppData();
      } else {
        showToast(data.error || "Failed to restore employee", "error");
      }
    } catch {
      showToast("Error restoring employee", "error");
    } finally {
      setIsRestoring(false);
    }
  };

  useEffect(() => {
    setNewEmp((prev) => ({
      ...prev,
      hire_date: new Date().toISOString().split("T")[0],
    }));
  }, []);

  // Edit Employee Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [editRole, setEditRole] = useState<UserRole>("CASHIER");
  const [editSalary, setEditSalary] = useState("");
  const [editActive, setEditActive] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (branchFilter) params.append("branchId", branchFilter);
      const res = await fetch(`/api/employees?${params.toString()}`);
      const data = await res.json();
      if (Array.isArray(data)) setEmployees(data);
    } catch (err) {
      console.error("Error fetching employees:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [branchFilter]);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newEmp,
          branch_id: Number(newEmp.branch_id),
          monthly_salary: Number(newEmp.monthly_salary),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Staff member "${newEmp.full_name}" registered!`, "success");
        setAddModalOpen(false);
        const empId = data.employee_id;
        setNewEmp({
          branch_id: "1",
          full_name: "",
          role: "CASHIER",
          email: "",
          phone: "",
          monthly_salary: "60000",
          hire_date: new Date().toISOString().split("T")[0],
        });
        fetchEmployees();
        refreshAppData();
        if (empId) {
          loadBadgeForEmployee(empId);
        }
      } else {
        showToast(data.error || "Failed to create employee", "error");
      }
    } catch {
      showToast("Error creating employee", "error");
    } finally {
      setIsAdding(false);
    }
  };

  const handleEditEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/employees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: selectedEmp.employee_id,
          role: editRole,
          monthly_salary: Number(editSalary),
          is_active: editActive,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Updated employee ${selectedEmp.full_name}`, "success");
        setEditModalOpen(false);
        fetchEmployees();
        refreshAppData();
      } else {
        showToast(data.error || "Update failed", "error");
      }
    } catch {
      showToast("Error updating employee", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const activeCount = employees.filter((e) => e.is_active === 1).length;
  const deletedCount = employees.filter((e) => e.is_active === 0).length;

  const filteredEmployees = employees.filter((e) => {
    const matchesSearch =
      e.full_name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter ? e.role === roleFilter : true;
    const matchesTab = activeTab === "ACTIVE" ? e.is_active === 1 : e.is_active === 0;
    return matchesSearch && matchesRole && matchesTab;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <UserCog className="w-6 h-6 text-purple-400" />
            <span>Staff & Employee Directory</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Maintain staff profiles, branch allocations, salary compensation, and system permission roles.
          </p>
        </div>

        <button
          onClick={() => setAddModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-950/40 flex items-center gap-2 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Staff Member</span>
        </button>
      </div>

      {/* Tabs: Active Staff vs Deleted / Former Staff */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("ACTIVE")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "ACTIVE"
              ? "bg-purple-600 text-white shadow-lg shadow-purple-900/40"
              : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Active Staff</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeTab === "ACTIVE" ? "bg-purple-800 text-purple-200" : "bg-slate-800 text-slate-400"
            }`}
          >
            {activeCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("DELETED")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "DELETED"
              ? "bg-rose-600 text-white shadow-lg shadow-rose-900/40"
              : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
          }`}
        >
          <UserX className="w-4 h-4" />
          <span>Deleted / Former Staff</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeTab === "DELETED" ? "bg-rose-800 text-rose-200" : "bg-slate-800 text-slate-400"
            }`}
          >
            {deletedCount}
          </span>
        </button>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff by name or email..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 font-mono focus:border-purple-500"
          />
        </div>

        <select
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          className="w-full sm:w-48 px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200"
        >
          <option value="">All Branches</option>
          {branches.map((b) => (
            <option key={b.branch_id} value={b.branch_id}>
              {b.name}
            </option>
          ))}
        </select>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-full sm:w-48 px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200"
        >
          <option value="">All Roles</option>
          <option value="ADMIN">ADMIN</option>
          <option value="MANAGER">MANAGER</option>
          <option value="CASHIER">CASHIER</option>
          <option value="STOCK_CLERK">STOCK_CLERK</option>
          <option value="CATALOG_MANAGER">CATALOG_MANAGER</option>
          <option value="MARKETING">MARKETING</option>
          <option value="HR">HR</option>
        </select>
      </div>

      {/* Employees Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                <th className="py-3.5 px-4 font-semibold">Staff Name</th>
                <th className="py-3.5 px-4 font-semibold text-center">System Role</th>
                <th className="py-3.5 px-4 font-semibold">Assigned Branch</th>
                <th className="py-3.5 px-4 font-semibold">Contact</th>
                <th className="py-3.5 px-4 font-semibold">Hire Date</th>
                <th className="py-3.5 px-4 font-semibold text-right">Monthly Salary</th>
                <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                <th className="py-3.5 px-4 font-semibold text-center">Activation</th>
                <th className="py-3.5 px-4 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <Sparkles className="w-5 h-5 animate-spin mx-auto text-purple-400 mb-2" />
                    Loading staff records...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    No employees matching filters.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.employee_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 text-xs font-bold">
                          {emp.full_name[0]}
                        </div>
                        <span>{emp.full_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                          emp.role === "ADMIN"
                            ? "bg-purple-950/60 text-purple-300 border border-purple-800/60"
                            : emp.role === "MANAGER"
                            ? "bg-blue-950/60 text-blue-300 border border-blue-800/60"
                            : emp.role === "CASHIER"
                            ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/60"
                            : "bg-slate-800 text-slate-300 border border-slate-700"
                        }`}
                      >
                        {emp.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{emp.branch_name}</td>
                    <td className="py-3 px-4 text-slate-400">
                      <div>{emp.email}</div>
                      <div className="font-mono text-[11px] text-slate-500">{emp.phone || "—"}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {new Date(emp.hire_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-200">
                      Rs. {Number(emp.monthly_salary).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                          emp.is_active === 1
                            ? "bg-emerald-950/40 text-emerald-400"
                            : "bg-rose-950/40 text-rose-400"
                        }`}
                      >
                        {emp.is_active === 1 ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {emp.is_activated ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Activated</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-400 border border-amber-800/60 font-semibold">
                          <Clock className="w-3 h-3" />
                          <span>Pending</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {emp.is_active === 1 ? (
                          <>
                            <button
                              onClick={() => loadBadgeForEmployee(emp.employee_id)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-sky-600 text-slate-300 hover:text-white transition-colors"
                              title="View & Print Staff QR Badge"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedEmp(emp);
                                setEditRole(emp.role);
                                setEditSalary(String(emp.monthly_salary));
                                setEditActive(emp.is_active);
                                setEditModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-purple-600 text-slate-300 hover:text-white transition-colors"
                              title="Edit employee"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setEmpToDelete(emp);
                                setDeleteModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors"
                              title="Delete employee"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setViewDetailsEmp(emp)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white text-[11px] font-semibold transition-colors flex items-center gap-1"
                              title="View former staff details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Details</span>
                            </button>
                            <button
                              onClick={() => handleRestoreEmployee(emp)}
                              disabled={isRestoring}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white text-[11px] font-semibold transition-colors flex items-center gap-1"
                              title="Restore staff member"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Restore</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Employee */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-400" />
                <span>Register Staff Account</span>
              </h3>
              <button
                onClick={() => setAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ruwan Jayasuriya"
                  value={newEmp.full_name}
                  onChange={(e) => setNewEmp({ ...newEmp, full_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Assigned Branch</label>
                  <select
                    value={newEmp.branch_id}
                    onChange={(e) => setNewEmp({ ...newEmp, branch_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  >
                    {branches.map((b) => (
                      <option key={b.branch_id} value={b.branch_id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">System Role</label>
                  <select
                    value={newEmp.role}
                    onChange={(e) => setNewEmp({ ...newEmp, role: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  >
                    <option value="CASHIER">CASHIER</option>
                    <option value="MANAGER">MANAGER</option>
                    <option value="STOCK_CLERK">STOCK_CLERK</option>
                    <option value="CATALOG_MANAGER">CATALOG_MANAGER</option>
                    <option value="MARKETING">MARKETING</option>
                    <option value="HR">HR</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Email</label>
                <input
                  type="email"
                  required
                  placeholder="ruwan@shop.lk"
                  value={newEmp.email}
                  onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="0771234567"
                    value={newEmp.phone}
                    onChange={(e) => setNewEmp({ ...newEmp, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 font-mono text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Monthly Salary (Rs.)</label>
                  <input
                    type="number"
                    value={newEmp.monthly_salary}
                    onChange={(e) => setNewEmp({ ...newEmp, monthly_salary: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 font-mono text-xs text-white font-bold"
                  />
                </div>
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
                  className="w-2/3 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold"
                >
                  Create Staff Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Employee */}
      {editModalOpen && selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-purple-400" />
                <span>Edit Staff: {selectedEmp.full_name}</span>
              </h3>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditEmployee} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Role & Permissions</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="MANAGER">MANAGER</option>
                  <option value="CASHIER">CASHIER</option>
                  <option value="STOCK_CLERK">STOCK_CLERK</option>
                  <option value="CATALOG_MANAGER">CATALOG_MANAGER</option>
                  <option value="MARKETING">MARKETING</option>
                  <option value="HR">HR</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Monthly Salary (Rs.)</label>
                <input
                  type="number"
                  value={editSalary}
                  onChange={(e) => setEditSalary(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 font-mono text-xs text-white font-bold"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Status</label>
                <select
                  value={editActive}
                  onChange={(e) => setEditActive(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                >
                  <option value={1}>ACTIVE</option>
                  <option value={0}>INACTIVE</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-2/3 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold"
                >
                  Save Modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Activation Invitation Modal */}
      {/* Modal: Staff Identification Badge & QR Code */}
      {badgeModalOpen && badgeData && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <QrCode className="w-4 h-4 text-sky-400" />
                <span>Official Staff Identification Badge</span>
              </div>
              <button
                onClick={() => setBadgeModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable ID Card Container */}
            <div
              id="staff-id-badge-card"
              className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border border-slate-700 rounded-2xl p-5 shadow-xl text-center space-y-4 relative overflow-hidden"
            >
              {/* Top Card Accent */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-left">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-sky-600 to-blue-600 flex items-center justify-center text-white">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-black text-white tracking-wider uppercase">Supermarket ADBMS</div>
                    <div className="text-[9px] text-slate-400 font-medium">{badgeData.branch_name}</div>
                  </div>
                </div>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800/60">
                  {badgeData.badge_code}
                </span>
              </div>

              {/* Avatar, Name & Role */}
              <div className="space-y-1">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white text-xl font-bold mx-auto shadow-md">
                  {badgeData.full_name[0]}
                </div>
                <h2 className="text-base font-bold text-white pt-1">{badgeData.full_name}</h2>
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-950/80 text-blue-300 border border-blue-800/60 font-bold uppercase tracking-wider">
                    {badgeData.role}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">{badgeData.email}</div>
              </div>

              {/* Scannable Cryptographic QR Code */}
              <div className="p-3 bg-white rounded-2xl inline-block mx-auto shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={badgeData.qr_data_url}
                  alt="Staff Attendance QR Code"
                  className="w-40 h-40 object-contain mx-auto"
                />
              </div>

              <div className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">
                Hold under store scanner to clock in / out
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setBadgeModalOpen(false)}
                className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Done
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="w-2/3 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-950/50"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Staff ID Badge</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {deleteModalOpen && empToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <span>Delete Staff Member</span>
              </div>
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-800/30 space-y-2">
              <div className="text-xs font-semibold text-rose-300">
                Are you sure you want to delete {empToDelete.full_name}?
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Their system credentials will be deactivated immediately. Their profile and employment history will be archived under <strong>Deleted / Former Staff</strong> while preserving historical sales, shifts, and audit records.
              </p>
              <div className="text-xs font-mono text-slate-400 pt-1">
                Role: <strong className="text-slate-200">{empToDelete.role}</strong> • Email: <strong className="text-slate-200">{empToDelete.email}</strong>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteEmployee}
                className="w-2/3 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-rose-950/50"
              >
                {isDeleting ? "Deleting..." : "Confirm Deletion"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: View Former Staff Details */}
      {viewDetailsEmp && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <UserCog className="w-5 h-5 text-rose-400" />
                <span>Former Staff Details</span>
              </div>
              <button
                onClick={() => setViewDetailsEmp(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-rose-950/50 border border-rose-800/40 flex items-center justify-center text-rose-400 text-lg font-bold">
                {viewDetailsEmp.full_name[0]}
              </div>
              <div>
                <div className="text-base font-bold text-white flex items-center gap-2">
                  <span>{viewDetailsEmp.full_name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-800/50 font-bold">
                    DELETED / INACTIVE
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  Employee ID #{viewDetailsEmp.employee_id} • Assigned Role: <strong className="text-blue-400">{viewDetailsEmp.role}</strong>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <div className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span>Email Address</span>
                </div>
                <div className="text-slate-200 font-mono">{viewDetailsEmp.email}</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <div className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span>Contact Phone</span>
                </div>
                <div className="text-slate-200 font-mono">{viewDetailsEmp.phone || "—"}</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <div className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Assigned Branch</span>
                </div>
                <div className="text-slate-200">{viewDetailsEmp.branch_name || `Branch #${viewDetailsEmp.branch_id}`}</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <div className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Hire Date</span>
                </div>
                <div className="text-slate-200 font-mono">{new Date(viewDetailsEmp.hire_date).toLocaleDateString()}</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <div className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                  <span>Monthly Salary</span>
                </div>
                <div className="text-slate-200 font-mono font-bold">
                  Rs. {Number(viewDetailsEmp.monthly_salary).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <div className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Activation Record</span>
                </div>
                <div className="text-slate-200">
                  {viewDetailsEmp.is_activated ? "Password Configured" : "Unactivated"}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setViewDetailsEmp(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Close
              </button>
              <button
                type="button"
                disabled={isRestoring}
                onClick={() => handleRestoreEmployee(viewDetailsEmp)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-950/50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore to Active Staff</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
