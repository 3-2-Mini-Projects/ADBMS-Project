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

async function deployProcedures() {
  const conn = await mysql.createConnection({
    host: env.DB_HOST || 'localhost',
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME || 'supermarket_ADBMS',
    multipleStatements: true,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await conn.query(`DROP PROCEDURE IF EXISTS sp_top_10_loyalty_customers_per_branch`);
    await conn.query(`
      CREATE PROCEDURE sp_top_10_loyalty_customers_per_branch(
          IN p_start_date DATE,
          IN p_end_date DATE,
          IN p_branch_id INT
      )
      BEGIN
          IF p_start_date > p_end_date THEN
              SIGNAL SQLSTATE '45000'
              SET MESSAGE_TEXT = 'Start date cannot be greater than end date.';
          END IF;

          WITH customer_branch_points AS (
              SELECT 
                  lt.customer_id,
                  COALESCE(lt.branch_id, s.branch_id, 1) AS branch_id,
                  SUM(lt.points) AS total_points_earned,
                  COUNT(DISTINCT lt.loyalty_id) AS transaction_count,
                  COUNT(DISTINCT lt.sale_id) AS sales_count,
                  MAX(lt.created_at) AS last_earned_at
              FROM loyalty_transactions lt
              LEFT JOIN sales s ON lt.sale_id = s.sale_id
              WHERE lt.type = 'EARN'
                AND lt.points > 0
                AND lt.created_at >= p_start_date
                AND lt.created_at < DATE_ADD(p_end_date, INTERVAL 1 DAY)
                AND (p_branch_id IS NULL OR COALESCE(lt.branch_id, s.branch_id, 1) = p_branch_id)
              GROUP BY lt.customer_id, COALESCE(lt.branch_id, s.branch_id, 1)
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
          SELECT 
              rank_num,
              branch_id,
              branch_name,
              branch_code,
              branch_city,
              customer_id,
              full_name,
              card_no,
              phone,
              email,
              tier,
              total_points_earned,
              transaction_count,
              sales_count,
              last_earned_at
          FROM ranked_branch_customers
          WHERE rank_num <= 10
          ORDER BY branch_id ASC, rank_num ASC;
      END
    `);
    console.log('Successfully deployed: sp_top_10_loyalty_customers_per_branch');

    await conn.query(`DROP PROCEDURE IF EXISTS sp_top_10_loyalty_customers_all_branches`);
    await conn.query(`
      CREATE PROCEDURE sp_top_10_loyalty_customers_all_branches(
          IN p_start_date DATE,
          IN p_end_date DATE
      )
      BEGIN
          IF p_start_date > p_end_date THEN
              SIGNAL SQLSTATE '45000'
              SET MESSAGE_TEXT = 'Start date cannot be greater than end date.';
          END IF;

          WITH customer_global_points AS (
              SELECT 
                  lt.customer_id,
                  SUM(lt.points) AS total_points_earned,
                  COUNT(DISTINCT lt.loyalty_id) AS transaction_count,
                  COUNT(DISTINCT lt.sale_id) AS sales_count,
                  COUNT(DISTINCT COALESCE(lt.branch_id, s.branch_id, 1)) AS branches_visited,
                  MAX(lt.created_at) AS last_earned_at
              FROM loyalty_transactions lt
              LEFT JOIN sales s ON lt.sale_id = s.sale_id
              WHERE lt.type = 'EARN'
                AND lt.points > 0
                AND lt.created_at >= p_start_date
                AND lt.created_at < DATE_ADD(p_end_date, INTERVAL 1 DAY)
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
          SELECT 
              rank_num,
              customer_id,
              full_name,
              card_no,
              phone,
              email,
              tier,
              total_points_earned,
              transaction_count,
              sales_count,
              branches_visited,
              last_earned_at
          FROM ranked_global_customers
          WHERE rank_num <= 10
          ORDER BY rank_num ASC;
      END
    `);
    console.log('Successfully deployed: sp_top_10_loyalty_customers_all_branches');

  } catch (err) {
    console.error('Error deploying procedures:', err);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

deployProcedures();
