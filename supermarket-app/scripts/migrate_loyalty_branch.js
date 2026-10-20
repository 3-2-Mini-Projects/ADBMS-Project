const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Parse .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const env = { ...process.env };
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [k, ...v] = trimmed.split('=');
      env[k.trim()] = v.join('=').trim();
    }
  }
}

async function migrate() {
  const conn = await mysql.createConnection({
    host: env.DB_HOST || 'localhost',
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME || 'supermarket_ADBMS',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connected to database.');

    // 1. Add branch_id column if not exists
    const [cols] = await conn.query("SHOW COLUMNS FROM loyalty_transactions LIKE 'branch_id'");
    if (cols.length === 0) {
      await conn.query(`
        ALTER TABLE loyalty_transactions 
        ADD COLUMN branch_id INT NULL AFTER customer_id, 
        ADD CONSTRAINT fk_lt_branch FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE SET NULL
      `);
      console.log('Added branch_id column and foreign key constraint.');
    } else {
      console.log('branch_id column already exists.');
    }

    // 2. Backfill branch_id from sales for all transactions linked to a sale
    const [updateRes] = await conn.query(`
      UPDATE loyalty_transactions lt 
      JOIN sales s ON lt.sale_id = s.sale_id 
      SET lt.branch_id = s.branch_id 
      WHERE lt.branch_id IS NULL
    `);
    console.log(`Backfilled branch_id for ${updateRes.affectedRows} transactions linked to sales.`);

    // 3. For any remaining transactions without branch_id, default to branch 1
    const [defaultRes] = await conn.query(`
      UPDATE loyalty_transactions 
      SET branch_id = 1 
      WHERE branch_id IS NULL
    `);
    console.log(`Updated ${defaultRes.affectedRows} standalone transactions with branch_id = 1.`);

    // 4. Create performance indexes
    const indexes = [
      { name: 'idx_lt_branch_type_created', sql: 'CREATE INDEX idx_lt_branch_type_created ON loyalty_transactions(branch_id, type, created_at)' },
      { name: 'idx_lt_type_created', sql: 'CREATE INDEX idx_lt_type_created ON loyalty_transactions(type, created_at)' },
      { name: 'idx_lt_cust_created', sql: 'CREATE INDEX idx_lt_cust_created ON loyalty_transactions(customer_id, created_at)' }
    ];

    for (const idx of indexes) {
      try {
        await conn.query(idx.sql);
        console.log(`Created index: ${idx.name}`);
      } catch (err) {
        console.log(`Index ${idx.name} already exists or error:`, err.message);
      }
    }

    // 5. Create or replace view loyalty_point_transaction
    await conn.query(`
      CREATE OR REPLACE VIEW loyalty_point_transaction AS
      SELECT 
        lt.loyalty_id AS transaction_id,
        lt.customer_id,
        COALESCE(lt.branch_id, s.branch_id) AS branch_id,
        lt.sale_id,
        lt.type AS transaction_type,
        lt.points,
        lt.created_at AS transaction_date,
        lt.created_at
      FROM loyalty_transactions lt
      LEFT JOIN sales s ON lt.sale_id = s.sale_id
    `);
    console.log('Created/Updated view loyalty_point_transaction successfully.');

    console.log('ALL MIGRATIONS COMPLETED SUCCESSFULLY.');
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

migrate();
