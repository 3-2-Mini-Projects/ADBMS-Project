USE supermarket_oltp;

-- ============================================================
-- SUPERMARKET OLTP
-- VIEWS, FUNCTIONS, PROCEDURES, TRIGGERS AND EVENTS
-- ============================================================


-- ============================================================
-- 1. DROP EXISTING OBJECTS
-- ============================================================

-- DROP VIEW IF EXISTS sale_details_vw;
-- DROP VIEW IF EXISTS daily_sales_vw;
-- DROP VIEW IF EXISTS payment_summary_vw;
-- DROP VIEW IF EXISTS cashier_sales_vw;
-- DROP VIEW IF EXISTS return_report_vw;
-- DROP VIEW IF EXISTS branch_sales_vw;


-- DROP FUNCTION IF EXISTS CalculateLineTotal;
-- DROP FUNCTION IF EXISTS GetTotalPaid;
-- DROP FUNCTION IF EXISTS GetRemainingAmount;
-- DROP FUNCTION IF EXISTS GetSaleDiscount;


-- DROP PROCEDURE IF EXISTS CreateSale;
-- DROP PROCEDURE IF EXISTS AddSaleItem;
-- DROP PROCEDURE IF EXISTS UpdateSaleTotals;
-- DROP PROCEDURE IF EXISTS CompleteSale;
-- DROP PROCEDURE IF EXISTS ProcessReturn;


-- DROP TRIGGER IF EXISTS before_sale_item_insert;
-- DROP TRIGGER IF EXISTS before_sale_item_update;
-- DROP TRIGGER IF EXISTS after_sale_item_insert;
-- DROP TRIGGER IF EXISTS after_sale_item_update;
-- DROP TRIGGER IF EXISTS after_sale_item_delete;


-- DROP EVENT IF EXISTS GenerateDailySalesSummary;


-- ============================================================
-- 2. VIEWS
-- ============================================================

-- ------------------------------------------------------------
-- VIEW 1: SALE DETAILS
-- ------------------------------------------------------------

CREATE VIEW sale_details_vw AS
SELECT
    si.sale_item_id,
    si.sale_id,
    si.product_id,
    si.quantity,
    si.unit_price,
    si.discount_amount,
    si.line_total,

    s.branch_id,
    s.cashier_id,
    s.customer_id,
    s.sale_date,
    s.subtotal,
    s.discount_total,
    s.tax_total,
    s.total_amount,
    s.status

FROM sales s
JOIN sale_items si
    ON s.sale_id = si.sale_id;


-- ------------------------------------------------------------
-- VIEW 2: DAILY SALES REPORT
-- ------------------------------------------------------------

CREATE VIEW daily_sales_vw AS
SELECT
    branch_id,
    DATE(sale_date) AS sale_date,

    COUNT(*) AS transaction_count,

    SUM(subtotal) AS subtotal,

    SUM(discount_total) AS total_discount,

    SUM(tax_total) AS total_tax,

    SUM(total_amount) AS total_sales

FROM sales

WHERE status = 'COMPLETED'

GROUP BY
    branch_id,
    DATE(sale_date);


-- ------------------------------------------------------------
-- VIEW 3: PAYMENT SUMMARY
-- ------------------------------------------------------------

CREATE VIEW payment_summary_vw AS
SELECT
    method,
    COUNT(*) AS payment_count,
    SUM(amount) AS total_amount

FROM payments

GROUP BY method;


-- ------------------------------------------------------------
-- VIEW 4: CASHIER SALES
-- ------------------------------------------------------------

CREATE VIEW cashier_sales_vw AS
SELECT
    cashier_id,

    COUNT(*) AS transaction_count,

    SUM(subtotal) AS subtotal,

    SUM(discount_total) AS total_discount,

    SUM(tax_total) AS total_tax,

    SUM(total_amount) AS total_sales

FROM sales

WHERE status = 'COMPLETED'

GROUP BY cashier_id;


-- ------------------------------------------------------------
-- VIEW 5: RETURN REPORT
-- ------------------------------------------------------------

CREATE VIEW return_report_vw AS
SELECT
    r.return_id,
    r.sale_item_id,
    r.quantity,
    r.reason,
    r.refund_amount,
    r.processed_by,
    r.return_date,

    si.sale_id,
    si.product_id,
    si.unit_price

FROM returns r

JOIN sale_items si
    ON r.sale_item_id = si.sale_item_id;


-- ------------------------------------------------------------
-- VIEW 6: BRANCH SALES PERFORMANCE
-- ------------------------------------------------------------

CREATE VIEW branch_sales_vw AS
SELECT
    branch_id,

    COUNT(*) AS transactions,

    SUM(subtotal) AS subtotal,

    SUM(total_amount) AS total_sales,

    SUM(tax_total) AS total_tax,

    SUM(discount_total) AS total_discount

FROM sales

WHERE status = 'COMPLETED'

GROUP BY branch_id;



-- ============================================================
-- 3. FUNCTIONS
-- ============================================================

DELIMITER $$


-- ------------------------------------------------------------
-- FUNCTION 1: CALCULATE LINE TOTAL
-- ------------------------------------------------------------

CREATE FUNCTION CalculateLineTotal(
    p_quantity INT,
    p_unit_price DECIMAL(10,2),
    p_discount DECIMAL(10,2)
)
RETURNS DECIMAL(12,2)
DETERMINISTIC
BEGIN

    RETURN
        (p_quantity * p_unit_price)
        - COALESCE(p_discount, 0);

END$$


-- ------------------------------------------------------------
-- FUNCTION 2: GET TOTAL PAID
-- ------------------------------------------------------------

CREATE FUNCTION GetTotalPaid(
    p_sale_id INT
)
RETURNS DECIMAL(12,2)
READS SQL DATA
BEGIN

    DECLARE v_total_paid DECIMAL(12,2);

    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_paid

    FROM payments

    WHERE sale_id = p_sale_id;

    RETURN v_total_paid;

END$$


-- ------------------------------------------------------------
-- FUNCTION 3: GET REMAINING AMOUNT
-- ------------------------------------------------------------

CREATE FUNCTION GetRemainingAmount(
    p_sale_id INT
)
RETURNS DECIMAL(12,2)
READS SQL DATA
BEGIN

    DECLARE v_total DECIMAL(12,2);
    DECLARE v_paid DECIMAL(12,2);

    SELECT COALESCE(total_amount, 0)
    INTO v_total

    FROM sales

    WHERE sale_id = p_sale_id;


    SELECT COALESCE(SUM(amount), 0)
    INTO v_paid

    FROM payments

    WHERE sale_id = p_sale_id;


    RETURN v_total - v_paid;

END$$


-- ------------------------------------------------------------
-- FUNCTION 4: GET SALE DISCOUNT
-- ------------------------------------------------------------

CREATE FUNCTION GetSaleDiscount(
    p_sale_id INT
)
RETURNS DECIMAL(12,2)
READS SQL DATA
BEGIN

    DECLARE v_discount DECIMAL(12,2);

    SELECT COALESCE(SUM(discount_amount), 0)
    INTO v_discount

    FROM sale_items

    WHERE sale_id = p_sale_id;

    RETURN v_discount;

END$$



-- ============================================================
-- 4. PROCEDURES
-- ============================================================


-- ------------------------------------------------------------
-- PROCEDURE 1: CREATE SALE
-- ------------------------------------------------------------

CREATE PROCEDURE CreateSale(
    IN p_branch_id INT,
    IN p_cashier_id INT,
    IN p_customer_id INT
)
BEGIN

    INSERT INTO sales (
        branch_id,
        cashier_id,
        customer_id,
        status,
        subtotal,
        discount_total,
        tax_total,
        total_amount
    )

    VALUES (
        p_branch_id,
        p_cashier_id,
        p_customer_id,
        'OPEN',
        0.00,
        0.00,
        0.00,
        0.00
    );


    SELECT LAST_INSERT_ID() AS sale_id;

END$$


-- ------------------------------------------------------------
-- PROCEDURE 2: ADD SALE ITEM
-- ------------------------------------------------------------

CREATE PROCEDURE AddSaleItem(
    IN p_sale_id INT,
    IN p_product_id INT,
    IN p_quantity INT,
    IN p_unit_price DECIMAL(10,2),
    IN p_discount DECIMAL(10,2)
)
BEGIN

    INSERT INTO sale_items (
        sale_id,
        product_id,
        quantity,
        unit_price,
        discount_amount,
        line_total
    )

    VALUES (
        p_sale_id,
        p_product_id,
        p_quantity,
        p_unit_price,
        COALESCE(p_discount, 0),
        0.00
    );

END$$


-- ------------------------------------------------------------
-- PROCEDURE 3: UPDATE SALE TOTALS
-- ------------------------------------------------------------

CREATE PROCEDURE UpdateSaleTotals(
    IN p_sale_id INT
)
BEGIN

    DECLARE v_subtotal DECIMAL(12,2);
    DECLARE v_discount DECIMAL(12,2);
    DECLARE v_tax DECIMAL(12,2);
    DECLARE v_total DECIMAL(12,2);


    -- Calculate subtotal
    SELECT COALESCE(
        SUM(quantity * unit_price),
        0
    )

    INTO v_subtotal

    FROM sale_items

    WHERE sale_id = p_sale_id;


    -- Calculate discount
    SELECT COALESCE(
        SUM(discount_amount),
        0
    )

    INTO v_discount

    FROM sale_items

    WHERE sale_id = p_sale_id;


    -- Calculate 18% tax
    SET v_tax =
        (v_subtotal - v_discount) * 0.18;


    -- Calculate final total
    SET v_total =
        (v_subtotal - v_discount) + v_tax;


    -- Update sales table
    UPDATE sales

    SET
        subtotal = v_subtotal,
        discount_total = v_discount,
        tax_total = v_tax,
        total_amount = v_total

    WHERE sale_id = p_sale_id;

END$$


-- ------------------------------------------------------------
-- PROCEDURE 4: COMPLETE SALE
-- ------------------------------------------------------------

CREATE PROCEDURE CompleteSale(
    IN p_sale_id INT
)
BEGIN

    DECLARE v_total DECIMAL(12,2);
    DECLARE v_paid DECIMAL(12,2);


    -- Update subtotal, discount, tax and total
    CALL UpdateSaleTotals(p_sale_id);


    -- Get sale total
    SELECT total_amount
    INTO v_total

    FROM sales

    WHERE sale_id = p_sale_id;


    -- Get payment amount
    SELECT COALESCE(SUM(amount), 0)
    INTO v_paid

    FROM payments

    WHERE sale_id = p_sale_id;


    -- Check payment
    IF v_paid < v_total THEN

        SIGNAL SQLSTATE '45000'

        SET MESSAGE_TEXT =
        'Payment amount is less than sale total';

    ELSE

        UPDATE sales

        SET status = 'COMPLETED'

        WHERE sale_id = p_sale_id;

    END IF;

END$$


-- ------------------------------------------------------------
-- PROCEDURE 5: PROCESS RETURN
-- ------------------------------------------------------------

CREATE PROCEDURE ProcessReturn(
    IN p_sale_item_id INT,
    IN p_quantity INT,
    IN p_reason VARCHAR(200),
    IN p_processed_by INT
)
BEGIN

    DECLARE v_unit_price DECIMAL(10,2);
    DECLARE v_refund DECIMAL(10,2);


    -- Get original unit price
    SELECT unit_price

    INTO v_unit_price

    FROM sale_items

    WHERE sale_item_id = p_sale_item_id;


    -- Calculate refund
    SET v_refund =
        v_unit_price * p_quantity;


    -- Insert return
    INSERT INTO returns (
        sale_item_id,
        quantity,
        reason,
        refund_amount,
        processed_by
    )

    VALUES (
        p_sale_item_id,
        p_quantity,
        p_reason,
        v_refund,
        p_processed_by
    );

END$$



-- ============================================================
-- 5. TRIGGERS
-- ============================================================


-- ------------------------------------------------------------
-- TRIGGER 1: CALCULATE LINE TOTAL BEFORE INSERT
-- ------------------------------------------------------------

CREATE TRIGGER before_sale_item_insert

BEFORE INSERT ON sale_items

FOR EACH ROW

BEGIN

    IF NEW.quantity <= 0 THEN

        SIGNAL SQLSTATE '45000'

        SET MESSAGE_TEXT =
        'Quantity must be greater than zero';

    END IF;


    IF NEW.unit_price < 0 THEN

        SIGNAL SQLSTATE '45000'

        SET MESSAGE_TEXT =
        'Unit price cannot be negative';

    END IF;


    IF NEW.discount_amount < 0 THEN

        SIGNAL SQLSTATE '45000'

        SET MESSAGE_TEXT =
        'Discount cannot be negative';

    END IF;


    SET NEW.line_total =
        (NEW.quantity * NEW.unit_price)
        - NEW.discount_amount;

END$$


-- ------------------------------------------------------------
-- TRIGGER 2: CALCULATE LINE TOTAL BEFORE UPDATE
-- ------------------------------------------------------------

CREATE TRIGGER before_sale_item_update

BEFORE UPDATE ON sale_items

FOR EACH ROW

BEGIN

    IF NEW.quantity <= 0 THEN

        SIGNAL SQLSTATE '45000'

        SET MESSAGE_TEXT =
        'Quantity must be greater than zero';

    END IF;


    SET NEW.line_total =
        (NEW.quantity * NEW.unit_price)
        - NEW.discount_amount;

END$$


-- ------------------------------------------------------------
-- TRIGGER 3: UPDATE SALE TOTAL AFTER INSERT
-- ------------------------------------------------------------

CREATE TRIGGER after_sale_item_insert

AFTER INSERT ON sale_items

FOR EACH ROW

BEGIN

    UPDATE sales

    SET
        subtotal = (
            SELECT COALESCE(
                SUM(quantity * unit_price),
                0
            )
            FROM sale_items
            WHERE sale_id = NEW.sale_id
        ),

        discount_total = (
            SELECT COALESCE(
                SUM(discount_amount),
                0
            )
            FROM sale_items
            WHERE sale_id = NEW.sale_id
        )

    WHERE sale_id = NEW.sale_id;

END$$


-- ------------------------------------------------------------
-- TRIGGER 4: UPDATE SALE TOTAL AFTER UPDATE
-- ------------------------------------------------------------

CREATE TRIGGER after_sale_item_update

AFTER UPDATE ON sale_items

FOR EACH ROW

BEGIN

    UPDATE sales

    SET
        subtotal = (
            SELECT COALESCE(
                SUM(quantity * unit_price),
                0
            )
            FROM sale_items
            WHERE sale_id = NEW.sale_id
        ),

        discount_total = (
            SELECT COALESCE(
                SUM(discount_amount),
                0
            )
            FROM sale_items
            WHERE sale_id = NEW.sale_id
        )

    WHERE sale_id = NEW.sale_id;

END$$


-- ------------------------------------------------------------
-- TRIGGER 5: UPDATE SALE TOTAL AFTER DELETE
-- ------------------------------------------------------------

CREATE TRIGGER after_sale_item_delete

AFTER DELETE ON sale_items

FOR EACH ROW

BEGIN

    UPDATE sales

    SET
        subtotal = (
            SELECT COALESCE(
                SUM(quantity * unit_price),
                0
            )
            FROM sale_items
            WHERE sale_id = OLD.sale_id
        ),

        discount_total = (
            SELECT COALESCE(
                SUM(discount_amount),
                0
            )
            FROM sale_items
            WHERE sale_id = OLD.sale_id
        )

    WHERE sale_id = OLD.sale_id;

END$$



-- ============================================================
-- 6. EVENT
-- ============================================================

CREATE EVENT GenerateDailySalesSummary

ON SCHEDULE EVERY 1 DAY

STARTS (CURRENT_DATE + INTERVAL 1 DAY + INTERVAL 5 MINUTE)

DO
BEGIN

    -- Remove existing summary for yesterday
    DELETE FROM daily_sales_summary

    WHERE summary_date =
        CURRENT_DATE - INTERVAL 1 DAY;


    -- Insert yesterday's summary
    INSERT INTO daily_sales_summary (
        branch_id,
        summary_date,
        transactions_count,
        total_sales,
        total_tax
    )

    SELECT
        branch_id,

        DATE(sale_date),

        COUNT(*),

        COALESCE(SUM(total_amount), 0),

        COALESCE(SUM(tax_total), 0)

    FROM sales

    WHERE status = 'COMPLETED'

      AND DATE(sale_date) =
          CURRENT_DATE - INTERVAL 1 DAY

    GROUP BY branch_id;

END$$


DELIMITER ;



-- ============================================================
-- 7. TEST THE VIEWS
-- ============================================================

SELECT * FROM sale_details_vw;

SELECT * FROM daily_sales_vw;

SELECT * FROM payment_summary_vw;

SELECT * FROM cashier_sales_vw;

SELECT * FROM return_report_vw;

SELECT * FROM branch_sales_vw;


-- ============================================================
-- 8. TEST FUNCTIONS
-- ============================================================

-- Example:
-- SELECT CalculateLineTotal(2, 500.00, 50.00);

-- SELECT GetTotalPaid(1);

-- SELECT GetRemainingAmount(1);

-- SELECT GetSaleDiscount(1);


-- ============================================================
-- 9. TEST PROCEDURES
-- ============================================================

-- Create a new sale
-- CALL CreateSale(1, 1, NULL);

-- Add product
-- CALL AddSaleItem(1, 101, 2, 500.00, 50.00);

-- Update totals
-- CALL UpdateSaleTotals(1);

-- Complete sale
-- CALL CompleteSale(1);

-- Process return
-- CALL ProcessReturn(1, 1, 'Damaged product', 1);


-- ============================================================
-- 10. CHECK SALE TOTALS
-- ============================================================

-- SELECT
--     sale_id,
--     subtotal,
--     discount_total,
--     tax_total,
--     total_amount,
--     status
-- FROM sales;

-- TABLES ONLY
-- SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'; 

-- VIEWS ONLY
-- SHOW FULL TABLES WHERE Table_type = 'VIEW'; 

-- PROCEDURES ONLY
-- SHOW PROCEDURE STATUS WHERE Db = 'supermarket_oltp';

-- FUNCTIONS ONLY
-- SHOW FUNCTION STATUS WHERE Db = 'supermarket_oltp';

-- TRIGGERS ONLY
-- SHOW TRIGGERS FROM supermarket_oltp;

-- TRIGGERS NAME ONLY
-- SELECT TRIGGER_NAME
-- FROM INFORMATION_SCHEMA.TRIGGERS
-- WHERE TRIGGER_SCHEMA = 'supermarket_oltp';

-- EVENT ONLY
-- SHOW EVENTS FROM supermarket_oltp;

-- EVENT NAME ONLY
-- SELECT EVENT_NAME
-- FROM INFORMATION_SCHEMA.EVENTS
-- WHERE EVENT_SCHEMA = 'supermarket_oltp';