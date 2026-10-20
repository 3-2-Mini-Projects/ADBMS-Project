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

async function testRankings() {
  const conn = await mysql.createConnection({
    host: env.DB_HOST || 'localhost',
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME || 'supermarket_ADBMS',
    ssl: { rejectUnauthorized: false }
  });

  const startDate = '2026-01-01';
  const endDate = '2026-12-31';

  try {
    // 1. Test Per Branch Query
    const sqlBranch = `
      WITH customer_branch_points AS (
        SELECT 
          lt.customer_id,
          COALESCE(lt.branch_id, s.branch_id) AS branch_id,
          SUM(lt.points) AS total_points_earned,
          COUNT(DISTINCT lt.loyalty_id) AS transaction_count,
          COUNT(DISTINCT lt.sale_id) AS sales_count,
          MAX(lt.created_at) AS last_earned_at
        FROM loyalty_transactions lt
        LEFT JOIN sales s ON lt.sale_id = s.sale_id
        WHERE lt.type = 'EARN'
          AND lt.points > 0
          AND lt.created_at >= ? 
          AND lt.created_at < DATE_ADD(?, INTERVAL 1 DAY)
        GROUP BY lt.customer_id, COALESCE(lt.branch_id, s.branch_id)
      ),
      ranked_branch_customers AS (
        SELECT
          cbp.branch_id,
          b.name AS branch_name,
          b.branch_code,
          b.city AS branch_city,
          c.customer_id,
          c.full_name,
          c.card_no,
          c.phone,
          c.email,
          c.tier,
          cbp.total_points_earned,
          cbp.transaction_count,
          cbp.sales_count,
          cbp.last_earned_at,
          DENSE_RANK() OVER (
            PARTITION BY cbp.branch_id 
            ORDER BY cbp.total_points_earned DESC, cbp.last_earned_at ASC
          ) AS rank_num
        FROM customer_branch_points cbp
        JOIN customers c ON cbp.customer_id = c.customer_id
        JOIN branches b ON cbp.branch_id = b.branch_id
        WHERE c.is_active = 1
      )
      SELECT *
      FROM ranked_branch_customers
      WHERE rank_num <= 10
      ORDER BY branch_id ASC, rank_num ASC;
    `;

    const [branchRows] = await conn.query(sqlBranch, [startDate, endDate]);
    console.log(`Per-Branch Results found: ${branchRows.length}`);
    console.log(branchRows.slice(0, 5));

    // 2. Test All Branches Query with branch breakdown
    const sqlAll = `
      WITH customer_global_points AS (
        SELECT 
          lt.customer_id,
          SUM(lt.points) AS total_points_earned,
          COUNT(DISTINCT lt.loyalty_id) AS transaction_count,
          COUNT(DISTINCT lt.sale_id) AS sales_count,
          COUNT(DISTINCT COALESCE(lt.branch_id, s.branch_id)) AS branches_visited,
          MAX(lt.created_at) AS last_earned_at
        FROM loyalty_transactions lt
        LEFT JOIN sales s ON lt.sale_id = s.sale_id
        WHERE lt.type = 'EARN'
          AND lt.points > 0
          AND lt.created_at >= ? 
          AND lt.created_at < DATE_ADD(?, INTERVAL 1 DAY)
        GROUP BY lt.customer_id
      ),
      ranked_global_customers AS (
        SELECT 
          c.customer_id,
          c.full_name,
          c.card_no,
          c.phone,
          c.email,
          c.tier,
          cgp.total_points_earned,
          cgp.transaction_count,
          cgp.sales_count,
          cgp.branches_visited,
          cgp.last_earned_at,
          DENSE_RANK() OVER (
            ORDER BY cgp.total_points_earned DESC, cgp.last_earned_at ASC
          ) AS rank_num
        FROM customer_global_points cgp
        JOIN customers c ON cgp.customer_id = c.customer_id
        WHERE c.is_active = 1
      )
      SELECT *
      FROM ranked_global_customers
      WHERE rank_num <= 10
      ORDER BY rank_num ASC;
    `;

    const [allRows] = await conn.query(sqlAll, [startDate, endDate]);
    console.log(`\nChain-Wide Top Results found: ${allRows.length}`);
    console.log(allRows);

  } catch (err) {
    console.error('Query error:', err);
  } finally {
    await conn.end();
  }
}

testRankings();
