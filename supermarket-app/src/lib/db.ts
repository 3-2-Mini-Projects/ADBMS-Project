import mysql, { Pool } from "mysql2/promise";

declare global {
  // eslint-disable-next-line no-var
  var __mysqlPool: Pool | undefined;
}

const poolConfig: mysql.PoolOptions = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  decimalNumbers: false,
  ssl: {
    rejectUnauthorized: false,
  },
};

export const pool: Pool = global.__mysqlPool ?? mysql.createPool(poolConfig);

if (process.env.NODE_ENV !== "production") {
  global.__mysqlPool = pool;
}

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
  params: any[] = []
): Promise<T[]> {
  try {
    const [rows] = await pool.query(sql, params);
    return rows as T[];
  } catch (err: unknown) {
    // A write may have committed before a connection failure was reported.
    // Retrying it here could duplicate inventory, receipts, or audit records.
    if (isRetryableConnectionError(err) && isReadOnlyQuery(sql)) {
      const [rows] = await pool.query(sql, params);
      return rows as T[];
    }
    throw err;
  }
}

export async function queryOne<T = any>(
  sql: string,
  params: any[] = []
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function withTransaction<T>(
  callback: (conn: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const conn = await pool.getConnection();
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

export default pool;

