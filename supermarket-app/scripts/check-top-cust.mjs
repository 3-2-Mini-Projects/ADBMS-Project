import mysql from 'mysql2/promise';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split(/\r?\n/).forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
});

async function run() {
  const conn = await mysql.createConnection({
    host: env.DB_HOST,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });

  const [routines] = await conn.query(
    "SELECT ROUTINE_NAME FROM INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_SCHEMA = ? AND ROUTINE_NAME = 'proc_apply_coupon'",
    [env.DB_NAME]
  );
  console.log("proc_apply_coupon exists:", routines.length > 0);

  const [top10] = await conn.query(`
    SELECT 
      c.customer_id, c.card_no, c.full_name, c.phone, c.tier, c.points_balance
    FROM customers c
    WHERE c.is_active = 1
    ORDER BY c.points_balance DESC
    LIMIT 10
  `);
  console.log("Top 10 count:", top10.length);

  await conn.end();
}

run().catch(console.error);
