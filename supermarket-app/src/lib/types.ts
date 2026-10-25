export type UserRole =
  | 'ADMIN'
  | 'MANAGER'
  | 'CASHIER'
  | 'STOCK_CLERK'
  | 'CATALOG_MANAGER'
  | 'MARKETING'
  | 'HR';

export interface Branch {
  branch_id: number;
  branch_code: string;
  name: string;
  city: string;
  region: string;
  address?: string | null;
  phone?: string | null;
  manager_id?: number | null;
  manager_name?: string | null;
  opened_date: string;
  is_active: number;
}

export interface Employee {
  employee_id: number;
  branch_id: number;
  branch_name?: string;
  full_name: string;
  role: UserRole;
  email: string;
  phone?: string | null;
  hire_date: string;
  monthly_salary: string | number;
  is_active: number;
  is_activated?: number | boolean;
  created_at: string;
}

export interface Category {
  category_id: number;
  name: string;
  parent_id?: number | null;
  parent_name?: string | null;
  parent_key?: number | null;
  product_count?: number;
}

export interface Supplier {
  supplier_id: number;
  supplier_code: string;
  name: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  is_active: number;
}

export interface Product {
  product_id: number;
  barcode: string;
  name: string;
  category_id: number;
  category_name?: string;
  supplier_id: number;
  supplier_name?: string;
  brand?: string | null;
  unit_price: number | string;
  cost_price: number | string;
  tax_rate: number | string;
  reorder_level: number;
  is_active: number;
  quantity_on_hand?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProductPriceHistory {
  history_id: number;
  product_id: number;
  product_name?: string;
  barcode?: string;
  brand?: string;
  category_name?: string;
  old_price: number | string;
  new_price: number | string;
  price_difference?: number | string;
  price_variance_pct?: number;
  changed_by: number;
  changer_name?: string;
  changed_by_name?: string;
  changed_by_role?: string;
  changed_at: string;
  reason?: string;
  supervisor_approval_status?: 'APPROVED' | 'PENDING_SUPERVISOR_APPROVAL' | 'REJECTED';
  supervisor_id?: number | null;
  supervisor_name?: string | null;
  supervisor_comment?: string | null;
  approved_at?: string | null;
}

export interface SlowMover {
  slow_mover_id: number;
  product_id: number;
  barcode: string;
  product_name: string;
  brand?: string | null;
  category_name?: string;
  supplier_name?: string;
  branch_id: number;
  branch_name: string;
  quantity_on_hand: number;
  cost_price: number | string;
  selling_price: number | string;
  tied_up_capital: number | string;
  last_sale_date?: string | null;
  days_without_sales: number;
  sales_velocity: number;
  turnover_ratio?: number;
  recommended_action: 'DISCOUNT_PRICE' | 'BUNDLE_PROMO' | 'RETURN_TO_SUPPLIER' | 'DISCONTINUE' | 'MONITOR';
  recommended_discount_pct: number;
  status: 'ACTIVE' | 'ACTION_TAKEN' | 'DISMISSED' | 'DISCONTINUED';
  action_taken_notes?: string | null;
  last_analyzed: string;
  stagnation_level?: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
}

export interface CatalogStats {
  total_products: number;
  active_products: number;
  inactive_products: number;
  total_categories: number;
  total_suppliers: number;
  total_inventory_valuation: number;
  potential_retail_revenue: number;
  average_profit_margin_pct: number;
  pending_price_approvals: number;
  slow_movers_count: number;
  tied_up_capital: number;
}

export interface InventoryItem {
  inventory_id: number;
  branch_id: number;
  branch_name?: string;
  product_id: number;
  barcode: string;
  product_name: string;
  category_name?: string;
  quantity_on_hand: number;
  reserved_qty: number;
  reorder_level: number;
  unit_price: number | string;
  cost_price: number | string;
  last_updated: string;
}

export interface ProductBatch {
  batch_id: number;
  product_id: number;
  product_name?: string;
  barcode?: string;
  branch_id: number;
  branch_name?: string;
  batch_no: string;
  quantity: number;
  received_date: string;
  expiry_date?: string | null;
  days_to_expiry?: number;
  expiry_status?: 'EXPIRED' | 'NEAR_EXPIRY' | 'EXPIRING_SOON' | 'GOOD' | 'NORMAL';
  status?: 'EXPIRED' | 'NEAR_EXPIRY' | 'EXPIRING_SOON' | 'GOOD' | 'NORMAL';
}

export interface StockAlert {
  alert_id?: number;
  branch_id: number;
  branch_name?: string;
  product_id: number;
  product_name: string;
  barcode: string;
  quantity_on_hand: number;
  reorder_level: number;
  alert_type?: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'EXPIRING';
  created_at?: string;
}

export interface Customer {
  customer_id: number;
  card_no: string;
  full_name: string;
  phone: string;
  email?: string | null;
  city?: string | null;
  join_date: string;
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  points_balance: number;
  is_active: number;
}

export interface LoyaltyTransaction {
  loyalty_id: number;
  customer_id: number;
  customer_name?: string;
  sale_id?: number | null;
  points_change: number;
  transaction_type: 'EARNED' | 'REDEEMED' | 'EXPIRED' | 'ADJUSTED';
  created_at: string;
}

export interface Promotion {
  promo_id: number;
  name: string;
  discount_percent: number | string;
  start_date: string;
  end_date: string;
  product_id?: number | null;
  product_name?: string | null;
  category_id?: number | null;
  category_name?: string | null;
  is_active: number;
  status?: "ACTIVE" | "SCHEDULED" | "EXPIRED" | string;
  days_left?: number;
}

export interface Coupon {
  coupon_id: number;
  code: string;
  promo_id: number;
  promo_name?: string;
  discount_percent?: number | string;
  customer_id?: number | null;
  customer_name?: string | null;
  expiry_date: string;
  is_used: number;
  used_at?: string | null;
}

export interface Sale {
  sale_id: number;
  branch_id: number;
  branch_name?: string;
  cashier_id: number;
  cashier_name?: string;
  customer_id?: number | null;
  customer_name?: string | null;
  customer_card?: string | null;
  promo_id?: number | null;
  promo_name?: string | null;
  coupon_id?: number | null;
  coupon_code?: string | null;
  sale_date: string;
  status: 'OPEN' | 'COMPLETED' | 'CANCELLED';
  subtotal: number | string;
  discount_total: number | string;
  tax_total: number | string;
  total_amount: number | string;
  items?: SaleItem[];
  payments?: Payment[];
}

export interface SaleItem {
  sale_item_id: number;
  sale_id: number;
  product_id: number;
  product_name?: string;
  barcode?: string;
  quantity: number;
  unit_price: number | string;
  discount_amount: number | string;
  line_total: number | string;
}

export interface Payment {
  payment_id: number;
  sale_id: number;
  method: 'CASH' | 'CARD' | 'MOBILE' | 'POINTS';
  amount: number | string;
  reference?: string | null;
  paid_at: string;
}

export interface ReturnItem {
  return_id: number;
  sale_item_id: number;
  sale_id?: number;
  product_id?: number;
  product_name?: string;
  unit_price?: number | string;
  quantity: number;
  reason?: string | null;
  refund_amount: number | string;
  processed_by: number;
  processor_name?: string;
  return_date: string;
}

export interface PurchaseOrder {
  po_id: number;
  po_number: string;
  supplier_id: number;
  supplier_name?: string;
  branch_id: number;
  branch_name?: string;
  order_date: string;
  expected_date?: string | null;
  status: 'DRAFT' | 'SENT' | 'PENDING' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';
  total_cost: number | string;
  created_by: number;
  creator_name?: string;
  items?: PurchaseOrderItem[];
}

export type DiscrepancyReason =
  | 'NONE'
  | 'DAMAGED_IN_TRANSIT'
  | 'PACKAGING_BROKEN'
  | 'EXPIRED_ON_ARRIVAL'
  | 'SUPPLIER_SHORTAGE'
  | 'WRONG_PRODUCT'
  | 'QUALITY_DEFECT';

export interface PurchaseOrderItem {
  po_item_id: number;
  po_id: number;
  product_id: number;
  product_name?: string;
  barcode?: string;
  quantity: number;
  unit_cost: number | string;
  line_total: number | string;
  received_quantity?: number;
  damaged_quantity?: number;
  shortage_quantity?: number;
  discrepancy_reason?: DiscrepancyReason;
  discrepancy_notes?: string | null;
}

export interface Shift {
  shift_id: number;
  employee_id: number;
  employee_name?: string;
  role?: UserRole;
  branch_name?: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  clock_in?: string | null;
  clock_out?: string | null;
  status: 'SCHEDULED' | 'PRESENT' | 'ABSENT' | 'COMPLETED';
}

export interface AuditLog {
  audit_id: number;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_value?: any;
  new_value?: any;
  changed_by?: string | null;
  changed_at: string;
}

export interface ErrorLog {
  error_id: number;
  error_code?: string;
  message: string;
  stack_trace?: string;
  occurred_at: string;
}

export interface POSCartItem {
  product_id: number;
  barcode: string;
  name: string;
  brand?: string | null;
  unit_price: number;
  cost_price: number;
  tax_rate: number;
  quantity: number;
  discount_amount: number;
  stock_available: number;
}
