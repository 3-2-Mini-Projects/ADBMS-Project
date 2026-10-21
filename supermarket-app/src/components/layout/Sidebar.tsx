"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/lib/context";
import { canAccess, PermissionKey } from "@/lib/permissions";
import {
  LayoutDashboard,
  AlertTriangle,
  ShoppingCart,
  Receipt,
  RotateCcw,
  Package,
  Layers,
  Truck,
  Boxes,
  ClipboardCheck,
  FileSpreadsheet,
  Users,
  Tag,
  UserCog,
  Clock,
  Store,
  BarChart3,
  ShieldAlert,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Lock,
  PackagePlus,
  Settings,
  UserCircle,
  LogOut,
  LayoutGrid,
  Award,
  Ticket,
  KeyRound,
  ArrowLeftRight,
  Trophy,
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

const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    group: "ADMINISTRATION",
    items: [
      { title: "Admin Console", href: "/admin", icon: ShieldCheck, badge: "Admin", highlight: true },
      { title: "Branch Management", href: "/admin/branches", icon: Store, permission: "manage_branches" },
      { title: "Employee & Roles", href: "/admin/employees", icon: UserCog, permission: "manage_employees" },
      { title: "Staff Shifts & Roster", href: "/shifts", icon: Clock },
    ],
  },
  {
    group: "INVENTORY & PURCHASING",
    items: [
      { title: "Inventory", href: "/inventory", icon: Boxes },
      { title: "Stock Transfers", href: "/inventory/transfers", icon: ArrowLeftRight, badge: "Live" },
      { title: "Purchase Orders", href: "/purchases", icon: FileSpreadsheet },
    ],
  },
  {
    group: "SECURITY & AUDIT",
    items: [
      { title: "Audit Trail & Logs", href: "/admin/audit", icon: ShieldAlert, badge: "Security", permission: "view_audit_log" },
      { title: "Reports & SQL Views", href: "/admin/reports", icon: BarChart3, badge: "ADBMS", permission: "view_reports" },
    ],
  },
  {
    group: "SYSTEM & ACCOUNT",
    items: [
      { title: "System Settings", href: "/admin/settings", icon: Settings },
      { title: "Admin Profile", href: "/profile", icon: UserCircle },
      { title: "Logout", href: "/logout", icon: LogOut },
    ],
  },
];

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
      { title: "Inventory Dashboard", href: "/inventory/dashboard", icon: LayoutGrid, permission: "manage_inventory", badge: "New" },
      { title: "Inventory & Batches", href: "/inventory", icon: Boxes, permission: "manage_inventory" },
      { title: "Stock Alerts", href: "/inventory/stock-alerts", icon: AlertTriangle, permission: "manage_inventory" },
      { title: "Batch Tracker", href: "/inventory/batches", icon: Clock, permission: "manage_inventory" },
      { title: "Reorder Planning", href: "/inventory/reorder-suggestions", icon: Sparkles, permission: "manage_inventory" },
      { title: "Stock Transfers", href: "/inventory/transfers", icon: ArrowLeftRight, permission: "manage_inventory", badge: "Live" },
      { title: "Purchase Orders", href: "/purchases", icon: FileSpreadsheet, permission: "receive_purchases" },
      { title: "Suppliers", href: "/suppliers", icon: Truck },
      { title: "Products", href: "/products", icon: Package, permission: "manage_catalog" },
      { title: "Categories", href: "/categories", icon: Layers, permission: "manage_catalog" },
    ],
  },
  {
    group: "MARKETING & LOYALTY",
    items: [
      { title: "Customers & Loyalty", href: "/customers", icon: Users },
      { title: "Top 10 Loyalty Report", href: "/marketing/reports/top-loyalty-customers", icon: Trophy, badge: "Report" },
      { title: "Promotions & Coupons", href: "/promotions", icon: Tag, permission: "manage_promotions" },
    ],
  },
  {
    group: "MANAGEMENT & AUDIT",
    items: [
      { title: "Employees", href: "/admin/employees", icon: UserCog, permission: "manage_employees" },
      { title: "Shifts & Attendance", href: "/shifts", icon: Clock },
      { title: "Branches", href: "/admin/branches", icon: Store, permission: "manage_branches" },
      { title: "Reports & SQL Views", href: "/admin/reports", icon: BarChart3, permission: "view_reports", badge: "ADBMS" },
      { title: "Audit & Error Logs", href: "/admin/audit", icon: ShieldAlert, permission: "view_audit_log" },
    ],
  },
];

const CLERK_NAV_GROUPS: NavGroup[] = [
  {
    group: "INVENTORY",
    items: [
      { title: "Inventory Dashboard", href: "/inventory/dashboard", icon: LayoutGrid, badge: "New" },
      { title: "Inventory", href: "/inventory", icon: Boxes },
      { title: "Product Batches", href: "/inventory/batches", icon: PackagePlus },
      { title: "Stock Alerts", href: "/inventory/stock-alerts", icon: AlertTriangle },
      { title: "Reorder Suggestions", href: "/inventory/reorder-suggestions", icon: ClipboardCheck },
    ],
  },
  {
    group: "PURCHASING & TRANSFERS",
    items: [
      { title: "Purchase Orders", href: "/purchases", icon: FileSpreadsheet },
      { title: "Create Purchase Order", href: "/purchases/new", icon: ClipboardCheck },
      { title: "Stock Transfers", href: "/inventory/transfers", icon: ArrowLeftRight, badge: "Live" },
    ],
  },
  {
    group: "ACCOUNT",
    items: [
      { title: "My Profile", href: "/profile", icon: UserCircle },
      { title: "Settings", href: "/settings", icon: Settings },
      { title: "Logout", href: "/logout", icon: LogOut },
    ],
  },
];

const MARKETING_NAV_GROUPS: NavGroup[] = [
  {
    group: "MARKETING",
    items: [
      { title: "Dashboard", href: "/marketing/dashboard", icon: LayoutDashboard },
      { title: "Customer Management", href: "/marketing/customers", icon: Users },
      { title: "Loyalty Management", href: "/marketing/loyalty", icon: Award },
      { title: "Top 10 Loyalty Report", href: "/marketing/reports/top-loyalty-customers", icon: Trophy, badge: "Report" },
      { title: "Promotion Management", href: "/marketing/promotions", icon: Tag },
      { title: "Coupon Management", href: "/marketing/coupons", icon: Ticket },
      { title: "Marketing Reports", href: "/marketing/reports", icon: BarChart3 },
    ],
  },
  {
    group: "ACCOUNT",
    items: [
      { title: "My Profile", href: "/profile", icon: UserCircle },
      { title: "Change Password", href: "/change-password", icon: KeyRound },
      { title: "Logout", href: "/logout", icon: LogOut },
    ],
  },
];

const CATALOG_NAV_GROUPS: NavGroup[] = [
  {
    group: "CATALOG MANAGEMENT",
    items: [
      { title: "Products", href: "/products", icon: Package },
      { title: "Categories", href: "/categories", icon: Layers },
      { title: "Suppliers", href: "/suppliers", icon: Truck },
    ],
  },
  {
    group: "INVENTORY OVERVIEW",
    items: [
      { title: "Inventory Dashboard", href: "/inventory/dashboard", icon: LayoutGrid },
      { title: "Inventory Stock", href: "/inventory", icon: Boxes },
      { title: "Product Batches", href: "/inventory/batches", icon: PackagePlus },
      { title: "Stock Alerts", href: "/inventory/stock-alerts", icon: AlertTriangle },
    ],
  },
  {
    group: "ACCOUNT",
    items: [
      { title: "My Profile", href: "/profile", icon: UserCircle },
      { title: "Settings", href: "/settings", icon: Settings },
      { title: "Logout", href: "/logout", icon: LogOut },
    ],
  },
];

const CASHIER_NAV_GROUPS: NavGroup[] = [
  {
    group: "POINT OF SALE",
    items: [
      { title: "Cashier Dashboard", href: "/cashier/dashboard", icon: LayoutDashboard },
      { title: "POS Checkout", href: "/pos", icon: ShoppingCart, badge: "Live", highlight: true },
      { title: "Sales History", href: "/sales", icon: Receipt },
      { title: "Returns & Refunds", href: "/returns", icon: RotateCcw },
    ],
  },
  {
    group: "CUSTOMERS & SHIFTS",
    items: [
      { title: "Customers & Loyalty", href: "/customers", icon: Users },
      { title: "Shifts & Attendance", href: "/shifts", icon: Clock },
    ],
  },
  {
    group: "ACCOUNT",
    items: [
      { title: "My Profile", href: "/profile", icon: UserCircle },
      { title: "Logout", href: "/logout", icon: LogOut },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { currentEmployee, currentBranch } = useApp();
  const [collapsed, setCollapsed] = useState(false);

  if (pathname === "/login") {
    return null;
  }

  const role = currentEmployee?.role ?? "ADMIN";
  const isAdmin = role === "ADMIN";
  const navGroups =
    isAdmin
      ? ADMIN_NAV_GROUPS
      : role === "STOCK_CLERK"
        ? CLERK_NAV_GROUPS
        : role === "CATALOG_MANAGER"
          ? CATALOG_NAV_GROUPS
          : role === "MARKETING"
            ? MARKETING_NAV_GROUPS
            : role === "CASHIER"
              ? CASHIER_NAV_GROUPS
              : NAV_GROUPS;

  return (
    <aside
      className={`relative z-40 bg-slate-950 border-r border-slate-800 transition-all duration-300 flex flex-col justify-between select-none ${collapsed ? "w-20" : "w-64"
        }`}
    >
      {/* Brand Header */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          {!collapsed ? (
            <Link
              href={
                role === "MARKETING"
                  ? "/marketing/dashboard"
                  : role === "STOCK_CLERK"
                  ? "/inventory/dashboard"
                  : role === "CASHIER"
                  ? "/cashier/dashboard"
                  : "/dashboard"
              }
              className="flex items-center gap-2.5"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                  <span>NEXUS</span>
                  <span className={isAdmin ? "text-purple-400 font-extrabold" : "text-blue-400 font-extrabold"}>
                    {isAdmin ? "ADMIN" : "SUPER"}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono tracking-wider">
                  {isAdmin ? "ADMIN PORTAL v2.0" : "ADBMS OLTP v2.0"}
                </div>
              </div>
            </Link>
          ) : (
            <div
              className={`mx-auto w-9 h-9 rounded-xl flex items-center justify-center text-white ${isAdmin
                  ? "bg-gradient-to-tr from-purple-600 to-indigo-600"
                  : "bg-gradient-to-tr from-blue-600 to-emerald-500"
                }`}
            >
              {isAdmin ? <ShieldCheck className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
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
              <Store className={`w-3.5 h-3.5 ${isAdmin ? "text-purple-400" : "text-blue-400"}`} />
              <span className="text-slate-300 font-medium truncate max-w-[130px]">{currentBranch.name}</span>
            </div>
            <span className="font-mono text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
              {currentBranch.branch_code}
            </span>
          </div>
        )}

        {/* Navigation List */}
        <div className="px-3 py-3 space-y-5 overflow-y-auto max-h-[calc(100vh-140px)]">
          {navGroups.map((group) => {
            return (
              <div key={group.group} className="space-y-1">
                {!collapsed && (
                  <div className="px-2 text-[10px] font-semibold text-slate-400 tracking-wider">
                    {group.group}
                  </div>
                )}
                {group.items.map((item) => {
                  const allowed = !item.permission || canAccess(role, item.permission);
                  const active =
                    pathname === item.href ||
                    (item.href !== "/dashboard" &&
                      item.href !== "/marketing/dashboard" &&
                      pathname.startsWith(item.href)) ||
                    (item.href === "/marketing/dashboard" &&
                      (pathname === "/marketing/dashboard" ||
                        pathname === "/marketing" ||
                        (pathname === "/dashboard" && role === "MARKETING"))) ||
                    (item.href === "/marketing/customers" && pathname.startsWith("/customers")) ||
                    (item.href === "/marketing/promotions" && pathname.startsWith("/promotions")) ||
                    (item.href === "/marketing/reports" && pathname.startsWith("/reports"));

                  if (!allowed && role === "CASHIER" && item.permission) {
                    // Filter restricted items for cashier
                    return null;
                  }

                  const Icon = item.icon;

                  return (
                    <Link
                      key={`${item.href}-${item.title}`}
                      href={item.href}
                      className={`group relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${active
                          ? isAdmin
                            ? item.highlight
                              ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-900/40 font-semibold"
                              : "bg-purple-600 text-white shadow-lg shadow-purple-900/30 font-semibold"
                            : item.highlight
                              ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/30 font-semibold"
                              : "bg-blue-600 text-white shadow-lg shadow-blue-900/30 font-semibold"
                          : item.highlight
                            ? isAdmin
                              ? "bg-purple-950/40 text-purple-300 border border-purple-800/50 hover:bg-purple-900/40"
                              : "bg-emerald-950/30 text-emerald-300 border border-emerald-800/40 hover:bg-emerald-900/40"
                            : "text-slate-400 hover:text-slate-100 hover:bg-slate-900"
                        } ${!allowed ? "opacity-60" : ""}`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${active
                            ? "text-white"
                            : item.highlight
                              ? isAdmin
                                ? "text-purple-400"
                                : "text-emerald-400"
                              : "text-slate-400 group-hover:text-slate-200"
                          }`}
                      />
                      {!collapsed && (
                        <div className="flex items-center justify-between w-full">
                          <span className="truncate">{item.title}</span>
                          <div className="flex items-center gap-1.5">
                            {!allowed && <Lock className="w-3 h-3 text-amber-500/80" />}
                            {item.badge && (
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${isAdmin
                                    ? item.highlight
                                      ? "bg-purple-300 text-purple-950"
                                      : "bg-purple-400/20 text-purple-300 border border-purple-500/30"
                                    : item.highlight
                                      ? "bg-emerald-400 text-emerald-950"
                                      : "bg-blue-400/20 text-blue-300"
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
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${isAdmin
                  ? "bg-gradient-to-tr from-purple-600 to-indigo-600"
                  : "bg-gradient-to-tr from-blue-600 to-indigo-500"
                }`}
            >
              {currentEmployee?.full_name ? currentEmployee.full_name[0] : "A"}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-slate-200 truncate">
                {currentEmployee?.full_name ?? "Administrator"}
              </div>
              <div
                className={`text-[10px] font-mono font-semibold ${isAdmin ? "text-purple-400" : "text-emerald-400"
                  }`}
              >
                {isAdmin ? "SUPER ADMIN" : currentEmployee?.role ?? "STAFF"}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 border-t border-slate-800 flex justify-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${isAdmin ? "bg-purple-600" : "bg-blue-600"
              }`}
          >
            {currentEmployee?.full_name ? currentEmployee.full_name[0] : "A"}
          </div>
        </div>
      )}
    </aside>
  );
}
