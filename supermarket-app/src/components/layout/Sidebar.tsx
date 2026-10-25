"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/lib/context";
import { canAccess, PermissionKey } from "@/lib/permissions";
import { UserRole } from "@/lib/types";
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
  LayoutGrid,
  Award,
  Ticket,
  KeyRound,
  ArrowLeftRight,
  PackageSearch,
  Bell,
  History,
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
    group: "SECURITY & AUDIT",
    items: [
      { title: "Audit Trail & Logs", href: "/admin/audit", icon: ShieldAlert, badge: "Security", permission: "view_audit_log" },
      { title: "Reports & SQL Views", href: "/admin/reports", icon: BarChart3, badge: "ADBMS", permission: "view_reports" },
    ],
  },
  {
    group: "SYSTEM & ACCOUNT",
    items: [
      { title: "My Profile", href: "/profile", icon: UserCircle },
      { title: "Sign-in History", href: "/activity", icon: History },
      { title: "System Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

const NAV_GROUPS: NavGroup[] = [
  {
    group: "OPERATIONS",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "POS Checkout", href: "/cashier/pos", icon: ShoppingCart, permission: "create_pos_sales", badge: "Live", highlight: true },
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
  {
    group: "ACCOUNT",
    items: [
      { title: "My Profile", href: "/profile", icon: UserCircle },
      { title: "Sign-in History", href: "/activity", icon: History },
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
      { title: "Sign-in History", href: "/activity", icon: History },
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
      { title: "Promotion Management", href: "/marketing/promotions", icon: Tag },
      { title: "Marketing Reports", href: "/marketing/reports", icon: BarChart3 },
    ],
  },
  {
    group: "ACCOUNT",
    items: [
      { title: "My Profile", href: "/profile", icon: UserCircle },
      { title: "Sign-in History", href: "/activity", icon: History },
    ],
  },
];

const CATALOG_NAV_GROUPS: NavGroup[] = [
  {
    group: "CATALOG MANAGEMENT",
    items: [
      { title: "Catalog Dashboard", href: "/catalog", icon: LayoutDashboard, badge: "Hub", highlight: true },
      { title: "Products", href: "/products", icon: Package },
      { title: "Price History & Approvals", href: "/catalog/price-history", icon: ShieldAlert },
      { title: "Slow Movers Hub", href: "/catalog/slow-movers", icon: AlertTriangle },
      { title: "Categories", href: "/categories", icon: Layers },
      { title: "Suppliers", href: "/suppliers", icon: Truck },
    ],
  },
  {
    group: "ACCOUNT",
    items: [
      { title: "My Profile", href: "/profile", icon: UserCircle },
      { title: "Sign-in History", href: "/activity", icon: History },
    ],
  },
];

const CASHIER_NAV_GROUPS: NavGroup[] = [
  {
    group: "POINT OF SALE",
    items: [
      { title: "Cashier Dashboard", href: "/cashier/dashboard", icon: LayoutDashboard },
      { title: "POS Checkout", href: "/cashier/pos", icon: ShoppingCart, badge: "Live", highlight: true },
      { title: "Transaction History", href: "/cashier/history", icon: Receipt },
      { title: "Daily Summary", href: "/cashier/summary", icon: FileSpreadsheet },
      { title: "Returns & Refunds", href: "/cashier/returns", icon: RotateCcw },
    ],
  },
  {
    group: "STOCK & ACTIVITY",
    items: [
      { title: "Price & Stock Lookup", href: "/cashier/products", icon: PackageSearch },
      { title: "Customers & Loyalty", href: "/customers", icon: Users },
    ],
  },
  {
    group: "ACCOUNT",
    items: [
      { title: "My Profile", href: "/cashier/profile", icon: UserCircle },
      { title: "Sign-in History", href: "/cashier/activity", icon: History },
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

  const cachedRole =
    typeof window !== "undefined"
      ? (localStorage.getItem("adbms_cached_role") as UserRole | null)
      : null;
  const role: UserRole =
    currentEmployee?.role ||
    cachedRole ||
    (pathname.startsWith("/cashier") ? "CASHIER" : "CASHIER");
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

  const cleanPath = pathname?.replace(/\/$/, "") || "/";

  // Resolve exactly one active navigation item so multiple buttons don't light up simultaneously
  const resolveActiveHref = (): string | null => {
    // Role-specific aliases & landing pages
    if (role === "CASHIER" && cleanPath === "/dashboard") {
      return "/cashier/dashboard";
    }

    if (role === "CATALOG_MANAGER" && cleanPath === "/dashboard") {
      return "/catalog";
    }

    if (role === "STOCK_CLERK" && (cleanPath === "/dashboard" || cleanPath === "/inventory/clerk")) {
      return "/inventory/dashboard";
    }

    if (role === "MARKETING") {
      if (cleanPath === "/marketing" || cleanPath === "/dashboard") {
        return "/marketing/dashboard";
      }
      if (cleanPath === "/customers" || cleanPath.startsWith("/customers/")) {
        return "/marketing/customers";
      }
      if (cleanPath === "/promotions" || cleanPath.startsWith("/promotions/")) {
        return "/marketing/promotions";
      }
      if (cleanPath === "/reports" || cleanPath.startsWith("/reports/")) {
        return "/marketing/reports";
      }
    }

    const allItems = navGroups.flatMap((g) => g.items);

    // 1. Direct exact match (highest priority)
    const exactMatch = allItems.find((item) => item.href === cleanPath);
    if (exactMatch) {
      return exactMatch.href;
    }

    // 2. Best prefix match (longest matching item.href)
    // Ensures sub-routes like /purchases/[id] map to /purchases,
    // while preventing parent routes (e.g. /inventory) from overriding specific routes (e.g. /inventory/transfers)
    const prefixMatches = allItems.filter((item) => {
      if (item.href === "/" || item.href === "/dashboard" || item.href === "/marketing/dashboard") {
        return false;
      }
      return cleanPath.startsWith(`${item.href}/`);
    });

    if (prefixMatches.length > 0) {
      prefixMatches.sort((a, b) => b.href.length - a.href.length);
      return prefixMatches[0].href;
    }

    return null;
  };

  const activeHref = resolveActiveHref();

  return (
    <aside
      className={`relative z-40 bg-white border-r border-slate-200 shadow-sm transition-all duration-300 flex flex-col justify-between select-none ${collapsed ? "w-20" : "w-64"
        }`}
    >
      {/* Brand Header */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 bg-white">
          {!collapsed ? (
            <Link
              href={
                role === "CATALOG_MANAGER"
                  ? "/catalog"
                  : role === "MARKETING"
                    ? "/marketing/dashboard"
                    : role === "STOCK_CLERK"
                      ? "/inventory/dashboard"
                      : role === "CASHIER"
                        ? "/cashier/dashboard"
                        : "/dashboard"
              }
              className="flex items-center gap-3 transition-opacity hover:opacity-90"
            >
              <div className="w-10 h-10 rounded-xl bg-white p-1 border border-slate-200 shadow-xs flex items-center justify-center shrink-0">
                <img
                  src="/logo.png"
                  alt="Nexus Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="font-extrabold text-sm tracking-tight text-slate-900 flex items-center gap-1 leading-none">
                  <span>NEXUS</span>
                  <span className="text-blue-600 font-black">MARKET</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono tracking-wider uppercase font-semibold mt-1">
                  Enterprise ADBMS
                </div>
              </div>
            </Link>
          ) : (
            <div className="w-10 h-10 mx-auto rounded-xl bg-white p-1 border border-slate-200 shadow-xs flex items-center justify-center">
              <img
                src="/logo.png"
                alt="Nexus Logo"
                className="w-full h-full object-contain"
              />
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Current Branch Pill if expanded */}
        {!collapsed && currentBranch && (
          <div className="mx-3 mt-3 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Store className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="text-slate-800 font-semibold truncate max-w-[130px]">{currentBranch.name}</span>
            </div>
            <span className="font-mono text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-md font-bold">
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
                  <div className="px-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    {group.group}
                  </div>
                )}
                {group.items.map((item) => {
                  const allowed = !item.permission || canAccess(role, item.permission);
                  const active = item.href === activeHref;

                  if (!allowed && role === "CASHIER" && item.permission) {
                    // Filter restricted items for cashier
                    return null;
                  }

                  const Icon = item.icon;

                  return (
                    <Link
                      key={`${item.href}-${item.title}`}
                      href={item.href}
                      className={`group relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${active
                          ? "bg-blue-600 text-white shadow-xs font-semibold"
                          : item.highlight
                            ? "bg-blue-50 text-blue-700 border border-blue-200/80 hover:bg-blue-100/80"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/90 font-medium"
                        } ${!allowed ? "opacity-60" : ""}`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${active
                            ? "text-white"
                            : item.highlight
                              ? "text-blue-600"
                              : "text-slate-400 group-hover:text-slate-700"
                          }`}
                      />
                      {!collapsed && (
                        <div className="flex items-center justify-between w-full">
                          <span className="truncate">{item.title}</span>
                          <div className="flex items-center gap-1.5">
                            {!allowed && <Lock className="w-3 h-3 text-amber-500/80" />}
                            {item.badge && (
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${active
                                    ? "bg-blue-700 text-white"
                                    : "bg-blue-100 text-blue-700 border border-blue-200"
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

    </aside>
  );
}
