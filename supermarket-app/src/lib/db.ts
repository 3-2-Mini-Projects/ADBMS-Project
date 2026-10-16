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

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  try {
    const [rows] = await pool.query(sql, params);
    return rows as T[];
  } catch (err: any) {
    if (err.code === "ECONNRESET" || err.code === "PROTOCOL_CONNECTION_LOST" || err.message?.includes("ECONNRESET")) {
      const [rows] = await pool.query(sql, params);
      return rows as T[];
    }
    throw err;
  }
}

export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}
