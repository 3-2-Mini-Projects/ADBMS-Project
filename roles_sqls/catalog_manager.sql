USE supermarket_ADBMS;

-- ============================================================
-- 1. DROP EXISTING OBJECTS (CLEAN SLATE RE-RUNNABLE SCRIPT)
-- ============================================================

-- Drop Events
DROP EVENT IF EXISTS evt_daily_refresh_slow_movers;

-- Drop Triggers
DROP TRIGGER IF EXISTS trg_before_product_insert;
DROP TRIGGER IF EXISTS trg_before_product_update;
DROP TRIGGER IF EXISTS trg_after_product_price_history_insert;

-- Drop Stored Procedures
DROP PROCEDURE IF EXISTS sp_update_product_price;
DROP PROCEDURE IF EXISTS sp_supervisor_review_price_change;
DROP PROCEDURE IF EXISTS sp_refresh_slow_movers;
DROP PROCEDURE IF EXISTS sp_create_product_with_inventory;
DROP PROCEDURE IF EXISTS sp_apply_slow_mover_markdown;
DROP PROCEDURE IF EXISTS sp_discontinue_product;

-- Drop Functions
DROP FUNCTION IF EXISTS fn_calculate_profit_margin;
DROP FUNCTION IF EXISTS fn_price_percent_change;
DROP FUNCTION IF EXISTS fn_is_slow_mover;
DROP FUNCTION IF EXISTS fn_product_holding_capital;
DROP FUNCTION IF EXISTS fn_requires_supervisor_approval;

-- Drop Views
DROP VIEW IF EXISTS vw_product_catalog_details;
DROP VIEW IF EXISTS vw_product_price_history;
DROP VIEW IF EXISTS vw_slow_movers_analysis;
DROP VIEW IF EXISTS vw_category_hierarchy_summary;
DROP VIEW IF EXISTS vw_supplier_catalog_matrix;
DROP VIEW IF EXISTS vw_price_approval_queue;

-- ============================================================
-- 2. DDL & DATA-INTEGRITY CONSTRAINTS
-- ============================================================

-- ------------------------------------------------------------
-- Table 1: Product Price History (Price Audit & Supervisor Approvals)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_price_history (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    old_price DECIMAL(10,2) NOT NULL,
    new_price DECIMAL(10,2) NOT NULL,
    price_variance_pct DECIMAL(6,2) DEFAULT 0.00,
    changed_by INT NOT NULL,
    changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reason VARCHAR(255) DEFAULT 'Regular price update',
    supervisor_approval_status ENUM('APPROVED', 'PENDING_SUPERVISOR_APPROVAL', 'REJECTED') DEFAULT 'APPROVED',
    supervisor_id INT NULL,
    supervisor_comment VARCHAR(255) NULL,
    approved_at DATETIME NULL,
    CONSTRAINT fk_pph_product FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    CONSTRAINT fk_pph_changer FOREIGN KEY (changed_by) REFERENCES employees(employee_id),
    CONSTRAINT fk_pph_supervisor FOREIGN KEY (supervisor_id) REFERENCES employees(employee_id),
    INDEX idx_pph_product_date (product_id, changed_at),
    INDEX idx_pph_status (supervisor_approval_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table 2: Slow Movers (Stagnant Stock & Working Capital Tracking)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS slow_movers (
    slow_mover_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    branch_id INT NOT NULL,
    quantity_on_hand INT NOT NULL DEFAULT 0,
    cost_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    selling_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tied_up_capital DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    last_sale_date DATETIME NULL,
    days_without_sales INT NOT NULL DEFAULT 0,
    sales_velocity DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    turnover_ratio DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    recommended_action ENUM('DISCOUNT_PRICE', 'BUNDLE_PROMO', 'RETURN_TO_SUPPLIER', 'DISCONTINUE', 'MONITOR') DEFAULT 'MONITOR',
    recommended_discount_pct DECIMAL(5,2) DEFAULT 0.00,
    status ENUM('ACTIVE', 'ACTION_TAKEN', 'DISMISSED', 'DISCONTINUED') DEFAULT 'ACTIVE',
    action_taken_notes VARCHAR(255) NULL,
    last_analyzed DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sm_product FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    CONSTRAINT fk_sm_branch FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE CASCADE,
    UNIQUE KEY uq_slow_mover_branch_product (branch_id, product_id),
    INDEX idx_sm_days (days_without_sales),
    INDEX idx_sm_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table 3: Product Supervisor Rules (Approval Thresholds & Scope)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_supervisors (
    rule_id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NULL,
    supervisor_employee_id INT NOT NULL,
    max_autonomous_discount_pct DECIMAL(5,2) DEFAULT 15.00,
    allow_below_cost_sale TINYINT(1) DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ps_category FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL,
    CONSTRAINT fk_ps_employee FOREIGN KEY (supervisor_employee_id) REFERENCES employees(employee_id),
    INDEX idx_ps_cat (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default supervisor rule for Admin / General Supervisor if empty
INSERT IGNORE INTO product_supervisors (rule_id, category_id, supervisor_employee_id, max_autonomous_discount_pct, allow_below_cost_sale, is_active)
VALUES (1, NULL, 1, 15.00, 0, 1);


-- ============================================================
-- 3. VIEWS
-- ============================================================

-- ------------------------------------------------------------
-- VIEW 1: Master Product Catalog Details with Margins & Stock
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW vw_product_catalog_details AS
SELECT
    p.product_id,
    p.barcode,
    p.name AS product_name,
    p.brand,
    p.category_id,
    c.name AS category_name,
    parent_c.name AS parent_category_name,
    p.supplier_id,
    s.supplier_code,
    s.name AS supplier_name,
    p.unit_price,
    p.cost_price,
    ROUND(p.unit_price - p.cost_price, 2) AS gross_profit_margin,
    ROUND(
        CASE 
            WHEN p.unit_price > 0 THEN ((p.unit_price - p.cost_price) / p.unit_price) * 100 
            ELSE 0 
        END, 2
    ) AS profit_margin_pct,
    p.tax_rate,
    p.reorder_level,
    p.is_active,
    COALESCE(inv_agg.total_quantity_on_hand, 0) AS total_quantity_on_hand,
    COALESCE(inv_agg.branch_count, 0) AS branches_stocked_count,
    ROUND(COALESCE(inv_agg.total_quantity_on_hand, 0) * p.cost_price, 2) AS total_inventory_valuation,
    p.created_at,
    p.updated_at
FROM products p
LEFT JOIN categories c ON p.category_id = c.category_id
LEFT JOIN categories parent_c ON c.parent_id = parent_c.category_id
LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id
LEFT JOIN (
    SELECT
        product_id,
        SUM(quantity_on_hand) AS total_quantity_on_hand,
        COUNT(DISTINCT branch_id) AS branch_count
    FROM inventory
    GROUP BY product_id
) inv_agg ON p.product_id = inv_agg.product_id;

-- ------------------------------------------------------------
-- VIEW 2: Complete Price History & Supervisor Review Audit Log
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW vw_product_price_history AS
SELECT
    h.history_id,
    h.product_id,
    p.barcode,
    p.name AS product_name,
    p.brand,
    c.name AS category_name,
    h.old_price,
    h.new_price,
    ROUND(h.new_price - h.old_price, 2) AS price_difference,
    h.price_variance_pct,
    h.changed_by,
    e_changer.full_name AS changed_by_name,
    e_changer.role AS changed_by_role,
    h.changed_at,
    h.reason,
    h.supervisor_approval_status,
    h.supervisor_id,
    e_sup.full_name AS supervisor_name,
    h.supervisor_comment,
    h.approved_at
FROM product_price_history h
JOIN products p ON h.product_id = p.product_id
LEFT JOIN categories c ON p.category_id = c.category_id
LEFT JOIN employees e_changer ON h.changed_by = e_changer.employee_id
LEFT JOIN employees e_sup ON h.supervisor_id = e_sup.employee_id;

-- ------------------------------------------------------------
-- VIEW 3: Slow Movers Analysis & Capital Stagnation
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW vw_slow_movers_analysis AS
SELECT
    sm.slow_mover_id,
    sm.product_id,
    p.barcode,
    p.name AS product_name,
    p.brand,
    c.name AS category_name,
    s.name AS supplier_name,
    sm.branch_id,
    b.name AS branch_name,
    sm.quantity_on_hand,
    sm.cost_price,
    sm.selling_price,
    sm.tied_up_capital,
    sm.last_sale_date,
    sm.days_without_sales,
    sm.sales_velocity,
    sm.turnover_ratio,
    sm.recommended_action,
    sm.recommended_discount_pct,
    sm.status,
    sm.action_taken_notes,
    sm.last_analyzed,
    CASE
        WHEN sm.days_without_sales >= 90 THEN 'CRITICAL'
        WHEN sm.days_without_sales >= 60 THEN 'HIGH'
        WHEN sm.days_without_sales >= 30 THEN 'MODERATE'
        ELSE 'LOW'
    END AS stagnation_level
FROM slow_movers sm
JOIN products p ON sm.product_id = p.product_id
JOIN branches b ON sm.branch_id = b.branch_id
LEFT JOIN categories c ON p.category_id = c.category_id
LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id;

-- ------------------------------------------------------------
-- VIEW 4: Hierarchical Category Summary with Margin Aggregates
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW vw_category_hierarchy_summary AS
SELECT
    c.category_id,
    c.name AS category_name,
    c.parent_id,
    parent.name AS parent_category_name,
    COUNT(p.product_id) AS total_products,
    SUM(CASE WHEN p.is_active = 1 THEN 1 ELSE 0 END) AS active_products,
    COALESCE(SUM(inv.quantity_on_hand), 0) AS total_units_in_stock,
    ROUND(COALESCE(SUM(inv.quantity_on_hand * p.cost_price), 0), 2) AS category_stock_value,
    ROUND(AVG(p.unit_price), 2) AS avg_unit_price,
    ROUND(AVG(p.cost_price), 2) AS avg_cost_price,
    ROUND(
        AVG(
            CASE 
                WHEN p.unit_price > 0 THEN ((p.unit_price - p.cost_price) / p.unit_price) * 100 
                ELSE 0 
            END
        ), 2
    ) AS avg_profit_margin_pct
FROM categories c
LEFT JOIN categories parent ON c.parent_id = parent.category_id
LEFT JOIN products p ON c.category_id = p.category_id
LEFT JOIN inventory inv ON p.product_id = inv.product_id
GROUP BY c.category_id, c.name, c.parent_id, parent.name;

-- ------------------------------------------------------------
-- VIEW 5: Supplier Catalog Matrix & Supply Margins
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW vw_supplier_catalog_matrix AS
SELECT
    s.supplier_id,
    s.supplier_code,
    s.name AS supplier_name,
    s.contact_name,
    s.phone,
    s.email,
    s.is_active,
    COUNT(p.product_id) AS total_products_supplied,
    SUM(CASE WHEN p.is_active = 1 THEN 1 ELSE 0 END) AS active_products_supplied,
    ROUND(AVG(p.cost_price), 2) AS avg_cost_price,
    ROUND(AVG(p.unit_price), 2) AS avg_selling_price,
    ROUND(
        AVG(
            CASE 
                WHEN p.unit_price > 0 THEN ((p.unit_price - p.cost_price) / p.unit_price) * 100 
                ELSE 0 
            END
        ), 2
    ) AS avg_supply_margin_pct,
    COALESCE(SUM(inv.quantity_on_hand), 0) AS total_inventory_on_hand
FROM suppliers s
LEFT JOIN products p ON s.supplier_id = p.supplier_id
LEFT JOIN inventory inv ON p.product_id = inv.product_id
GROUP BY s.supplier_id, s.supplier_code, s.name, s.contact_name, s.phone, s.email, s.is_active;

-- ------------------------------------------------------------
-- VIEW 6: Price Revision Approval Queue for Supervisors
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW vw_price_approval_queue AS
SELECT
    h.history_id,
    h.product_id,
    p.barcode,
    p.name AS product_name,
    p.brand,
    c.name AS category_name,
    p.cost_price,
    h.old_price,
    h.new_price,
    h.price_variance_pct,
    ROUND(h.new_price - p.cost_price, 2) AS proposed_unit_margin,
    CASE WHEN h.new_price < p.cost_price THEN 1 ELSE 0 END AS is_below_cost,
    h.changed_by,
    e.full_name AS requester_name,
    e.role AS requester_role,
    h.changed_at,
    h.reason,
    h.supervisor_approval_status
FROM product_price_history h
JOIN products p ON h.product_id = p.product_id
LEFT JOIN categories c ON p.category_id = c.category_id
LEFT JOIN employees e ON h.changed_by = e.employee_id
WHERE h.supervisor_approval_status = 'PENDING_SUPERVISOR_APPROVAL';


-- ============================================================
-- 4. FUNCTIONS
-- ============================================================

DELIMITER //

-- ------------------------------------------------------------
-- FUNCTION 1: Calculate Profit Margin Percentage
-- ------------------------------------------------------------
CREATE FUNCTION fn_calculate_profit_margin(
    p_cost DECIMAL(10,2),
    p_unit_price DECIMAL(10,2)
)
RETURNS DECIMAL(6,2)
DETERMINISTIC
NO SQL
BEGIN
    IF p_unit_price IS NULL OR p_unit_price <= 0 THEN
        RETURN 0.00;
    END IF;
    RETURN ROUND(((p_unit_price - COALESCE(p_cost, 0.00)) / p_unit_price) * 100, 2);
END //

-- ------------------------------------------------------------
-- FUNCTION 2: Calculate Percentage Price Change
-- ------------------------------------------------------------
CREATE FUNCTION fn_price_percent_change(
    p_old_price DECIMAL(10,2),
    p_new_price DECIMAL(10,2)
)
RETURNS DECIMAL(6,2)
DETERMINISTIC
NO SQL
BEGIN
    IF p_old_price IS NULL OR p_old_price <= 0 THEN
        RETURN 0.00;
    END IF;
    RETURN ROUND(((p_new_price - p_old_price) / p_old_price) * 100, 2);
END //

-- ------------------------------------------------------------
-- FUNCTION 3: Check if Product is a Slow Mover (No sales in N days)
-- ------------------------------------------------------------
CREATE FUNCTION fn_is_slow_mover(
    p_product_id INT,
    p_days_threshold INT
)
RETURNS TINYINT
READS SQL DATA
BEGIN
    DECLARE v_recent_sales INT DEFAULT 0;
    DECLARE v_days INT DEFAULT COALESCE(p_days_threshold, 30);

    SELECT COUNT(si.sale_item_id)
    INTO v_recent_sales
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.sale_id
    WHERE si.product_id = p_product_id
      AND s.status = 'COMPLETED'
      AND s.sale_date >= DATE_SUB(CURRENT_DATE, INTERVAL v_days DAY);

    IF v_recent_sales = 0 THEN
        RETURN 1; -- Is a slow mover
    ELSE
        RETURN 0;
    END IF;
END //

-- ------------------------------------------------------------
-- FUNCTION 4: Calculate Total Capital Tied up in a Product
-- ------------------------------------------------------------
CREATE FUNCTION fn_product_holding_capital(
    p_product_id INT
)
RETURNS DECIMAL(12,2)
READS SQL DATA
BEGIN
    DECLARE v_capital DECIMAL(12,2) DEFAULT 0.00;

    SELECT COALESCE(SUM(i.quantity_on_hand * p.cost_price), 0.00)
    INTO v_capital
    FROM inventory i
    JOIN products p ON i.product_id = p.product_id
    WHERE i.product_id = p_product_id;

    RETURN v_capital;
END //

-- ------------------------------------------------------------
-- FUNCTION 5: Evaluate If Price Change Requires Supervisor Approval
-- Threshold: Price reduction > 15% OR selling price < cost price
-- ------------------------------------------------------------
CREATE FUNCTION fn_requires_supervisor_approval(
    p_old_price DECIMAL(10,2),
    p_new_price DECIMAL(10,2),
    p_cost_price DECIMAL(10,2)
)
RETURNS TINYINT
DETERMINISTIC
NO SQL
BEGIN
    DECLARE v_pct_change DECIMAL(6,2);

    -- If price drops below cost price, always require supervisor approval
    IF p_new_price < p_cost_price THEN
        RETURN 1;
    END IF;

    -- Calculate percent change
    IF p_old_price > 0 THEN
        SET v_pct_change = ((p_new_price - p_old_price) / p_old_price) * 100;
        -- If price drops by more than 15% (e.g. -16%), require approval
        IF v_pct_change < -15.00 THEN
            RETURN 1;
        END IF;
    END IF;

    RETURN 0;
END //

DELIMITER ;


-- ============================================================
-- 5. STORED PROCEDURES
-- ============================================================

DELIMITER //

-- ------------------------------------------------------------
-- PROCEDURE 1: Update Product Price with Supervisor Approval Gate
-- ------------------------------------------------------------
CREATE PROCEDURE sp_update_product_price(
    IN p_product_id INT,
    IN p_new_price DECIMAL(10,2),
    IN p_changed_by INT,
    IN p_reason VARCHAR(255),
    OUT p_status_code VARCHAR(30),
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_old_price DECIMAL(10,2);
    DECLARE v_cost_price DECIMAL(10,2);
    DECLARE v_is_active TINYINT;
    DECLARE v_variance_pct DECIMAL(6,2);
    DECLARE v_needs_approval TINYINT DEFAULT 0;
    DECLARE v_not_found INT DEFAULT 0;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_not_found = 1;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_status_code = 'ERROR';
        SET p_message = 'Database error occurred during price revision transaction';
    END;

    START TRANSACTION;

    -- 1. Read and lock product row
    SELECT unit_price, cost_price, is_active
    INTO v_old_price, v_cost_price, v_is_active
    FROM products
    WHERE product_id = p_product_id
    FOR UPDATE;

    IF v_not_found = 1 THEN
        ROLLBACK;
        SET p_status_code = 'NOT_FOUND';
        SET p_message = 'Product not found';
    ELSEIF p_new_price <= 0 THEN
        ROLLBACK;
        SET p_status_code = 'INVALID_PRICE';
        SET p_message = 'New selling price must be greater than zero';
    ELSE
        -- 2. Calculate variance
        SET v_variance_pct = fn_price_percent_change(v_old_price, p_new_price);
        SET v_needs_approval = fn_requires_supervisor_approval(v_old_price, p_new_price, v_cost_price);

        IF v_needs_approval = 1 THEN
            -- High variance or below cost: Queue for Supervisor Approval
            INSERT INTO product_price_history (
                product_id, old_price, new_price, price_variance_pct,
                changed_by, changed_at, reason, supervisor_approval_status
            )
            VALUES (
                p_product_id, v_old_price, p_new_price, v_variance_pct,
                p_changed_by, NOW(), p_reason, 'PENDING_SUPERVISOR_APPROVAL'
            );

            COMMIT;
            SET p_status_code = 'PENDING_APPROVAL';
            SET p_message = 'Price change exceeds policy threshold (>15% drop or below cost). Queued for Supervisor Approval.';
        ELSE
            -- Autonomous approval: Commit price update immediately
            INSERT INTO product_price_history (
                product_id, old_price, new_price, price_variance_pct,
                changed_by, changed_at, reason, supervisor_approval_status, approved_at
            )
            VALUES (
                p_product_id, v_old_price, p_new_price, v_variance_pct,
                p_changed_by, NOW(), p_reason, 'APPROVED', NOW()
            );

            UPDATE products
            SET unit_price = p_new_price,
                updated_at = NOW()
            WHERE product_id = p_product_id;

            -- Audit Log entry
            INSERT INTO audit_log (
                table_name, record_id, action, old_value, new_value, changed_by, changed_at
            )
            VALUES (
                'products',
                CAST(p_product_id AS CHAR),
                'UPDATE',
                JSON_OBJECT('unit_price', v_old_price),
                JSON_OBJECT('unit_price', p_new_price, 'variance_pct', v_variance_pct),
                CONCAT('employee_', p_changed_by),
                NOW()
            );

            COMMIT;
            SET p_status_code = 'SUCCESS';
            SET p_message = 'Product price successfully updated and recorded in price history';
        END IF;
    END IF;
END //

-- ------------------------------------------------------------
-- PROCEDURE 2: Supervisor Review & Decision on Pending Price Change
-- ------------------------------------------------------------
CREATE PROCEDURE sp_supervisor_review_price_change(
    IN p_history_id INT,
    IN p_supervisor_id INT,
    IN p_decision ENUM('APPROVED', 'REJECTED'),
    IN p_comment VARCHAR(255),
    OUT p_status_code VARCHAR(30),
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_product_id INT;
    DECLARE v_new_price DECIMAL(10,2);
    DECLARE v_old_price DECIMAL(10,2);
    DECLARE v_current_status VARCHAR(40);
    DECLARE v_not_found INT DEFAULT 0;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_not_found = 1;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_status_code = 'ERROR';
        SET p_message = 'Database error occurred during supervisor review';
    END;

    START TRANSACTION;

    SELECT product_id, old_price, new_price, supervisor_approval_status
    INTO v_product_id, v_old_price, v_new_price, v_current_status
    FROM product_price_history
    WHERE history_id = p_history_id
    FOR UPDATE;

    IF v_not_found = 1 THEN
        ROLLBACK;
        SET p_status_code = 'NOT_FOUND';
        SET p_message = 'Price history record not found';
    ELSEIF v_current_status <> 'PENDING_SUPERVISOR_APPROVAL' THEN
        ROLLBACK;
        SET p_status_code = 'ALREADY_PROCESSED';
        SET p_message = 'This price revision request has already been reviewed';
    ELSE
        IF p_decision = 'APPROVED' THEN
            -- Apply the price to the product
            UPDATE products
            SET unit_price = v_new_price,
                updated_at = NOW()
            WHERE product_id = v_product_id;

            -- Update history record
            UPDATE product_price_history
            SET supervisor_approval_status = 'APPROVED',
                supervisor_id = p_supervisor_id,
                supervisor_comment = p_comment,
                approved_at = NOW()
            WHERE history_id = p_history_id;

            -- Audit log
            INSERT INTO audit_log (
                table_name, record_id, action, old_value, new_value, changed_by, changed_at
            )
            VALUES (
                'products',
                CAST(v_product_id AS CHAR),
                'UPDATE',
                JSON_OBJECT('unit_price', v_old_price),
                JSON_OBJECT('unit_price', v_new_price, 'supervisor_approved', 1),
                CONCAT('supervisor_', p_supervisor_id),
                NOW()
            );

            COMMIT;
            SET p_status_code = 'APPROVED';
            SET p_message = 'Price revision approved by Supervisor and applied to product';
        ELSE
            -- Rejected
            UPDATE product_price_history
            SET supervisor_approval_status = 'REJECTED',
                supervisor_id = p_supervisor_id,
                supervisor_comment = p_comment,
                approved_at = NOW()
            WHERE history_id = p_history_id;

            COMMIT;
            SET p_status_code = 'REJECTED';
            SET p_message = 'Price revision rejected by Supervisor. Original price retained.';
        END IF;
    END IF;
END //

-- ------------------------------------------------------------
-- PROCEDURE 3: Refresh Slow Movers Analytics & Strategy Actions
-- ------------------------------------------------------------
CREATE PROCEDURE sp_refresh_slow_movers(
    IN p_days_threshold INT
)
BEGIN
    DECLARE v_days INT DEFAULT COALESCE(p_days_threshold, 30);

    -- Insert or Update slow_movers table based on actual branch inventory and sales
    INSERT INTO slow_movers (
        product_id, branch_id, quantity_on_hand, cost_price, selling_price,
        tied_up_capital, last_sale_date, days_without_sales, sales_velocity,
        recommended_action, recommended_discount_pct, status, last_analyzed
    )
    SELECT
        inv.product_id,
        inv.branch_id,
        inv.quantity_on_hand,
        p.cost_price,
        p.unit_price,
        ROUND(inv.quantity_on_hand * p.cost_price, 2) AS tied_up_capital,
        sales_data.last_sale_date,
        DATEDIFF(CURRENT_DATE, COALESCE(sales_data.last_sale_date, p.created_at)) AS days_without_sales,
        COALESCE(sales_data.velocity_30d, 0.00) AS sales_velocity,
        CASE
            WHEN DATEDIFF(CURRENT_DATE, COALESCE(sales_data.last_sale_date, p.created_at)) >= 90 THEN 'DISCONTINUE'
            WHEN DATEDIFF(CURRENT_DATE, COALESCE(sales_data.last_sale_date, p.created_at)) >= 60 THEN 'DISCOUNT_PRICE'
            WHEN DATEDIFF(CURRENT_DATE, COALESCE(sales_data.last_sale_date, p.created_at)) >= 30 THEN 'BUNDLE_PROMO'
            ELSE 'MONITOR'
        END AS recommended_action,
        CASE
            WHEN DATEDIFF(CURRENT_DATE, COALESCE(sales_data.last_sale_date, p.created_at)) >= 90 THEN 40.00
            WHEN DATEDIFF(CURRENT_DATE, COALESCE(sales_data.last_sale_date, p.created_at)) >= 60 THEN 25.00
            WHEN DATEDIFF(CURRENT_DATE, COALESCE(sales_data.last_sale_date, p.created_at)) >= 30 THEN 15.00
            ELSE 0.00
        END AS recommended_discount_pct,
        'ACTIVE' AS status,
        NOW() AS last_analyzed
    FROM inventory inv
    JOIN products p ON inv.product_id = p.product_id
    LEFT JOIN (
        SELECT
            s.branch_id,
            si.product_id,
            MAX(s.sale_date) AS last_sale_date,
            ROUND(SUM(CASE WHEN s.sale_date >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY) THEN si.quantity ELSE 0 END) / 30.0, 2) AS velocity_30d
        FROM sales s
        JOIN sale_items si ON s.sale_id = si.sale_id
        WHERE s.status = 'COMPLETED'
        GROUP BY s.branch_id, si.product_id
    ) sales_data ON inv.branch_id = sales_data.branch_id AND inv.product_id = sales_data.product_id
    WHERE inv.quantity_on_hand > 0
      AND p.is_active = 1
      AND DATEDIFF(CURRENT_DATE, COALESCE(sales_data.last_sale_date, p.created_at)) >= v_days
    ON DUPLICATE KEY UPDATE
        quantity_on_hand = VALUES(quantity_on_hand),
        cost_price = VALUES(cost_price),
        selling_price = VALUES(selling_price),
        tied_up_capital = VALUES(tied_up_capital),
        last_sale_date = VALUES(last_sale_date),
        days_without_sales = VALUES(days_without_sales),
        sales_velocity = VALUES(sales_velocity),
        recommended_action = VALUES(recommended_action),
        recommended_discount_pct = VALUES(recommended_discount_pct),
        last_analyzed = NOW();

    SELECT ROW_COUNT() AS records_updated;
END //

-- ------------------------------------------------------------
-- PROCEDURE 4: Create Product and Initialize Branch Inventory
-- ------------------------------------------------------------
CREATE PROCEDURE sp_create_product_with_inventory(
    IN p_barcode VARCHAR(20),
    IN p_name VARCHAR(150),
    IN p_category_id INT,
    IN p_supplier_id INT,
    IN p_brand VARCHAR(80),
    IN p_unit_price DECIMAL(10,2),
    IN p_cost_price DECIMAL(10,2),
    IN p_tax_rate DECIMAL(5,2),
    IN p_reorder_level INT,
    IN p_created_by INT,
    OUT p_product_id INT,
    OUT p_status_code VARCHAR(30),
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_exists INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_status_code = 'ERROR';
        SET p_message = 'Failed to create product due to database exception';
    END;

    START TRANSACTION;

    -- Validate barcode uniqueness
    SELECT COUNT(*) INTO v_exists FROM products WHERE barcode = p_barcode;
    IF v_exists > 0 THEN
        ROLLBACK;
        SET p_status_code = 'DUPLICATE_BARCODE';
        SET p_message = CONCAT('Barcode "', p_barcode, '" already exists in catalog');
    ELSE
        INSERT INTO products (
            barcode, name, category_id, supplier_id, brand,
            unit_price, cost_price, tax_rate, reorder_level, is_active,
            created_at, updated_at
        )
        VALUES (
            p_barcode, p_name, p_category_id, p_supplier_id, p_brand,
            p_unit_price, p_cost_price, COALESCE(p_tax_rate, 0.00),
            COALESCE(p_reorder_level, 10), 1, NOW(), NOW()
        );

        SET p_product_id = LAST_INSERT_ID();

        -- Initialize inventory records for all active store branches
        INSERT IGNORE INTO inventory (branch_id, product_id, quantity_on_hand, reserved_qty, reorder_level, last_updated)
        SELECT branch_id, p_product_id, 0, 0, COALESCE(p_reorder_level, 10), NOW()
        FROM branches
        WHERE is_active = 1;

        -- Audit log
        INSERT INTO audit_log (
            table_name, record_id, action, new_value, changed_by, changed_at
        )
        VALUES (
            'products',
            CAST(p_product_id AS CHAR),
            'INSERT',
            JSON_OBJECT('name', p_name, 'barcode', p_barcode, 'unit_price', p_unit_price),
            CONCAT('employee_', p_created_by),
            NOW()
        );

        COMMIT;
        SET p_status_code = 'SUCCESS';
        SET p_message = 'Product created and inventory provisioned across all active branches';
    END IF;
END //

-- ------------------------------------------------------------
-- PROCEDURE 5: Apply Markdown Discount to Slow Mover Item
-- ------------------------------------------------------------
CREATE PROCEDURE sp_apply_slow_mover_markdown(
    IN p_slow_mover_id INT,
    IN p_discount_pct DECIMAL(5,2),
    IN p_employee_id INT,
    IN p_notes VARCHAR(255),
    OUT p_status_code VARCHAR(30),
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_product_id INT;
    DECLARE v_old_price DECIMAL(10,2);
    DECLARE v_new_price DECIMAL(10,2);
    DECLARE v_not_found INT DEFAULT 0;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_not_found = 1;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_status_code = 'ERROR';
        SET p_message = 'Error executing markdown discount';
    END;

    START TRANSACTION;

    SELECT product_id, selling_price
    INTO v_product_id, v_old_price
    FROM slow_movers
    WHERE slow_mover_id = p_slow_mover_id
    FOR UPDATE;

    IF v_not_found = 1 THEN
        ROLLBACK;
        SET p_status_code = 'NOT_FOUND';
        SET p_message = 'Slow mover record not found';
    ELSE
        SET v_new_price = ROUND(v_old_price * (1 - (p_discount_pct / 100)), 2);

        -- Update product price
        UPDATE products
        SET unit_price = v_new_price,
            updated_at = NOW()
        WHERE product_id = v_product_id;

        -- Insert history
        INSERT INTO product_price_history (
            product_id, old_price, new_price, price_variance_pct,
            changed_by, changed_at, reason, supervisor_approval_status, approved_at
        )
        VALUES (
            v_product_id, v_old_price, v_new_price, -p_discount_pct,
            p_employee_id, NOW(), CONCAT('Slow mover clearance markdown (', p_discount_pct, '%) - ', COALESCE(p_notes, '')),
            'APPROVED', NOW()
        );

        -- Update slow mover status
        UPDATE slow_movers
        SET status = 'ACTION_TAKEN',
            action_taken_notes = CONCAT('Marked down by ', p_discount_pct, '% to Rs. ', v_new_price)
        WHERE slow_mover_id = p_slow_mover_id;

        COMMIT;
        SET p_status_code = 'SUCCESS';
        SET p_message = CONCAT('Markdown of ', p_discount_pct, '% applied. New price is Rs. ', v_new_price);
    END IF;
END //

-- ------------------------------------------------------------
-- PROCEDURE 6: Discontinue / Soft-Deactivate Product
-- ------------------------------------------------------------
CREATE PROCEDURE sp_discontinue_product(
    IN p_product_id INT,
    IN p_employee_id INT,
    IN p_reason VARCHAR(255),
    OUT p_status_code VARCHAR(30),
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_exists INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_status_code = 'ERROR';
        SET p_message = 'Failed to discontinue product';
    END;

    START TRANSACTION;

    SELECT COUNT(*) INTO v_exists FROM products WHERE product_id = p_product_id;

    IF v_exists = 0 THEN
        ROLLBACK;
        SET p_status_code = 'NOT_FOUND';
        SET p_message = 'Product not found';
    ELSE
        UPDATE products
        SET is_active = 0,
            updated_at = NOW()
        WHERE product_id = p_product_id;

        UPDATE slow_movers
        SET status = 'DISCONTINUED',
            action_taken_notes = CONCAT('Discontinued by employee ', p_employee_id, ': ', COALESCE(p_reason, ''))
        WHERE product_id = p_product_id;

        INSERT INTO audit_log (
            table_name, record_id, action, old_value, new_value, changed_by, changed_at
        )
        VALUES (
            'products',
            CAST(p_product_id AS CHAR),
            'UPDATE',
            JSON_OBJECT('is_active', 1),
            JSON_OBJECT('is_active', 0, 'discontinue_reason', p_reason),
            CONCAT('employee_', p_employee_id),
            NOW()
        );

        COMMIT;
        SET p_status_code = 'SUCCESS';
        SET p_message = 'Product has been deactivated and flagged as discontinued';
    END IF;
END //

DELIMITER ;


-- ============================================================
-- 6. TRIGGERS
-- ============================================================

DELIMITER //

-- ------------------------------------------------------------
-- TRIGGER 1: Validation Before Inserting a Product
-- ------------------------------------------------------------
CREATE TRIGGER trg_before_product_insert
BEFORE INSERT ON products
FOR EACH ROW
BEGIN
    -- Barcode cannot be empty
    IF NEW.barcode IS NULL OR TRIM(NEW.barcode) = '' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Product barcode cannot be empty';
    END IF;

    -- Selling price must be strictly positive
    IF NEW.unit_price <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Product unit price must be positive';
    END IF;

    -- Cost price cannot be negative
    IF NEW.cost_price < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Product cost price cannot be negative';
    END IF;

    -- Tax rate sanity check (0% to 100%)
    IF NEW.tax_rate < 0 OR NEW.tax_rate > 100 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Tax rate must be between 0 and 100';
    END IF;
END //

-- ------------------------------------------------------------
-- TRIGGER 2: Validation Before Updating a Product
-- ------------------------------------------------------------
CREATE TRIGGER trg_before_product_update
BEFORE UPDATE ON products
FOR EACH ROW
BEGIN
    -- Ensure prices remain non-negative
    IF NEW.unit_price <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Product unit price must be positive';
    END IF;

    IF NEW.cost_price < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Product cost price cannot be negative';
    END IF;

    -- Maintain updated_at timestamp
    SET NEW.updated_at = NOW();
END //

-- ------------------------------------------------------------
-- TRIGGER 3: Audit Log After Recording Price History
-- ------------------------------------------------------------
CREATE TRIGGER trg_after_product_price_history_insert
AFTER INSERT ON product_price_history
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (
        table_name, record_id, action, old_value, new_value, changed_by, changed_at
    )
    VALUES (
        'product_price_history',
        CAST(NEW.history_id AS CHAR),
        'INSERT',
        NULL,
        JSON_OBJECT(
            'product_id', NEW.product_id,
            'old_price', NEW.old_price,
            'new_price', NEW.new_price,
            'variance_pct', NEW.price_variance_pct,
            'status', NEW.supervisor_approval_status
        ),
        CONCAT('employee_', NEW.changed_by),
        NOW()
    );
END //

DELIMITER ;


-- ============================================================
-- 7. EVENTS
-- ============================================================

SET GLOBAL event_scheduler = ON;

-- ------------------------------------------------------------
-- EVENT 1: Daily Refresh of Slow Movers Analysis (Midnight)
-- ------------------------------------------------------------
DELIMITER //
CREATE EVENT IF NOT EXISTS evt_daily_refresh_slow_movers
ON SCHEDULE EVERY 1 DAY
STARTS (CURRENT_DATE + INTERVAL 1 DAY)
DO
BEGIN
    CALL sp_refresh_slow_movers(30);
END //
DELIMITER ;


-- ============================================================
-- 8. VERIFICATION AND TEST QUERIES
-- ============================================================

-- Verification 1: Inspect Master Product Catalog View
SELECT product_id, barcode, product_name, category_name, supplier_name, unit_price, cost_price, profit_margin_pct, total_quantity_on_hand
FROM vw_product_catalog_details
LIMIT 5;

-- Verification 2: Category Hierarchy Summary
SELECT category_name, parent_category_name, total_products, category_stock_value, avg_profit_margin_pct
FROM vw_category_hierarchy_summary;

-- Verification 3: Supplier Catalog Matrix
SELECT supplier_name, total_products_supplied, avg_cost_price, avg_selling_price, avg_supply_margin_pct
FROM vw_supplier_catalog_matrix;

-- Verification 4: Test Functions
SELECT fn_calculate_profit_margin(280.00, 350.00) AS sample_profit_margin;
SELECT fn_price_percent_change(350.00, 315.00) AS sample_price_drop_pct;
SELECT fn_requires_supervisor_approval(350.00, 250.00, 280.00) AS requires_supervisor; -- Returns 1 (below cost & >15% drop)

-- Verification 5: Check Price Approval Queue View
SELECT * FROM vw_price_approval_queue;

-- Verification 6: Refresh and Inspect Slow Movers View
-- CALL sp_refresh_slow_movers(30);
-- SELECT * FROM vw_slow_movers_analysis LIMIT 5;
