import { UserRole } from './types';

export type PermissionKey =
  | 'manage_branches'
  | 'manage_employees'
  | 'manage_catalog'
  | 'manage_inventory'
  | 'receive_purchases'
  | 'create_pos_sales'
  | 'process_returns'
  | 'manage_promotions'
  | 'view_reports'
  | 'view_audit_log';

export const ROLE_PERMISSIONS: Record<UserRole, Record<PermissionKey, boolean>> = {
  ADMIN: {
    manage_branches: true,
    manage_employees: true,
    manage_catalog: true,
    manage_inventory: true,
    receive_purchases: true,
    create_pos_sales: true,
    process_returns: true,
    manage_promotions: true,
    view_reports: true,
    view_audit_log: true,
  },
  MANAGER: {
    manage_branches: false,
    manage_employees: true,
    manage_catalog: true,
    manage_inventory: true,
    receive_purchases: true,
    create_pos_sales: true,
    process_returns: true,
    manage_promotions: true,
    view_reports: true,
    view_audit_log: true,
  },
  CASHIER: {
    manage_branches: false,
    manage_employees: false,
    manage_catalog: false,
    manage_inventory: false,
    receive_purchases: false,
    create_pos_sales: true,
    process_returns: true,
    manage_promotions: false,
    view_reports: false,
    view_audit_log: false,
  },
  STOCK_CLERK: {
    manage_branches: false,
    manage_employees: false,
    manage_catalog: false,
    manage_inventory: true,
    receive_purchases: true,
    create_pos_sales: false,
    process_returns: false,
    manage_promotions: false,
    view_reports: true,
    view_audit_log: false,
  },
  CATALOG_MANAGER: {
    manage_branches: false,
    manage_employees: false,
    manage_catalog: true,
    manage_inventory: true,
    receive_purchases: false,
    create_pos_sales: false,
    process_returns: false,
    manage_promotions: false,
    view_reports: true,
    view_audit_log: false,
  },
  MARKETING: {
    manage_branches: false,
    manage_employees: false,
    manage_catalog: false,
    manage_inventory: false,
    receive_purchases: false,
    create_pos_sales: false,
    process_returns: false,
    manage_promotions: true,
    view_reports: true,
    view_audit_log: false,
  },
  HR: {
    manage_branches: false,
    manage_employees: true,
    manage_catalog: false,
    manage_inventory: false,
    receive_purchases: false,
    create_pos_sales: false,
    process_returns: false,
    manage_promotions: false,
    view_reports: true,
    view_audit_log: true,
  },
};

export function canAccess(role: UserRole, permission: PermissionKey): boolean {
  return ROLE_PERMISSIONS[role]?.[permission] ?? false;
}

export function getRoleDefaultPath(role?: UserRole | null): string {
  switch (role) {
    case "ADMIN":
    case "MANAGER":
      return "/dashboard";
    case "CASHIER":
      return "/pos";
    case "STOCK_CLERK":
      return "/inventory";
    case "CATALOG_MANAGER":
      return "/products";
    case "MARKETING":
      return "/marketing/dashboard";
    case "HR":
      return "/employees";
    default:
      return "/dashboard";
  }
}
