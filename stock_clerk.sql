USE supermarket_ADBMS;

-- ============================================================
-- STOCK CLERK PART: INVENTORY & PURCHASING
-- VIEWS, FUNCTIONS, PROCEDURES, TRIGGERS AND EVENTS
-- ============================================================

-- ============================================================
-- 1. VIEWS
-- ============================================================

-- ------------------------------------------------------------
-- VIEW 1: Branch Inventory & Stock Status
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW vw_branch_inventory AS
SELECT
    b.branch_id,
    b.name AS branch_name,
    p.product_id,
    p.barcode,
    p.name AS product_name,
    c.name AS category_name,
    s.name AS supplier_name,
    i.quantity_on_hand,
    i.reorder_level,
    p.unit_price,
    p.cost_price,
    CASE
        WHEN i.quantity_on_hand = 0 THEN 'OUT_OF_STOCK'
        WHEN i.quantity_on_hand <= i.reorder_level THEN 'LOW_STOCK'
        ELSE 'NORMAL'
    END AS stock_status
FROM inventory i
JOIN branches b ON b.branch_id = i.branch_id
JOIN products p ON p.product_id = i.product_id
JOIN categories c ON c.category_id = p.category_id
JOIN suppliers s ON s.supplier_id = p.supplier_id;

-- ------------------------------------------------------------
-- VIEW 2: Batch Expiry Status (Expired or Expiring within 30 days)
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW vw_batch_expiry_status AS
SELECT
    pb.batch_id,
    pb.batch_no,
    b.branch_id,
    b.name AS branch_name,
    p.product_id,
    p.name AS product_name,
    pb.quantity,
    pb.received_date,
    pb.expiry_date,
    DATEDIFF(pb.expiry_date, CURRENT_DATE) AS days_to_expiry,
    CASE
        WHEN pb.expiry_date <= CURRENT_DATE THEN 'EXPIRED'
        WHEN pb.expiry_date <= CURRENT_DATE + INTERVAL 30 DAY THEN 'EXPIRING_SOON'
        ELSE 'NORMAL'
    END AS expiry_status
FROM product_batches pb
JOIN products p ON p.product_id = pb.product_id
JOIN branches b ON b.branch_id = pb.branch_id
WHERE pb.expiry_date IS NOT NULL 
  AND pb.quantity > 0;

-- ------------------------------------------------------------
-- VIEW 3: Purchase Order Details
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW vw_purchase_order_details AS
SELECT
    po.po_id,
    po.order_date,
    po.expected_date,
    po.received_date,
    po.status AS order_status,
    s.supplier_id,
    s.name AS supplier_name,
    b.branch_id,
    b.name AS branch_name,
    e.employee_id,
    e.full_name AS created_by,
    poi.po_item_id,
    p.product_id,
    p.name AS product_name,
    poi.quantity AS ordered_qty,
    poi.received_quantity,
    poi.damaged_quantity,
    poi.shortage_quantity,
    poi.discrepancy_reason,
    poi.discrepancy_notes,
    poi.unit_cost,
    (poi.quantity * poi.unit_cost) AS line_cost,
    po.total_cost AS order_total
FROM purchase_orders po
JOIN purchase_order_items poi ON poi.po_id = po.po_id
JOIN suppliers s ON s.supplier_id = po.supplier_id
JOIN branches b ON b.branch_id = po.branch_id
JOIN employees e ON e.employee_id = po.created_by
JOIN products p ON p.product_id = poi.product_id;

-- ------------------------------------------------------------
-- VIEW 4: Purchase Order Summary
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW vw_purchase_order_summary AS
SELECT
    po.po_id,
    po.order_date,
    po.expected_date,
    po.received_date,
    po.status AS order_status,
    s.name AS supplier_name,
    b.name AS branch_name,
    e.full_name AS created_by,
    COUNT(poi.po_item_id) AS total_items,
    COALESCE(SUM(poi.quantity), 0) AS total_ordered_qty,
    COALESCE(SUM(poi.quantity * poi.unit_cost), 0) AS calculated_total_cost,
    po.total_cost AS stored_total_cost
FROM purchase_orders po
JOIN suppliers s ON s.supplier_id = po.supplier_id
JOIN branches b ON b.branch_id = po.branch_id
JOIN employees e ON e.employee_id = po.created_by
LEFT JOIN purchase_order_items poi ON poi.po_id = po.po_id
GROUP BY
    po.po_id, po.order_date, po.expected_date, po.received_date, po.status, s.name, b.name, e.full_name, po.total_cost;

-- ------------------------------------------------------------
-- VIEW 5: Stock Alert Dashboard
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW vw_stock_alert_dashboard AS
SELECT
    sa.alert_id,
    sa.alert_type,
    sa.message,
    sa.is_resolved,
    sa.created_at,
    b.branch_id,
    b.name AS branch_name,
    p.product_id,
    p.barcode,
    p.name AS product_name,
    i.quantity_on_hand,
    i.reorder_level
FROM stock_alerts sa
JOIN branches b ON b.branch_id = sa.branch_id
JOIN products p ON p.product_id = sa.product_id
LEFT JOIN inventory i ON i.branch_id = sa.branch_id AND i.product_id = sa.product_id;


-- ============================================================
-- 2. FUNCTIONS
-- ============================================================

DELIMITER $$

-- FUNCTION 1: Available Quantity
CREATE FUNCTION fn_available_qty(p_branch_id INT, p_product_id INT)
RETURNS INT
READS SQL DATA
BEGIN
    DECLARE v_qty INT DEFAULT 0;

    SELECT COALESCE(MAX(quantity_on_hand), 0)
    INTO v_qty
    FROM inventory
    WHERE branch_id = p_branch_id
      AND product_id = p_product_id;

    RETURN v_qty;
END $$

-- FUNCTION 2: Stock Health Status
CREATE FUNCTION fn_stock_status(p_branch_id INT, p_product_id INT)
RETURNS VARCHAR(20)
READS SQL DATA
BEGIN
    DECLARE v_qty INT DEFAULT 0;
    DECLARE v_reorder INT DEFAULT 10;

    SELECT COALESCE(MAX(quantity_on_hand), 0),
           COALESCE(MAX(reorder_level), 10)
    INTO v_qty, v_reorder
    FROM inventory
    WHERE branch_id = p_branch_id
      AND product_id = p_product_id;

    IF v_qty = 0 THEN
        RETURN 'OUT_OF_STOCK';
    ELSEIF v_qty <= v_reorder THEN
        RETURN 'LOW_STOCK';
    ELSE
        RETURN 'NORMAL';
    END IF;
END $$

-- FUNCTION 3: Product Sales Velocity (Average daily sales over last 30 days)
CREATE FUNCTION fn_product_sales_velocity(
    p_branch_id INT,
    p_product_id INT
)
RETURNS DECIMAL(10,2)
READS SQL DATA
BEGIN
    DECLARE v_daily_sales DECIMAL(10,2) DEFAULT 0;

    SELECT COALESCE(SUM(si.quantity), 0) / 30.0
    INTO v_daily_sales
    FROM sales s
    JOIN sale_items si ON si.sale_id = s.sale_id
    WHERE s.branch_id = p_branch_id
      AND si.product_id = p_product_id
      AND s.sale_date >= CURRENT_DATE - INTERVAL 30 DAY
      AND s.sale_date < CURRENT_DATE + INTERVAL 1 DAY;

    RETURN v_daily_sales;
END $$

-- FUNCTION 4: Suggested Reorder Quantity
CREATE FUNCTION fn_suggested_reorder_qty(
    p_branch_id INT,
    p_product_id INT,
    p_lead_days INT,
    p_safety_days INT
)
RETURNS INT
READS SQL DATA
BEGIN
    DECLARE v_stock INT DEFAULT 0;
    DECLARE v_daily_sales DECIMAL(10,2) DEFAULT 0;
    DECLARE v_target_stock INT DEFAULT 0;

    IF p_lead_days < 0 OR p_safety_days < 0 THEN
        RETURN 0;
    END IF;

    SET v_stock = fn_available_qty(p_branch_id, p_product_id);
    SET v_daily_sales = fn_product_sales_velocity(p_branch_id, p_product_id);

    IF v_daily_sales <= 0 THEN
        RETURN 0;
    END IF;

    SET v_target_stock = CEIL(v_daily_sales * (p_lead_days + p_safety_days));

    IF v_stock < v_target_stock THEN
        RETURN v_target_stock - v_stock;
    ELSE
        RETURN 0;
    END IF;
END $$

-- FUNCTION 5: Days to Expiry
CREATE FUNCTION fn_days_to_expiry(
    p_expiry_date DATE
)
RETURNS INT
DETERMINISTIC
NO SQL
BEGIN
    IF p_expiry_date IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN DATEDIFF(p_expiry_date, CURRENT_DATE);
END $$

-- FUNCTION 6: Estimated Branch Replenishment Cost (Total budget required to restock)
CREATE FUNCTION fn_branch_replenishment_cost(
    p_branch_id INT
)
RETURNS DECIMAL(12,2)
READS SQL DATA
BEGIN
    DECLARE v_total_cost DECIMAL(12,2) DEFAULT 0.00;

    SELECT COALESCE(SUM(
        fn_suggested_reorder_qty(i.branch_id, i.product_id, 4, 1) * p.cost_price
    ), 0.00)
    INTO v_total_cost
    FROM inventory i
    JOIN products p ON p.product_id = i.product_id
    WHERE (p_branch_id IS NULL OR i.branch_id = p_branch_id);

    RETURN v_total_cost;
END $$

DELIMITER ;


-- ============================================================
-- 3. STORED PROCEDURES
-- ============================================================

DELIMITER $$

-- PROCEDURE 1: Check Low Stock Items for a Branch
CREATE PROCEDURE sp_check_low_stock(IN p_branch_id INT)
BEGIN
    SELECT i.branch_id, p.product_id, p.name AS product_name, i.quantity_on_hand, i.reorder_level
    FROM inventory i
    JOIN products p ON p.product_id = i.product_id
    WHERE i.branch_id = p_branch_id
      AND i.quantity_on_hand <= i.reorder_level
    ORDER BY i.quantity_on_hand ASC;
END $$

-- PROCEDURE 2: Check Batches Expiring within 30 Days
CREATE PROCEDURE sp_expiring_batches(IN p_branch_id INT)
BEGIN
    SELECT batch_id, product_id, batch_no, quantity, expiry_date, DATEDIFF(expiry_date, CURRENT_DATE) AS days_to_expiry
    FROM product_batches
    WHERE branch_id = p_branch_id
      AND expiry_date <= CURRENT_DATE + INTERVAL 30 DAY
    ORDER BY expiry_date ASC;
END $$

-- PROCEDURE 3: Increment Inventory on Stock Arrival
CREATE PROCEDURE sp_update_inventory(
    IN p_branch_id INT,
    IN p_product_id INT,
    IN p_received_qty INT
)
BEGIN
    IF p_received_qty <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Received quantity must be greater than zero';
    ELSE
        UPDATE inventory
        SET quantity_on_hand = quantity_on_hand + p_received_qty,
            last_updated = NOW()
        WHERE branch_id = p_branch_id
          AND product_id = p_product_id;

        IF ROW_COUNT() = 0 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Inventory record not found';
        END IF;
    END IF;
END $$

-- PROCEDURE 4: Create Purchase Order (Draft)
CREATE PROCEDURE sp_create_purchase_order(
    IN p_supplier_id INT,
    IN p_branch_id INT,
    IN p_created_by INT,
    IN p_expected_date DATE
)
BEGIN
    DECLARE v_po_number VARCHAR(50);
    SET v_po_number = CONCAT('PO-', UNIX_TIMESTAMP());

    IF p_expected_date < CURRENT_DATE THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Expected date cannot be in the past';
    ELSE
        INSERT INTO purchase_orders (po_number, supplier_id, branch_id, created_by, order_date, expected_date, status, total_cost)
        VALUES (v_po_number, p_supplier_id, p_branch_id, p_created_by, CURRENT_DATE, p_expected_date, 'DRAFT', 0.00);
    END IF;
END $$

-- PROCEDURE 5: Receive Purchase Order Transaction
CREATE PROCEDURE sp_receive_purchase_order(IN p_po_id INT)
BEGIN
    DECLARE v_status VARCHAR(20);
    DECLARE v_branch_id INT;
    DECLARE v_item_count INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT status, branch_id
    INTO v_status, v_branch_id
    FROM purchase_orders
    WHERE po_id = p_po_id
    FOR UPDATE;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Purchase order not found';
    END IF;

    IF v_status NOT IN ('SENT', 'PENDING') THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Only SENT or PENDING orders can be received';
    END IF;

    SELECT COUNT(*)
    INTO v_item_count
    FROM purchase_order_items
    WHERE po_id = p_po_id;

    IF v_item_count = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Purchase order has no items';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM purchase_order_items poi
        LEFT JOIN inventory i
          ON i.product_id = poi.product_id
         AND i.branch_id = v_branch_id
        WHERE poi.po_id = p_po_id
          AND i.inventory_id IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Inventory record missing for one or more purchase-order items';
    END IF;

    -- Update inventory stock
    UPDATE inventory i
    JOIN purchase_order_items poi ON poi.product_id = i.product_id
    SET i.quantity_on_hand = i.quantity_on_hand + poi.quantity,
        i.last_updated = NOW()
    WHERE poi.po_id = p_po_id
      AND i.branch_id = v_branch_id;

    -- Update purchase order header
    UPDATE purchase_orders
    SET status = 'RECEIVED',
        received_date = CURRENT_DATE
    WHERE po_id = p_po_id;

    COMMIT;
END $$

-- PROCEDURE 6: Inter-Branch Stock Transfer Transaction
CREATE PROCEDURE sp_transfer_stock(
    IN p_from_branch_id INT,
    IN p_to_branch_id INT,
    IN p_product_id INT,
    IN p_quantity INT,
    IN p_initiated_by INT
)
BEGIN
    DECLARE v_from_stock INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_from_branch_id = p_to_branch_id THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Source and destination branches cannot be the same';
    END IF;

    IF p_quantity <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Transfer quantity must be greater than zero';
    END IF;

    START TRANSACTION;

    -- Lock and check source stock
    SELECT quantity_on_hand
    INTO v_from_stock
    FROM inventory
    WHERE branch_id = p_from_branch_id
      AND product_id = p_product_id
    FOR UPDATE;

    IF v_from_stock IS NULL OR v_from_stock < p_quantity THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Insufficient stock at source branch for transfer';
    END IF;

    -- Deduct from source branch
    UPDATE inventory
    SET quantity_on_hand = quantity_on_hand - p_quantity,
        last_updated = NOW()
    WHERE branch_id = p_from_branch_id
      AND product_id = p_product_id;

    -- Upsert to destination branch
    INSERT INTO inventory (branch_id, product_id, quantity_on_hand, reserved_qty, reorder_level, last_updated)
    VALUES (p_to_branch_id, p_product_id, p_quantity, 0, 10, NOW())
    ON DUPLICATE KEY UPDATE
        quantity_on_hand = quantity_on_hand + p_quantity,
        last_updated = NOW();

    -- Audit log
    INSERT INTO audit_log (table_name, record_id, action, new_value, changed_by, changed_at)
    VALUES (
        'inventory',
        CONCAT('transfer_', p_product_id),
        'UPDATE',
        JSON_OBJECT(
            'event', 'INTER_BRANCH_TRANSFER',
            'from_branch_id', p_from_branch_id,
            'to_branch_id', p_to_branch_id,
            'product_id', p_product_id,
            'quantity', p_quantity
        ),
        CONCAT('employee_', p_initiated_by),
        NOW()
    );

    COMMIT;
END $$

-- PROCEDURE 7: Damaged / Expired Stock Disposal
CREATE PROCEDURE sp_record_stock_disposal(
    IN p_batch_id INT,
    IN p_quantity INT,
    IN p_reason VARCHAR(50),
    IN p_disposed_by INT
)
BEGIN
    DECLARE v_batch_qty INT DEFAULT 0;
    DECLARE v_product_id INT;
    DECLARE v_branch_id INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_quantity <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Disposal quantity must be greater than zero';
    END IF;

    START TRANSACTION;

    SELECT quantity, product_id, branch_id
    INTO v_batch_qty, v_product_id, v_branch_id
    FROM product_batches
    WHERE batch_id = p_batch_id
    FOR UPDATE;

    IF v_batch_qty IS NULL OR v_batch_qty < p_quantity THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Disposal quantity exceeds batch quantity available';
    END IF;

    -- Deduct from batch
    UPDATE product_batches
    SET quantity = quantity - p_quantity
    WHERE batch_id = p_batch_id;

    -- Deduct from branch inventory
    UPDATE inventory
    SET quantity_on_hand = GREATEST(0, quantity_on_hand - p_quantity),
        last_updated = NOW()
    WHERE branch_id = v_branch_id
      AND product_id = v_product_id;

    -- Audit log
    INSERT INTO audit_log (table_name, record_id, action, new_value, changed_by, changed_at)
    VALUES (
        'product_batches',
        CONCAT('disposal_batch_', p_batch_id),
        'UPDATE',
        JSON_OBJECT(
            'event', 'STOCK_DISPOSAL',
            'batch_id', p_batch_id,
            'product_id', v_product_id,
            'branch_id', v_branch_id,
            'quantity', p_quantity,
            'reason', p_reason
        ),
        CONCAT('employee_', p_disposed_by),
        NOW()
    );

    COMMIT;
END $$

DELIMITER ;


-- ============================================================
-- 4. TRIGGERS
-- ============================================================

DELIMITER $$

-- TRIGGER 1: Recalculate PO total after item insert
CREATE TRIGGER trg_purchase_item_after_insert
AFTER INSERT ON purchase_order_items
FOR EACH ROW
BEGIN
    UPDATE purchase_orders
    SET total_cost = (
        SELECT COALESCE(SUM(quantity * unit_cost), 0)
        FROM purchase_order_items
        WHERE po_id = NEW.po_id
    )
    WHERE po_id = NEW.po_id;
END $$

-- TRIGGER 2: Recalculate PO total after item update
CREATE TRIGGER trg_purchase_item_after_update
AFTER UPDATE ON purchase_order_items
FOR EACH ROW
BEGIN
    UPDATE purchase_orders
    SET total_cost = (
        SELECT COALESCE(SUM(quantity * unit_cost), 0)
        FROM purchase_order_items
        WHERE po_id = NEW.po_id
    )
    WHERE po_id = NEW.po_id;

    IF OLD.po_id <> NEW.po_id THEN
        UPDATE purchase_orders
        SET total_cost = (
            SELECT COALESCE(SUM(quantity * unit_cost), 0)
            FROM purchase_order_items
            WHERE po_id = OLD.po_id
        )
        WHERE po_id = OLD.po_id;
    END IF;
END $$

-- TRIGGER 3: Validate Batch Quantity and Expiry before insert
CREATE TRIGGER trg_product_batch_before_insert
BEFORE INSERT ON product_batches
FOR EACH ROW
BEGIN
    IF NEW.quantity <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Batch quantity must be greater than zero';
    END IF;

    IF NEW.expiry_date IS NOT NULL
       AND NEW.received_date IS NOT NULL
       AND NEW.expiry_date < NEW.received_date THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Expiry date cannot be before received date';
    END IF;  
END $$

-- TRIGGER 4: Real-time Low Stock Alert on Inventory Change
CREATE TRIGGER trg_inventory_after_update
AFTER UPDATE ON inventory
FOR EACH ROW
BEGIN
    IF NEW.quantity_on_hand <= NEW.reorder_level AND OLD.quantity_on_hand > NEW.reorder_level THEN
        INSERT INTO stock_alerts (branch_id, product_id, alert_type, message, is_resolved, created_at)
        VALUES (
            NEW.branch_id,
            NEW.product_id,
            'LOW_STOCK',
            CONCAT('Product ID ', NEW.product_id, ' dropped to low stock (', NEW.quantity_on_hand, ' remaining, threshold: ', NEW.reorder_level, ')'),
            0,
            NOW()
        );
    END IF;
END $$

DELIMITER ;


-- ============================================================
-- 5. SCHEDULED EVENT (STOCK CLERK EVENT)
-- ============================================================

DELIMITER $$

CREATE EVENT evt_daily_stock_alert_check
ON SCHEDULE EVERY 1 DAY
STARTS (CURRENT_DATE + INTERVAL 1 DAY + INTERVAL 1 MINUTE)
DO
BEGIN
    -- 1. Insert LOW_STOCK alerts automatically if not already unresolved
    INSERT INTO stock_alerts (branch_id, product_id, alert_type, message, is_resolved, created_at)
    SELECT 
        i.branch_id, 
        i.product_id, 
        'LOW_STOCK', 
        CONCAT('Product "', p.name, '" is low on stock (', i.quantity_on_hand, ' remaining, reorder level is ', i.reorder_level, ')'),
        0, 
        NOW()
    FROM inventory i
    JOIN products p ON p.product_id = i.product_id
    WHERE i.quantity_on_hand <= i.reorder_level
      AND NOT EXISTS (
          SELECT 1 FROM stock_alerts sa 
          WHERE sa.branch_id = i.branch_id 
            AND sa.product_id = i.product_id 
            AND sa.alert_type = 'LOW_STOCK' 
            AND sa.is_resolved = 0
      );

    -- 2. Insert EXPIRING_SOON alerts for batches expiring within 14 days
    INSERT INTO stock_alerts (branch_id, product_id, alert_type, message, is_resolved, created_at)
    SELECT 
        pb.branch_id, 
        pb.product_id, 
        'EXPIRY_WARNING',
        CONCAT('Batch "', pb.batch_no, '" of "', p.name, '" is expiring soon on ', pb.expiry_date),
        0, 
        NOW()
    FROM product_batches pb
    JOIN products p ON p.product_id = pb.product_id
    WHERE pb.quantity > 0
      AND pb.expiry_date <= CURRENT_DATE + INTERVAL 14 DAY
      AND NOT EXISTS (
          SELECT 1 FROM stock_alerts sa
          WHERE sa.branch_id = pb.branch_id
            AND sa.product_id = pb.product_id
            AND sa.alert_type = 'EXPIRY_WARNING'
            AND sa.is_resolved = 0
      );
END $$

DELIMITER ;
