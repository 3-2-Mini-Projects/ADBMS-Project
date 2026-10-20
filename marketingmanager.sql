USE supermarket_oltp;

-- ============================================================
-- SUPERMARKET OLTP - MARKETING MODULE
-- VIEWS, PROCEDURES, FUNCTIONS, TRIGGERS AND EVENTS
-- Role: Marketing Manager
-- ============================================================

-- ============================================================
-- 1. DROP EXISTING OBJECTS (CLEAN SLATE RE-RUNNABLE)
-- ============================================================

DROP VIEW IF EXISTS customer_summary_vw;
DROP VIEW IF EXISTS top_customers_vw;
DROP VIEW IF EXISTS active_promotions_vw;
DROP VIEW IF EXISTS customer_etl_vw;

DROP PROCEDURE IF EXISTS register_customer;
DROP PROCEDURE IF EXISTS redeem_points;
DROP PROCEDURE IF EXISTS add_ltpoints;
DROP PROCEDURE IF EXISTS create_promotion;
DROP PROCEDURE IF EXISTS recalculate_tiers;
DROP PROCEDURE IF EXISTS proc_apply_coupon;

DROP FUNCTION IF EXISTS lt_points_earned;
DROP FUNCTION IF EXISTS get_discount;
DROP FUNCTION IF EXISTS modify_customer_tier;
DROP FUNCTION IF EXISTS promo_isactive;

DROP TRIGGER IF EXISTS before_promotions_insert;
DROP TRIGGER IF EXISTS before_insert_customers;
DROP TRIGGER IF EXISTS trg_sales_au_award_points;

DROP EVENT IF EXISTS evt_daily_expire_promotions;


-- ============================================================
-- 2. VIEWS
-- ============================================================

-- ------------------------------------------------------------
-- VIEW 1: Customer ETL View with Masked Phone for Privacy
-- ------------------------------------------------------------
CREATE VIEW customer_etl_vw AS
SELECT 
    customer_id,
    card_no,
    full_name,
    CONCAT(LEFT(phone, 3), '****', RIGHT(phone, 3)) AS masked_phone,
    email,
    tier,
    points_balance,
    join_date 
FROM customers;

-- ------------------------------------------------------------
-- VIEW 2: Active Promotions with Product & Category Names
-- ------------------------------------------------------------
CREATE VIEW active_promotions_vw AS
SELECT 
    p.promo_id,
    p.name AS promotion_name,
    p.discount_percent,
    p.start_date,
    p.end_date,
    p.product_id,
    pro.name AS product_name,
    p.category_id,
    c.name AS category_name
FROM promotions p
LEFT JOIN products pro ON pro.product_id = p.product_id
LEFT JOIN categories c ON c.category_id = p.category_id
WHERE p.is_active = 1 
  AND CURDATE() BETWEEN p.start_date AND p.end_date;

-- ------------------------------------------------------------
-- VIEW 3: Top Customers Leaderboard by Points Earned (Month-wise)
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW top_customers_vw AS
SELECT
    c.customer_id,
    c.card_no,
    c.full_name,
    c.tier,
    c.points_balance,
    DATE_FORMAT(lt.created_at, '%Y-%m') AS transaction_month,
    COALESCE(SUM(
        CASE
            WHEN lt.transaction_type = 'EARNED' OR lt.transaction_type = 'EARN'
            THEN COALESCE(lt.points_change, 0)
            ELSE 0
        END
    ), 0) AS total_points_earned
FROM customers c
LEFT JOIN loyalty_transactions lt
    ON c.customer_id = lt.customer_id
WHERE c.is_active = 1
  AND c.points_balance > 0
GROUP BY
    c.customer_id,
    c.card_no,
    c.full_name,
    c.tier,
    c.points_balance,
    DATE_FORMAT(lt.created_at, '%Y-%m');


-- ------------------------------------------------------------
-- VIEW 4: Comprehensive Customer Marketing & Points Summary
-- ------------------------------------------------------------
CREATE VIEW customer_summary_vw AS
SELECT
    c.customer_id,
    c.card_no,
    c.full_name,
    c.phone,
    c.email,
    c.tier,
    c.points_balance,
    COALESCE(lt_agg.total_points_earned, 0) AS total_points_earned,
    COALESCE(lt_agg.total_points_redeemed, 0) AS total_points_redeemed,
    COALESCE(s.total_spent, 0) AS total_spent,
    COALESCE(s.total_orders, 0) AS total_orders
FROM customers c
LEFT JOIN (
    SELECT
        customer_id,
        SUM(CASE 
            WHEN transaction_type = 'EARNED' OR type = 'EARN' THEN COALESCE(points_change, points, 0)
            ELSE 0 
        END) AS total_points_earned,
        SUM(CASE 
            WHEN transaction_type = 'REDEEMED' OR type = 'REDEEM' THEN ABS(COALESCE(points_change, points, 0))
            ELSE 0 
        END) AS total_points_redeemed
    FROM loyalty_transactions
    GROUP BY customer_id
) AS lt_agg ON c.customer_id = lt_agg.customer_id
LEFT JOIN (
    SELECT
        customer_id,
        SUM(total_amount) AS total_spent,
        COUNT(sale_id) AS total_orders
    FROM sales
    WHERE status = 'COMPLETED' AND customer_id IS NOT NULL
    GROUP BY customer_id
) AS s ON c.customer_id = s.customer_id;


-- ============================================================
-- 3. FUNCTIONS
-- ============================================================

-- ------------------------------------------------------------
-- FUNCTION 1: Calculate Points Earned from Purchase Amount (1 pt / Rs. 100)
-- ------------------------------------------------------------
DELIMITER //
CREATE FUNCTION lt_points_earned(product_ammount DECIMAL(12,2))
RETURNS INT
DETERMINISTIC
NO SQL
BEGIN
    RETURN FLOOR(GREATEST(COALESCE(product_ammount, 0), 0) / 100);
END //
DELIMITER ;

-- ------------------------------------------------------------
-- FUNCTION 2: Calculate Promotion Discount for a Given Amount
-- ------------------------------------------------------------
DELIMITER //
CREATE FUNCTION get_discount(p_amount DECIMAL(12,2), promo_id INT)
RETURNS DECIMAL(9,2)
READS SQL DATA 
BEGIN
    DECLARE discount DECIMAL(5,2) DEFAULT 0;
    SELECT COALESCE(MAX(discount_percent), 0) INTO discount
    FROM promotions
    WHERE promotions.promo_id = promo_id 
      AND is_active = 1
      AND CURDATE() BETWEEN start_date AND end_date;
    RETURN GREATEST(COALESCE(p_amount, 0), 0) * discount / 100;
END //
DELIMITER ;

-- ------------------------------------------------------------
-- FUNCTION 3: Compute Customer Tier by Cumulative Completed Spending
-- ------------------------------------------------------------
DELIMITER //
CREATE FUNCTION modify_customer_tier(p_customer_id INT)
RETURNS VARCHAR(20)
READS SQL DATA 
BEGIN
    DECLARE spending DECIMAL(14,2) DEFAULT 0;
    SELECT COALESCE(SUM(total_amount), 0) INTO spending
    FROM sales 
    WHERE customer_id = p_customer_id AND status = 'COMPLETED';

    RETURN CASE
        WHEN spending >= 100000 THEN 'PLATINUM'
        WHEN spending >= 50000  THEN 'GOLD'
        WHEN spending >= 20000  THEN 'SILVER'
        ELSE 'BRONZE'
    END;
END //
DELIMITER ;

-- ------------------------------------------------------------
-- FUNCTION 4: Check if Promotion is Active and Within Date Range
-- ------------------------------------------------------------
DELIMITER //
CREATE FUNCTION promo_isactive(promo_id INT)
RETURNS TINYINT
READS SQL DATA
BEGIN
    DECLARE isactive TINYINT DEFAULT 0;
    SELECT COALESCE(MAX(is_active = 1 AND CURDATE() BETWEEN start_date AND end_date), 0)
    INTO isactive
    FROM promotions
    WHERE promotions.promo_id = promo_id;
    RETURN isactive;
END //
DELIMITER ;


-- ============================================================
-- 4. STORED PROCEDURES
-- ============================================================

-- ------------------------------------------------------------
-- PROCEDURE 1: Register New Customer
-- ------------------------------------------------------------
DELIMITER //
CREATE PROCEDURE register_customer(
    IN p_card_no VARCHAR(20),
    IN p_full_name VARCHAR(100),
    IN p_phone VARCHAR(20),
    IN p_email VARCHAR(100),
    IN p_city VARCHAR(60)
)
BEGIN
    INSERT INTO customers (card_no, full_name, phone, email, city, join_date, tier, points_balance, is_active)
    VALUES (p_card_no, p_full_name, p_phone, p_email, p_city, CURDATE(), 'BRONZE', 0, 1);

    SELECT LAST_INSERT_ID() AS customer_id;
END //
DELIMITER ;

-- ------------------------------------------------------------
-- PROCEDURE 2: Redeem Points with Balance Validation & Concurrency Lock
-- ------------------------------------------------------------
DELIMITER //
CREATE PROCEDURE redeem_points(
    IN p_customer_id INT,
    IN p_points INT,
    IN p_sale_id INT
)
BEGIN
    DECLARE balance INT DEFAULT NULL;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_points <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Redemption points must be positive';
    END IF;

    START TRANSACTION;

    SELECT points_balance INTO balance
    FROM customers
    WHERE customer_id = p_customer_id AND is_active = 1
    FOR UPDATE;

    IF balance IS NULL OR balance < p_points THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid customer or insufficient points';
    END IF;

    UPDATE customers
    SET points_balance = points_balance - p_points
    WHERE customer_id = p_customer_id;

    INSERT INTO loyalty_transactions (
        customer_id, sale_id, points_change, transaction_type, created_at
    )
    VALUES (
        p_customer_id, p_sale_id, -p_points,
        'REDEEMED', NOW()
    );

    COMMIT;
END //
DELIMITER ;

-- ------------------------------------------------------------
-- PROCEDURE 3: Add Loyalty Points from Purchase
-- ------------------------------------------------------------
DELIMITER //
CREATE PROCEDURE add_ltpoints(
    IN p_customer_id INT,
    IN p_points INT,
    IN p_sale_id INT,
    IN p_note VARCHAR(200)
)
BEGIN
    DECLARE customerId INT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_points <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Points must be greater than zero';
    END IF;

    START TRANSACTION;

    SELECT customer_id INTO customerId FROM customers
    WHERE customer_id = p_customer_id AND is_active = 1
    FOR UPDATE;

    INSERT INTO loyalty_transactions (customer_id, sale_id, points_change, transaction_type, created_at)
    VALUES (p_customer_id, p_sale_id, p_points, 'EARNED', NOW());

    UPDATE customers
    SET points_balance = points_balance + p_points
    WHERE customer_id = p_customer_id;

    COMMIT;
END //
DELIMITER ;

-- ------------------------------------------------------------
-- PROCEDURE 4: Create Promotion Campaign
-- ------------------------------------------------------------
DELIMITER //
CREATE PROCEDURE create_promotion(
    IN p_name VARCHAR(100),
    IN p_discount DECIMAL(5,2),
    IN p_start DATE,
    IN p_end DATE,
    IN p_product_id INT,
    IN p_category_id INT
)
BEGIN
    INSERT INTO promotions (
        name, discount_percent, start_date, end_date,
        product_id, category_id, is_active
    )
    VALUES (
        p_name, p_discount, p_start, p_end,
        p_product_id, p_category_id, 1
    );

    SELECT LAST_INSERT_ID() AS promo_id;
END //
DELIMITER ;

-- ------------------------------------------------------------
-- PROCEDURE 5: Recalculate Membership Tiers & Audit in History
-- ------------------------------------------------------------
DELIMITER //

CREATE PROCEDURE recalculate_tiers()
BEGIN
    DECLARE done INT DEFAULT 0;
    DECLARE customerId INT;
    DECLARE old_tier VARCHAR(10);
    DECLARE new_tier VARCHAR(10);
    DECLARE customer_points INT;

    DECLARE cur CURSOR FOR
        SELECT customer_id, tier, points_balance
        FROM customers
        WHERE is_active = 1;

    DECLARE CONTINUE HANDLER FOR NOT FOUND
        SET done = 1;

    OPEN cur;

    tier_loop: LOOP

        FETCH cur INTO customerId, old_tier, customer_points;

        IF done = 1 THEN
            LEAVE tier_loop;
        END IF;

        -- Calculate tier using points balance
        IF customer_points >= 3000 THEN
            SET new_tier = 'PLATINUM';
        ELSEIF customer_points >= 1500 THEN
            SET new_tier = 'GOLD';
        ELSEIF customer_points >= 500 THEN
            SET new_tier = 'SILVER';
        ELSE
            SET new_tier = 'BRONZE';
        END IF;

        -- Update only when the tier changes
        IF old_tier <> new_tier THEN

            INSERT INTO customer_tier_history (
                customer_id,
                old_tier,
                new_tier,
                reason
            )
            VALUES (
                customerId,
                old_tier,
                new_tier,
                'Tier recalculated from points balance'
            );

            UPDATE customers
            SET tier = new_tier
            WHERE customer_id = customerId;

        END IF;

    END LOOP;

    CLOSE cur;
END //

DELIMITER ;

-- ------------------------------------------------------------
-- PROCEDURE 6: Apply Valid Coupon to Open Sale
-- ------------------------------------------------------------
DELIMITER //
CREATE PROCEDURE proc_apply_coupon(
    IN p_sale_id INT,
    IN p_code VARCHAR(50)
)
BEGIN
    DECLARE v_coupon_id INT;
    DECLARE v_promo_id INT;
    DECLARE v_coupon_customer INT;
    DECLARE v_sale_customer INT;
    DECLARE v_is_used TINYINT;
    DECLARE v_expiry_date DATE;
    DECLARE v_discount_percent DECIMAL(5,2);
    DECLARE v_subtotal DECIMAL(12,2);
    DECLARE v_old_discount DECIMAL(12,2);
    DECLARE v_tax DECIMAL(12,2);
    DECLARE v_status VARCHAR(20);
    DECLARE v_total_discount DECIMAL(12,2);
    DECLARE v_not_found INT DEFAULT 0;

    DECLARE CONTINUE HANDLER FOR NOT FOUND
        SET v_not_found = 1;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- 1. Check and lock the sale
    SELECT customer_id, subtotal, discount_total, tax_total, status
    INTO v_sale_customer, v_subtotal, v_old_discount, v_tax, v_status
    FROM sales
    WHERE sale_id = p_sale_id
    FOR UPDATE;

    IF v_not_found = 1 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Sale not found';
    END IF;

    IF v_status <> 'OPEN' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Coupon can only be applied to an open sale';
    END IF;

    -- 2. Check and lock the coupon
    SET v_not_found = 0;

    SELECT coupon_id, promo_id, customer_id, is_used, expiry_date
    INTO v_coupon_id, v_promo_id, v_coupon_customer, v_is_used, v_expiry_date
    FROM coupons
    WHERE code = p_code
    FOR UPDATE;

    IF v_not_found = 1 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Coupon not found';
    END IF;

    IF v_is_used = 1 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Coupon has already been used';
    END IF;

    IF v_expiry_date IS NOT NULL AND v_expiry_date < CURDATE() THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Coupon has expired';
    END IF;

    IF v_coupon_customer IS NOT NULL
       AND (v_sale_customer IS NULL OR v_coupon_customer <> v_sale_customer) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Coupon does not belong to this customer';
    END IF;

    -- 3. Check the promotion
    SET v_not_found = 0;

    SELECT discount_percent
    INTO v_discount_percent
    FROM promotions
    WHERE promo_id = v_promo_id
      AND is_active = 1
      AND CURDATE() BETWEEN start_date AND end_date;

    IF v_not_found = 1 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Promotion is not active';
    END IF;

    -- 4. Calculate and apply the discount
    SET v_total_discount = LEAST(
        v_subtotal,
        COALESCE(v_old_discount, 0) + (v_subtotal * v_discount_percent / 100)
    );

    UPDATE sales
    SET coupon_id = v_coupon_id,
        promo_id = v_promo_id,
        discount_total = v_total_discount,
        total_amount = GREATEST(0, v_subtotal - v_total_discount + COALESCE(v_tax, 0))
    WHERE sale_id = p_sale_id;

    UPDATE coupons
    SET is_used = 1,
        used_at = NOW()
    WHERE coupon_id = v_coupon_id;

    COMMIT;
END //
DELIMITER ;


-- ============================================================
-- 5. TRIGGERS
-- ============================================================

-- ------------------------------------------------------------
-- TRIGGER 1: Validate Promotion discount percent & date range
-- ------------------------------------------------------------
DELIMITER //
CREATE TRIGGER before_promotions_insert
BEFORE INSERT ON promotions
FOR EACH ROW
BEGIN
    IF NEW.discount_percent <= 0 OR NEW.discount_percent > 100 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Discount must be between 0 and 100';
    END IF;

    IF NEW.end_date < NEW.start_date THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'End date cannot precede start date';
    END IF;
END //
DELIMITER ;

-- ------------------------------------------------------------
-- TRIGGER 2: Validate Customer Phone & Email format
-- ------------------------------------------------------------
DELIMITER //
CREATE TRIGGER before_insert_customers
BEFORE INSERT ON customers
FOR EACH ROW
BEGIN
    IF NEW.phone IS NULL OR TRIM(NEW.phone) = '' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Customer phone is required';
    END IF;

    IF NEW.email IS NOT NULL
       AND TRIM(NEW.email) <> ''
       AND NEW.email NOT REGEXP '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid email address';
    END IF;
END //
DELIMITER ;

-- ------------------------------------------------------------
-- TRIGGER 3: Automatically Award Loyalty Points upon Sale Completion
-- ------------------------------------------------------------
DELIMITER //
CREATE TRIGGER trg_sales_au_award_points
AFTER UPDATE ON sales
FOR EACH ROW
BEGIN
    DECLARE v_points INT DEFAULT 0;

    IF OLD.status <> 'COMPLETED'
       AND NEW.status = 'COMPLETED'
       AND NEW.customer_id IS NOT NULL THEN

        SET v_points = FLOOR(GREATEST(NEW.total_amount, 0) / 100);

        IF v_points > 0 THEN
            UPDATE customers
            SET points_balance = points_balance + v_points
            WHERE customer_id = NEW.customer_id
              AND is_active = 1;

            IF ROW_COUNT() = 1 THEN
                INSERT INTO loyalty_transactions (
                    customer_id, sale_id, points_change, transaction_type, created_at
                )
                VALUES (
                    NEW.customer_id, NEW.sale_id, v_points,
                    'EARNED', NOW()
                );
            END IF;
        END IF;
    END IF;
END //
DELIMITER ;


-- ============================================================
-- 6. EVENTS
-- ============================================================

-- Ensure event scheduler is active
SET GLOBAL event_scheduler = ON;

-- ------------------------------------------------------------
-- EVENT 1: Daily Expire Promotions
-- ------------------------------------------------------------
DELIMITER //
CREATE EVENT IF NOT EXISTS evt_daily_expire_promotions
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP + INTERVAL 1 DAY
DO
BEGIN
    UPDATE promotions
    SET is_active = 0
    WHERE end_date < CURDATE()
      AND is_active = 1;
END //
DELIMITER ;


-- ============================================================
-- 7. VERIFICATION AND TEST QUERIES
-- ============================================================

-- Verification queries for views:
-- SELECT * FROM customer_etl_vw LIMIT 5;
-- SELECT * FROM active_promotions_vw LIMIT 5;
-- SELECT * FROM customer_summary_vw LIMIT 5;

-- Top 10 customers by points earned (Month-wise) from top_customers_vw:
-- Example 1: Top 10 customers with points_balance > 0
SELECT *
FROM top_customers_vw
WHERE points_balance > 0
ORDER BY total_points_earned DESC, points_balance DESC
LIMIT 10;

-- Example 2: Top 10 customers for a specific month (e.g. October 2026):
-- SELECT *
-- FROM top_customers_vw
-- WHERE transaction_month = '2026-10'
--   AND points_balance > 0
-- ORDER BY total_points_earned DESC, points_balance DESC
-- LIMIT 10;

-- SELECT lt_points_earned(500);
-- SELECT get_discount(500, 1);
-- SELECT modify_customer_tier(1);
-- SELECT promo_isactive(1);

-- CALL recalculate_tiers();
