"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/lib/context";
import { canAccess, PermissionKey } from "@/lib/permissions";
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  RotateCcw,
  Package,
  Layers,
  Truck,
  Boxes,
  FileSpreadsheet,
  Users,
  Tag,
  UserCog,
  Clock,
  Store,
  BarChart3,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Lock,
} from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: any;
  permission?: PermissionKey;
  badge?: string;
  highlight?: boolean;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    group: "OPERATIONS",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "POS Checkout", href: "/pos", icon: ShoppingCart, permission: "create_pos_sales", badge: "Live", highlight: true },
      { title: "Sales History", href: "/sales", icon: Receipt },
      { title: "Returns & Refunds", href: "/returns", icon: RotateCcw, permission: "process_returns" },
    ],
  },
  {
    group: "CATALOG & INVENTORY",
    items: [
      { title: "Products", href: "/products", icon: Package, permission: "manage_catalog" },
      { title: "Categories", href: "/categories", icon: Layers, permission: "manage_catalog" },
      { title: "Suppliers", href: "/suppliers", icon: Truck },
      { title: "Inventory & Batches", href: "/inventory", icon: Boxes, permission: "manage_inventory" },
      { title: "Purchase Orders", href: "/purchases", icon: FileSpreadsheet, permission: "receive_purchases" },
    ],
  },
  {
    group: "MARKETING & LOYALTY",
    items: [
      { title: "Customers & Loyalty", href: "/customers", icon: Users },
      { title: "Promotions & Coupons", href: "/promotions", icon: Tag, permission: "manage_promotions" },
    ],
  },
  {
    group: "MANAGEMENT & AUDIT",
    items: [
      { title: "Employees", href: "/employees", icon: UserCog, permission: "manage_employees" },
      { title: "Shifts & Attendance", href: "/shifts", icon: Clock },
      { title: "Branches", href: "/branches", icon: Store, permission: "manage_branches" },
      { title: "Reports & SQL Views", href: "/reports", icon: BarChart3, permission: "view_reports", badge: "ADBMS" },
      { title: "Audit & Error Logs", href: "/audit", icon: ShieldAlert, permission: "view_audit_log" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { currentEmployee, currentBranch } = useApp();
  const [collapsed, setCollapsed] = useState(false);

  const role = currentEmployee?.role ?? "ADMIN";

  return (
    <aside
      className={`relative z-40 bg-slate-950 border-r border-slate-800 transition-all duration-300 flex flex-col justify-between select-none ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Brand Header */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          {!collapsed ? (
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                  <span>NEXUS</span>
                  <span className="text-blue-400 font-extrabold">SUPER</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono tracking-wider">
                  ADBMS OLTP v2.0
                </div>
              </div>
            </Link>
          ) : (
            <div className="mx-auto w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5" />
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Current Branch Pill if expanded */}
        {!collapsed && currentBranch && (
          <div className="mx-3 mt-3 px-3 py-2 rounded-lg bg-slate-900/90 border border-slate-800/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Store className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-300 font-medium truncate max-w-[130px]">{currentBranch.name}</span>
            </div>
            <span className="font-mono text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
              {currentBranch.branch_code}
            </span>
          </div>
        )}

        {/* Navigation List */}
        <div className="px-3 py-3 space-y-5 overflow-y-auto max-h-[calc(100vh-140px)]">
          {NAV_GROUPS.map((group) => {
            return (
              <div key={group.group} className="space-y-1">
                {!collapsed && (
                  <div className="px-2 text-[10px] font-semibold text-slate-400 tracking-wider">
                    {group.group}
                  </div>
                )}
                {group.items.map((item) => {
                  const allowed = !item.permission || canAccess(role, item.permission);
                  const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

                  if (!allowed && role === "CASHIER" && item.permission) {
                    // Filter restricted items for cashier
                    return null;
                  }

                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        active
                          ? item.highlight
                            ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/30 font-semibold"
                            : "bg-blue-600 text-white shadow-lg shadow-blue-900/30 font-semibold"
                          : item.highlight
                          ? "bg-emerald-950/30 text-emerald-300 border border-emerald-800/40 hover:bg-emerald-900/40"
                          : "text-slate-400 hover:text-slate-100 hover:bg-slate-900"
                      } ${!allowed ? "opacity-60" : ""}`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${active ? "text-white" : item.highlight ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-200"}`} />
                      {!collapsed && (
                        <div className="flex items-center justify-between w-full">
                          <span className="truncate">{item.title}</span>
                          <div className="flex items-center gap-1.5">
                            {!allowed && <Lock className="w-3 h-3 text-amber-500/80" />}
                            {item.badge && (
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                                  item.highlight ? "bg-emerald-400 text-emerald-950" : "bg-blue-400/20 text-blue-300"
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* User Footer */}
      {!collapsed ? (
        <div className="p-3 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
              {currentEmployee?.full_name ? currentEmployee.full_name[0] : "A"}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-slate-200 truncate">
                {currentEmployee?.full_name ?? "Administrator"}
              </div>
              <div className="text-[10px] text-emerald-400 font-mono">
                {currentEmployee?.role ?? "ADMIN"}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 border-t border-slate-800 flex justify-center">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
            {currentEmployee?.full_name ? currentEmployee.full_name[0] : "A"}
          </div>
        </div>
      )}
    </aside>
  );
}
