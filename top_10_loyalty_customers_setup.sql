-- ====================================================================================
-- ADBMS MINI PROJECT: TOP 10 LOYALTY POINT CUSTOMERS BY BRANCH & TIME PERIOD
-- Database Engine: MySQL 8.0+
-- ====================================================================================

-- ------------------------------------------------------------------------------------
-- 1. SCHEMA ENHANCEMENT: ADD branch_id TO loyalty_transactions IF MISSING
-- ------------------------------------------------------------------------------------
-- Ensure loyalty_transactions has a direct reference to the branch responsible for the transaction.
-- If branch_id does not already exist on loyalty_transactions, add it:
-- (Safe execution check)
SET @col_exists = (
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'loyalty_transactions' 
      AND COLUMN_NAME = 'branch_id'
);

SET @sql_add_col = IF(@col_exists = 0, 
    'ALTER TABLE loyalty_transactions ADD COLUMN branch_id INT NULL AFTER customer_id, ADD CONSTRAINT fk_lt_branch FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE SET NULL;', 
    'SELECT "Column branch_id already exists" AS status;'
);

PREPARE stmt FROM @sql_add_col;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Backfill branch_id from sales for historical transactions tied to a sale
UPDATE loyalty_transactions lt
JOIN sales s ON lt.sale_id = s.sale_id
SET lt.branch_id = s.branch_id
WHERE lt.branch_id IS NULL;

-- For any remaining manual transactions without branch_id, default to branch 1
UPDATE loyalty_transactions
SET branch_id = 1
WHERE branch_id IS NULL;


-- ------------------------------------------------------------------------------------
-- 2. PERFORMANCE INDEXES (FOR EFFICIENT DATE-RANGE AGGREGATION & WINDOW RANKING)
-- ------------------------------------------------------------------------------------
-- Index for per-branch filtered date-range aggregation
CREATE INDEX IF NOT EXISTS idx_lt_branch_type_created 
ON loyalty_transactions(branch_id, type, created_at);

-- Index for chain-wide date-range aggregation
CREATE INDEX IF NOT EXISTS idx_lt_type_created 
ON loyalty_transactions(type, created_at);

-- Index for customer history lookups
CREATE INDEX IF NOT EXISTS idx_lt_cust_created 
ON loyalty_transactions(customer_id, created_at);


-- ------------------------------------------------------------------------------------
-- 3. STANDARD COMPATIBILITY VIEW: loyalty_point_transaction
-- ------------------------------------------------------------------------------------
-- Maps database conventions directly to prompt specifications:
-- transaction_id, customer_id, branch_id, sale_id, transaction_type, points, transaction_date, created_at
CREATE OR REPLACE VIEW loyalty_point_transaction AS
SELECT 
    lt.loyalty_id AS transaction_id,
    lt.customer_id,
    COALESCE(lt.branch_id, s.branch_id, 1) AS branch_id,
    lt.sale_id,
    lt.type AS transaction_type,
    lt.points,
    lt.created_at AS transaction_date,
    lt.created_at
FROM loyalty_transactions lt
LEFT JOIN sales s ON lt.sale_id = s.sale_id;


-- ------------------------------------------------------------------------------------
-- 4. STORED PROCEDURE 1: GET TOP 10 LOYALTY CUSTOMERS PER BRANCH
-- ------------------------------------------------------------------------------------
-- Parameters:
--   p_start_date DATE: Start of ranking period (inclusive)
--   p_end_date   DATE: End of ranking period (inclusive)
--   p_branch_id  INT: Optional branch filter. If NULL, ranks top 10 for EACH branch.
DELIMITER //

CREATE OR REPLACE PROCEDURE sp_top_10_loyalty_customers_per_branch(
    IN p_start_date DATE,
    IN p_end_date DATE,
    IN p_branch_id INT
)
BEGIN
    -- Validate date range
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
END //

DELIMITER ;


-- ------------------------------------------------------------------------------------
-- 5. STORED PROCEDURE 2: GET TOP 10 LOYALTY CUSTOMERS CHAIN-WIDE (ALL BRANCHES)
-- ------------------------------------------------------------------------------------
-- Parameters:
--   p_start_date DATE: Start of ranking period (inclusive)
--   p_end_date   DATE: End of ranking period (inclusive)
DELIMITER //

CREATE OR REPLACE PROCEDURE sp_top_10_loyalty_customers_all_branches(
    IN p_start_date DATE,
    IN p_end_date DATE
)
BEGIN
    -- Validate date range
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
END //

DELIMITER ;
