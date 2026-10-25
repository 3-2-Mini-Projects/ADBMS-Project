import mysql, { Pool } from "mysql2/promise";
import { UserRole } from "./types";

declare global {
  // eslint-disable-next-line no-var
  var __mysqlPools: Record<string, Pool> | undefined;
}

const baseConfig: Omit<mysql.PoolOptions, "user" | "password"> = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  database: process.env.DB_NAME ?? "supermarket_ADBMS",
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  decimalNumbers: false,
  ssl: {
    rejectUnauthorized: false,
  },
};

const createRolePool = (defaultUser: string, specificPass?: string): Pool => {
  // If specific role password is configured, use the dedicated role user.
  // Otherwise gracefully fallback to DB_USER / DB_PASSWORD for dev flexibility.
  const user = specificPass ? defaultUser : (process.env.DB_USER || defaultUser);
  const password = specificPass || process.env.DB_PASSWORD;

  return mysql.createPool({
    ...baseConfig,
    user,
    password,
  });
};

const globalPools = global.__mysqlPools ?? {
  AUTH: createRolePool("auth_user", process.env.DB_AUTH_PASS),
  ADMIN: createRolePool("admin_user", process.env.DB_ADMIN_PASS),
  CATALOG: createRolePool("catalog_mgr_user", process.env.DB_CATALOG_PASS),
  STOCK: createRolePool("stock_clerk_user", process.env.DB_STOCK_PASS),
  CASHIER: createRolePool("cashier_user", process.env.DB_CASHIER_PASS),
  MARKETING: createRolePool("marketing_user", process.env.DB_MARKETING_PASS),
};

if (process.env.NODE_ENV !== "production") {
  global.__mysqlPools = globalPools;
}

export const pools = globalPools;

export type DbPoolKey = "AUTH" | "ADMIN" | "CATALOG" | "STOCK" | "CASHIER" | "MARKETING";

/**
 * Returns the MySQL connection pool tailored to the user's role or 'AUTH'.
 * Enforces role-level database privileges at the MySQL layer.
 */
export function getPool(role?: UserRole | DbPoolKey | "AUTH"): Pool {
  if (!role) {
    return pools.ADMIN;
  }
  if (role === "AUTH") {
    return pools.AUTH;
  }
  if (role === "ADMIN") {
    return pools.ADMIN;
  }
  if (role === "CASHIER") {
    return pools.CASHIER;
  }
  if (role === "STOCK_CLERK" || role === "STOCK") {
    return pools.STOCK;
  }
  if (role === "CATALOG_MANAGER" || role === "CATALOG") {
    return pools.CATALOG;
  }
  if (role === "MARKETING") {
    return pools.MARKETING;
  }
  return pools.ADMIN;
}

// Backward-compatible default pool
export const pool: Pool = pools.ADMIN;
export default pool;

function isRetryableConnectionError(err: unknown): boolean {
  if (!err || typeof err !== "object") {
    return false;
  }

  const error = err as { code?: string; message?: string };
  return (
    error.code === "ECONNRESET" ||
    error.code === "PROTOCOL_CONNECTION_LOST" ||
    error.message?.includes("ECONNRESET") === true
  );
}

function isReadOnlyQuery(sql: string): boolean {
  return /^\s*SELECT\b/i.test(sql);
}

export async function query<T = any>(
  sql: string,
  params: any[] = [],
  role?: UserRole | DbPoolKey | "AUTH"
): Promise<T[]> {
  const targetPool = getPool(role);
  try {
    const [rows] = await targetPool.query(sql, params);
    return rows as T[];
  } catch (err: unknown) {
    // A write may have committed before a connection failure was reported.
    // Retrying it here could duplicate inventory, receipts, or audit records.
    if (isRetryableConnectionError(err) && isReadOnlyQuery(sql)) {
      const [rows] = await targetPool.query(sql, params);
      return rows as T[];
    }
    throw err;
  }
}

export async function queryOne<T = any>(
  sql: string,
  params: any[] = [],
  role?: UserRole | DbPoolKey | "AUTH"
): Promise<T | null> {
  const rows = await query<T>(sql, params, role);
  return rows.length > 0 ? rows[0] : null;
}

export async function withTransaction<T>(
  callback: (conn: mysql.PoolConnection) => Promise<T>,
  role?: UserRole | DbPoolKey
): Promise<T> {
  const conn = await getPool(role).getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
