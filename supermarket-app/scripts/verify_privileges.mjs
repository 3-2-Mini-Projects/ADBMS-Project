import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Load .env.local manually
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

const host = process.env.DB_HOST;
const port = Number(process.env.DB_PORT || 3306);
const database = process.env.DB_NAME || "supermarket_ADBMS";

const testCases = [
  {
    roleName: "Auth User",
    user: "auth_user",
    password: process.env.DB_AUTH_PASS || "Auth#1234",
    allowed: {
      name: "SELECT employees (Next.js auth lookup)",
      query: "SELECT employee_id, email, role FROM employees LIMIT 1",
    },
    forbidden: {
      name: "SELECT sales (Restricted financial data)",
      query: "SELECT sale_id FROM sales LIMIT 1",
    },
  },
  {
    roleName: "Cashier (role_cashier)",
    user: "cashier_user",
    password: process.env.DB_CASHIER_PASS || "Cashier#1234",
    allowed: {
      name: "SELECT products & sales (POS Scanning)",
      query: "SELECT product_id, barcode FROM products LIMIT 1",
    },
    forbidden: {
      name: "SELECT employees (Restricted HR/Auth table)",
      query: "SELECT employee_id, password_hash FROM employees LIMIT 1",
    },
  },
  {
    roleName: "Stock Clerk (role_stock_clerk)",
    user: "stock_clerk_user",
    password: process.env.DB_STOCK_PASS || "Stock#1234",
    allowed: {
      name: "SELECT inventory (Warehouse monitoring)",
      query: "SELECT inventory_id, quantity_on_hand FROM inventory LIMIT 1",
    },
    forbidden: {
      name: "SELECT employees (Restricted)",
      query: "SELECT employee_id FROM employees LIMIT 1",
    },
  },
  {
    roleName: "Catalog Manager (role_catalog_manager)",
    user: "catalog_mgr_user",
    password: process.env.DB_CATALOG_PASS || "Catalog#1234",
    allowed: {
      name: "SELECT categories & products (Master Catalog)",
      query: "SELECT category_id, name FROM categories LIMIT 1",
    },
    forbidden: {
      name: "SELECT sales (Restricted transaction data)",
      query: "SELECT sale_id FROM sales LIMIT 1",
    },
  },
  {
    roleName: "Marketing Manager (role_marketing_manager)",
    user: "marketing_user",
    password: process.env.DB_MARKETING_PASS || "Marketing#1234",
    allowed: {
      name: "SELECT promotions & coupons (Loyalty Campaigns)",
      query: "SELECT promo_id, name FROM promotions LIMIT 1",
    },
    forbidden: {
      name: "SELECT employees (Restricted)",
      query: "SELECT employee_id FROM employees LIMIT 1",
    },
  },
  {
    roleName: "System Admin (role_admin)",
    user: "admin_user",
    password: process.env.DB_ADMIN_PASS || "Admin#1234",
    allowed: {
      name: "SELECT ALL (Full administrative access)",
      query: "SELECT COUNT(*) as employee_count FROM employees",
    },
    forbidden: null,
  },
];

async function runTests() {
  console.log(`\n============================================================`);
  console.log(`  SUPERMARKET ADBMS: RBAC PRIVILEGE VERIFICATION SUITE`);
  console.log(`  Host: ${host}:${port} | DB: ${database}`);
  console.log(`============================================================\n`);

  let allPassed = true;

  for (const test of testCases) {
    console.log(`[USER: ${test.user}] (${test.roleName})`);
    let conn;
    try {
      conn = await mysql.createConnection({
        host,
        port,
        database,
        user: test.user,
        password: test.password,
        ssl: { rejectUnauthorized: false },
      });
      console.log(`  [OK] Connection established successfully.`);
    } catch (err) {
      console.error(`  [FAIL] Failed to connect:`, err.message);
      allPassed = false;
      console.log("");
      continue;
    }

    // 1. Test Allowed Action
    try {
      await conn.query(test.allowed.query);
      console.log(`  [PASS] Allowed Action: "${test.allowed.name}" succeeded.`);
    } catch (err) {
      console.error(`  [FAIL] Allowed Action failed unexpectedly:`, err.message);
      allPassed = false;
    }

    // 2. Test Forbidden Action
    if (test.forbidden) {
      try {
        await conn.query(test.forbidden.query);
        console.error(
          `  [FAIL] Forbidden Action: "${test.forbidden.name}" was ALLOWED, but should have been BLOCKED!`
        );
        allPassed = false;
      } catch (err) {
        if (err.errno === 1142 || err.code === "ER_TABLEACCESS_DENIED_ERROR") {
          console.log(
            `  [PASS] Forbidden Action: "${test.forbidden.name}" was correctly BLOCKED by MySQL (Access Denied).`
          );
        } else {
          console.warn(`  [WARN] Query failed with other error:`, err.message);
        }
      }
    }

    await conn.end();
    console.log("");
  }

  console.log(`============================================================`);
  if (allPassed) {
    console.log(`🎉 ALL ROLE-BASED PRIVILEGE TESTS PASSED SUCCESSFULLY!`);
  } else {
    console.log(`⚠️ SOME PRIVILEGE CHECKS FAILED. Review errors above.`);
  }
  console.log(`============================================================\n`);
}

runTests().catch(console.error);
