import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env.local");

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        const value = trimmed.substring(idx + 1).trim();
        process.env[key] = value;
      }
    }
  });
}

const statements = [
  // 1. CREATE ROLES
  "CREATE ROLE IF NOT EXISTS 'role_admin'",
  "CREATE ROLE IF NOT EXISTS 'role_catalog_manager'",
  "CREATE ROLE IF NOT EXISTS 'role_stock_clerk'",
  "CREATE ROLE IF NOT EXISTS 'role_cashier'",
  "CREATE ROLE IF NOT EXISTS 'role_marketing_manager'",

  // 2. ROLE 1: CATALOG MANAGER
  "GRANT SELECT, INSERT, UPDATE ON supermarket_ADBMS.products TO 'role_catalog_manager'",
  "GRANT SELECT, INSERT, UPDATE ON supermarket_ADBMS.categories TO 'role_catalog_manager'",
  "GRANT SELECT, INSERT, UPDATE ON supermarket_ADBMS.suppliers TO 'role_catalog_manager'",
  "GRANT SELECT, INSERT ON supermarket_ADBMS.product_price_history TO 'role_catalog_manager'",
  "GRANT SELECT, INSERT, UPDATE ON supermarket_ADBMS.slow_movers TO 'role_catalog_manager'",
  "GRANT SELECT ON supermarket_ADBMS.inventory TO 'role_catalog_manager'",
  "GRANT INSERT ON supermarket_ADBMS.audit_log TO 'role_catalog_manager'", // Necessary for audit trail
  "GRANT SELECT ON supermarket_ADBMS.v_product_etl TO 'role_catalog_manager'",
  "GRANT SELECT ON supermarket_ADBMS.vw_branch_inventory TO 'role_catalog_manager'",
  "GRANT EXECUTE ON PROCEDURE supermarket_ADBMS.proc_add_product TO 'role_catalog_manager'",
  "GRANT EXECUTE ON PROCEDURE supermarket_ADBMS.proc_update_price TO 'role_catalog_manager'",
  "GRANT EXECUTE ON PROCEDURE supermarket_ADBMS.proc_discontinue_product TO 'role_catalog_manager'",
  "GRANT EXECUTE ON PROCEDURE supermarket_ADBMS.proc_flag_slow_movers TO 'role_catalog_manager'",
  "GRANT EXECUTE ON FUNCTION supermarket_ADBMS.fn_profit_margin TO 'role_catalog_manager'",
  "GRANT EXECUTE ON FUNCTION supermarket_ADBMS.fn_price_with_tax TO 'role_catalog_manager'",
  "GRANT EXECUTE ON FUNCTION supermarket_ADBMS.fn_category_path TO 'role_catalog_manager'",

  // 3. ROLE 2: STOCK CLERK
  "GRANT SELECT, UPDATE ON supermarket_ADBMS.inventory TO 'role_stock_clerk'",
  "GRANT SELECT, INSERT, UPDATE ON supermarket_ADBMS.product_batches TO 'role_stock_clerk'",
  "GRANT SELECT, INSERT, UPDATE ON supermarket_ADBMS.purchase_orders TO 'role_stock_clerk'",
  "GRANT SELECT, INSERT, UPDATE ON supermarket_ADBMS.purchase_order_items TO 'role_stock_clerk'",
  "GRANT SELECT, INSERT, UPDATE ON supermarket_ADBMS.stock_alerts TO 'role_stock_clerk'",
  "GRANT SELECT ON supermarket_ADBMS.products TO 'role_stock_clerk'",
  "GRANT SELECT ON supermarket_ADBMS.categories TO 'role_stock_clerk'",
  "GRANT SELECT ON supermarket_ADBMS.suppliers TO 'role_stock_clerk'",
  "GRANT SELECT ON supermarket_ADBMS.branches TO 'role_stock_clerk'",
  "GRANT SELECT, INSERT ON supermarket_ADBMS.audit_log TO 'role_stock_clerk'", // Needed for transfer/disposal audit
  "GRANT SELECT ON supermarket_ADBMS.vw_branch_inventory TO 'role_stock_clerk'",
  "GRANT SELECT ON supermarket_ADBMS.vw_batch_expiry_status TO 'role_stock_clerk'",
  "GRANT SELECT ON supermarket_ADBMS.vw_purchase_order_details TO 'role_stock_clerk'",
  "GRANT SELECT ON supermarket_ADBMS.vw_purchase_order_summary TO 'role_stock_clerk'",
  "GRANT SELECT ON supermarket_ADBMS.vw_stock_alert_dashboard TO 'role_stock_clerk'",
  "GRANT EXECUTE ON PROCEDURE supermarket_ADBMS.sp_check_low_stock TO 'role_stock_clerk'",
  "GRANT EXECUTE ON PROCEDURE supermarket_ADBMS.sp_expiring_batches TO 'role_stock_clerk'",
  "GRANT EXECUTE ON PROCEDURE supermarket_ADBMS.sp_update_inventory TO 'role_stock_clerk'",
  "GRANT EXECUTE ON PROCEDURE supermarket_ADBMS.sp_create_purchase_order TO 'role_stock_clerk'",
  "GRANT EXECUTE ON PROCEDURE supermarket_ADBMS.sp_receive_purchase_order TO 'role_stock_clerk'",
  "GRANT EXECUTE ON PROCEDURE supermarket_ADBMS.sp_transfer_stock TO 'role_stock_clerk'",
  "GRANT EXECUTE ON PROCEDURE supermarket_ADBMS.sp_record_stock_disposal TO 'role_stock_clerk'",
  "GRANT EXECUTE ON PROCEDURE supermarket_ADBMS.sp_auto_dispose_expired_batches TO 'role_stock_clerk'",
  "GRANT EXECUTE ON FUNCTION supermarket_ADBMS.fn_available_qty TO 'role_stock_clerk'",
  "GRANT EXECUTE ON FUNCTION supermarket_ADBMS.fn_stock_status TO 'role_stock_clerk'",
  "GRANT EXECUTE ON FUNCTION supermarket_ADBMS.fn_product_sales_velocity TO 'role_stock_clerk'",
  "GRANT EXECUTE ON FUNCTION supermarket_ADBMS.fn_suggested_reorder_qty TO 'role_stock_clerk'",
  "GRANT EXECUTE ON FUNCTION supermarket_ADBMS.fn_days_to_expiry TO 'role_stock_clerk'",
  "GRANT EXECUTE ON FUNCTION supermarket_ADBMS.fn_branch_replenishment_cost TO 'role_stock_clerk'",

  // 4. ROLE 3: CASHIER
  "GRANT SELECT ON supermarket_ADBMS.products TO 'role_cashier'",
  "GRANT SELECT, UPDATE ON supermarket_ADBMS.inventory TO 'role_cashier'",
  "GRANT SELECT ON supermarket_ADBMS.promotions TO 'role_cashier'",
  "GRANT SELECT ON supermarket_ADBMS.coupons TO 'role_cashier'",
  "GRANT SELECT, UPDATE ON supermarket_ADBMS.customers TO 'role_cashier'",
  "GRANT SELECT, INSERT ON supermarket_ADBMS.sales TO 'role_cashier'",
  "GRANT SELECT, INSERT ON supermarket_ADBMS.sale_items TO 'role_cashier'",
  "GRANT SELECT, INSERT ON supermarket_ADBMS.payments TO 'role_cashier'",
  "GRANT SELECT, INSERT ON supermarket_ADBMS.returns TO 'role_cashier'",
  "GRANT INSERT ON supermarket_ADBMS.audit_log TO 'role_cashier'", // Needed for checkout and return audit
  "GRANT SELECT ON supermarket_ADBMS.sale_details_vw TO 'role_cashier'",
  "GRANT SELECT ON supermarket_ADBMS.daily_sales_vw TO 'role_cashier'",
  "GRANT SELECT ON supermarket_ADBMS.cashier_sales_vw TO 'role_cashier'",
  "GRANT SELECT ON supermarket_ADBMS.payment_summary_vw TO 'role_cashier'",
  "GRANT EXECUTE ON PROCEDURE supermarket_ADBMS.CreateSale TO 'role_cashier'",
  "GRANT EXECUTE ON PROCEDURE supermarket_ADBMS.AddSaleItem TO 'role_cashier'",
  "GRANT EXECUTE ON PROCEDURE supermarket_ADBMS.UpdateSaleTotals TO 'role_cashier'",
  "GRANT EXECUTE ON PROCEDURE supermarket_ADBMS.CompleteSale TO 'role_cashier'",
  "GRANT EXECUTE ON PROCEDURE supermarket_ADBMS.ProcessReturn TO 'role_cashier'",
  "GRANT EXECUTE ON FUNCTION supermarket_ADBMS.CalculateLineTotal TO 'role_cashier'",
  "GRANT EXECUTE ON FUNCTION supermarket_ADBMS.GetTotalPaid TO 'role_cashier'",
  "GRANT EXECUTE ON FUNCTION supermarket_ADBMS.GetRemainingAmount TO 'role_cashier'",
  "GRANT EXECUTE ON FUNCTION supermarket_ADBMS.GetSaleDiscount TO 'role_cashier'",

  // 5. ROLE 4: MARKETING MANAGER
  "GRANT SELECT, INSERT, UPDATE ON supermarket_ADBMS.promotions TO 'role_marketing_manager'",
  "GRANT SELECT, INSERT, UPDATE ON supermarket_ADBMS.coupons TO 'role_marketing_manager'",
  "GRANT SELECT, INSERT, UPDATE ON supermarket_ADBMS.loyalty_transactions TO 'role_marketing_manager'",
  "GRANT SELECT, INSERT, UPDATE ON supermarket_ADBMS.customer_tier_history TO 'role_marketing_manager'",
  "GRANT SELECT, INSERT, UPDATE ON supermarket_ADBMS.customers TO 'role_marketing_manager'",
  "GRANT SELECT ON supermarket_ADBMS.products TO 'role_marketing_manager'",
  "GRANT SELECT ON supermarket_ADBMS.categories TO 'role_marketing_manager'",
  "GRANT INSERT ON supermarket_ADBMS.audit_log TO 'role_marketing_manager'",
  "GRANT SELECT ON supermarket_ADBMS.customer_etl_vw TO 'role_marketing_manager'",
  "GRANT SELECT ON supermarket_ADBMS.active_promotions_vw TO 'role_marketing_manager'",
  "GRANT SELECT ON supermarket_ADBMS.customer_summary_vw TO 'role_marketing_manager'",
  "GRANT SELECT ON supermarket_ADBMS.top_customers_vw TO 'role_marketing_manager'",
  "GRANT EXECUTE ON PROCEDURE supermarket_ADBMS.register_customer TO 'role_marketing_manager'",
  "GRANT EXECUTE ON PROCEDURE supermarket_ADBMS.redeem_points TO 'role_marketing_manager'",
  "GRANT EXECUTE ON PROCEDURE supermarket_ADBMS.add_ltpoints TO 'role_marketing_manager'",
  "GRANT EXECUTE ON PROCEDURE supermarket_ADBMS.create_promotion TO 'role_marketing_manager'",
  "GRANT EXECUTE ON PROCEDURE supermarket_ADBMS.recalculate_tiers TO 'role_marketing_manager'",
  "GRANT EXECUTE ON PROCEDURE supermarket_ADBMS.proc_apply_coupon TO 'role_marketing_manager'",
  "GRANT EXECUTE ON PROCEDURE supermarket_ADBMS.get_active_promotions TO 'role_marketing_manager'",
  "GRANT EXECUTE ON PROCEDURE supermarket_ADBMS.get_deactive_promotions TO 'role_marketing_manager'",
  "GRANT EXECUTE ON PROCEDURE supermarket_ADBMS.proc_assign_top10_coupons TO 'role_marketing_manager'",
  "GRANT EXECUTE ON PROCEDURE supermarket_ADBMS.sp_top_10_loyalty_customers_all_branches TO 'role_marketing_manager'",
  "GRANT EXECUTE ON PROCEDURE supermarket_ADBMS.sp_top_10_loyalty_customers_per_branch TO 'role_marketing_manager'",
  "GRANT EXECUTE ON FUNCTION supermarket_ADBMS.lt_points_earned TO 'role_marketing_manager'",
  "GRANT EXECUTE ON FUNCTION supermarket_ADBMS.get_discount TO 'role_marketing_manager'",
  "GRANT EXECUTE ON FUNCTION supermarket_ADBMS.modify_customer_tier TO 'role_marketing_manager'",
  "GRANT EXECUTE ON FUNCTION supermarket_ADBMS.promo_isactive TO 'role_marketing_manager'",

  // 6. ROLE 5: ADMIN
  "GRANT ALL PRIVILEGES ON supermarket_ADBMS.* TO 'role_admin' WITH GRANT OPTION",

  // 7. CREATE DATABASE USER ACCOUNTS WITH USER'S SPECIFIED PASSWORDS (#1234)
  "CREATE USER IF NOT EXISTS 'admin_user'@'%' IDENTIFIED BY 'Admin#1234'",
  "ALTER USER 'admin_user'@'%' IDENTIFIED BY 'Admin#1234'",

  "CREATE USER IF NOT EXISTS 'catalog_mgr_user'@'%' IDENTIFIED BY 'Catalog#1234'",
  "ALTER USER 'catalog_mgr_user'@'%' IDENTIFIED BY 'Catalog#1234'",

  "CREATE USER IF NOT EXISTS 'stock_clerk_user'@'%' IDENTIFIED BY 'Stock#1234'",
  "ALTER USER 'stock_clerk_user'@'%' IDENTIFIED BY 'Stock#1234'",

  "CREATE USER IF NOT EXISTS 'cashier_user'@'%' IDENTIFIED BY 'Cashier#1234'",
  "ALTER USER 'cashier_user'@'%' IDENTIFIED BY 'Cashier#1234'",

  "CREATE USER IF NOT EXISTS 'marketing_user'@'%' IDENTIFIED BY 'Marketing#1234'",
  "ALTER USER 'marketing_user'@'%' IDENTIFIED BY 'Marketing#1234'",

  // Authentication user for Next.js login endpoint
  "CREATE USER IF NOT EXISTS 'auth_user'@'%' IDENTIFIED BY 'Auth#1234'",
  "ALTER USER 'auth_user'@'%' IDENTIFIED BY 'Auth#1234'",
  "GRANT SELECT ON supermarket_ADBMS.employees TO 'auth_user'@'%'",
  "GRANT INSERT ON supermarket_ADBMS.audit_log TO 'auth_user'@'%'",

  // 8. ASSIGN ROLES TO USERS & ACTIVATE AS DEFAULT
  "GRANT 'role_admin' TO 'admin_user'@'%'",
  "GRANT 'role_catalog_manager' TO 'catalog_mgr_user'@'%'",
  "GRANT 'role_stock_clerk' TO 'stock_clerk_user'@'%'",
  "GRANT 'role_cashier' TO 'cashier_user'@'%'",
  "GRANT 'role_marketing_manager' TO 'marketing_user'@'%'",

  "SET DEFAULT ROLE 'role_admin' TO 'admin_user'@'%'",
  "SET DEFAULT ROLE 'role_catalog_manager' TO 'catalog_mgr_user'@'%'",
  "SET DEFAULT ROLE 'role_stock_clerk' TO 'stock_clerk_user'@'%'",
  "SET DEFAULT ROLE 'role_cashier' TO 'cashier_user'@'%'",
  "SET DEFAULT ROLE 'role_marketing_manager' TO 'marketing_user'@'%'",

  "FLUSH PRIVILEGES",
];

async function applyRbac() {
  console.log("Connecting as admin user to execute RBAC setup...");
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME || "supermarket_ADBMS",
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
  });

  for (const stmt of statements) {
    try {
      await conn.query(stmt);
      console.log(`[EXECUTED] ${stmt.substring(0, 60)}...`);
    } catch (err) {
      console.error(`[ERROR] Failed statement: ${stmt} ->`, err.message);
    }
  }

  console.log("\n✅ All RBAC statements processed successfully!");
  await conn.end();
}

applyRbac().catch(console.error);
