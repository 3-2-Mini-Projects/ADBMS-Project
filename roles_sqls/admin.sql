USE supermarket_ADBMS;

-- ============================================================
-- 1. DROP EXISTING OBJECTS (CLEAN RE-RUNNABLE SCRIPT)
-- ============================================================

-- Drop Events
DROP EVENT IF EXISTS GenerateDailySalesSummary;
DROP EVENT IF EXISTS evt_nightly_mark_absent;
DROP EVENT IF EXISTS evt_monthly_archive_audit;

-- Drop Triggers
DROP TRIGGER IF EXISTS trg_employees_bi;
DROP TRIGGER IF EXISTS trg_employees_bu;
DROP TRIGGER IF EXISTS trg_shifts_bi;
DROP TRIGGER IF EXISTS trg_branches_bd;

-- Drop Stored Procedures
DROP PROCEDURE IF EXISTS proc_transfer_employee;
DROP PROCEDURE IF EXISTS proc_assign_shift;
DROP PROCEDURE IF EXISTS proc_clock_in_out;
DROP PROCEDURE IF EXISTS proc_log_error;

-- Drop Views
DROP VIEW IF EXISTS v_audit_trail;
DROP VIEW IF EXISTS v_attendance_report;
DROP VIEW IF EXISTS v_employee_directory;
DROP VIEW IF EXISTS return_report_vw;
DROP VIEW IF EXISTS payment_summary_vw;
DROP VIEW IF EXISTS cashier_sales_vw;
DROP VIEW IF EXISTS branch_sales_vw;
DROP VIEW IF EXISTS daily_sales_vw;

-- Drop Functions
DROP FUNCTION IF EXISTS fn_monthly_salary;
DROP FUNCTION IF EXISTS fn_years_of_service;
DROP FUNCTION IF EXISTS fn_is_on_shift;
DROP FUNCTION IF EXISTS fn_work_hours;


-- ============================================================
-- 2. SUPPORTING TABLES (PREREQUISITES)
-- ============================================================

-- Error logging repository used by procedure exception handlers
CREATE TABLE IF NOT EXISTS error_log (
    error_id INT AUTO_INCREMENT PRIMARY KEY,
    procedure_name VARCHAR(64) NOT NULL,
    error_code VARCHAR(20) NOT NULL,
    error_message VARCHAR(500) NOT NULL,
    employee_id INT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Materialized daily sales summary table refreshed by scheduled event
CREATE TABLE IF NOT EXISTS daily_sales_summary (
    summary_id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NOT NULL,
    summary_date DATE NOT NULL,
    transactions_count INT DEFAULT 0,
    total_sales DECIMAL(12,2) DEFAULT 0.00,
    total_tax DECIMAL(12,2) DEFAULT 0.00,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_branch_summary_date (branch_id, summary_date)
);

-- Archival table for long-term historical audit storage
CREATE TABLE IF NOT EXISTS audit_log_archive LIKE audit_log;


-- ============================================================
-- 3. USER-DEFINED FUNCTIONS (UDFs)
-- ============================================================

DELIMITER //

-- ------------------------------------------------------------
-- FUNCTION 1: fn_work_hours
-- Computes shift duration in fractional hours rounded to 2 decimal places.
-- ------------------------------------------------------------
CREATE FUNCTION fn_work_hours(
    p_clock_in DATETIME,
    p_clock_out DATETIME
) RETURNS DECIMAL(7,2)
DETERMINISTIC
NO SQL
BEGIN
    IF p_clock_in IS NULL 
       OR p_clock_out IS NULL 
       OR p_clock_out < p_clock_in THEN
        RETURN NULL;
    END IF;

    RETURN ROUND(TIMESTAMPDIFF(SECOND, p_clock_in, p_clock_out) / 3600, 2);
END //

-- ------------------------------------------------------------
-- FUNCTION 2: fn_is_on_shift
-- Determines if an employee is physically clocked in and present today.
-- ------------------------------------------------------------
CREATE FUNCTION fn_is_on_shift(
    p_employee_id INT
) RETURNS TINYINT(1)
READS SQL DATA
BEGIN
    DECLARE v_active_count INT DEFAULT 0;

    SELECT COUNT(*)
    INTO v_active_count
    FROM shifts
    WHERE employee_id = p_employee_id
      AND shift_date = CURDATE()
      AND status = 'PRESENT';

    RETURN IF(v_active_count > 0, 1, 0);
END //

-- ------------------------------------------------------------
-- FUNCTION 3: fn_years_of_service
-- Calculates completed years of service tenure from hire date.
-- ------------------------------------------------------------
CREATE FUNCTION fn_years_of_service(
    p_hire_date DATE
) RETURNS INT
DETERMINISTIC
NO SQL
BEGIN
    IF p_hire_date IS NULL OR p_hire_date > CURDATE() THEN
        RETURN NULL;
    END IF;

    RETURN TIMESTAMPDIFF(YEAR, p_hire_date, CURDATE());
END //

-- ------------------------------------------------------------
-- FUNCTION 4: fn_monthly_salary
-- Encapsulates employee base salary retrieval for compensation queries.
-- ------------------------------------------------------------
CREATE FUNCTION fn_monthly_salary(
    p_employee_id INT
) RETURNS DECIMAL(10,2)
READS SQL DATA
BEGIN
    DECLARE v_salary DECIMAL(10,2);

    SELECT monthly_salary
    INTO v_salary
    FROM employees
    WHERE employee_id = p_employee_id;

    RETURN COALESCE(v_salary, 0.00);
END //

DELIMITER ;


-- ============================================================
-- 4. DATABASE VIEWS
-- ============================================================

-- ------------------------------------------------------------
-- VIEW 1: daily_sales_vw
-- Financial reconciliation aggregated by branch and calendar date.
-- ------------------------------------------------------------
CREATE VIEW daily_sales_vw AS
SELECT 
    s.branch_id,
    DATE(s.sale_date) AS sale_date,
    COUNT(s.sale_id) AS transaction_count,
    COALESCE(SUM(s.subtotal), 0) AS subtotal,
    COALESCE(SUM(s.discount_total), 0) AS total_discount,
    COALESCE(SUM(s.tax_total), 0) AS total_tax,
    COALESCE(SUM(s.total_amount), 0) AS total_sales
FROM sales s
WHERE s.status = 'COMPLETED'
GROUP BY s.branch_id, DATE(s.sale_date);

-- ------------------------------------------------------------
-- VIEW 2: branch_sales_vw
-- Comparative outlet revenue, discounting, and tax collections.
-- ------------------------------------------------------------
CREATE VIEW branch_sales_vw AS
SELECT 
    s.branch_id,
    COUNT(s.sale_id) AS transactions,
    COALESCE(SUM(s.subtotal), 0) AS subtotal,
    COALESCE(SUM(s.total_amount), 0) AS total_sales,
    COALESCE(SUM(s.tax_total), 0) AS total_tax,
    COALESCE(SUM(s.discount_total), 0) AS total_discount
FROM sales s
WHERE s.status = 'COMPLETED'
GROUP BY s.branch_id;

-- ------------------------------------------------------------
-- VIEW 3: cashier_sales_vw
-- Workforce audit tracking checkout receipts processed and sales totals.
-- ------------------------------------------------------------
CREATE VIEW cashier_sales_vw AS
SELECT 
    s.cashier_id,
    COUNT(s.sale_id) AS transaction_count,
    COALESCE(SUM(s.subtotal), 0) AS subtotal,
    COALESCE(SUM(s.discount_total), 0) AS total_discount,
    COALESCE(SUM(s.tax_total), 0) AS total_tax,
    COALESCE(SUM(s.total_amount), 0) AS total_sales
FROM sales s
WHERE s.status = 'COMPLETED'
GROUP BY s.cashier_id;

-- ------------------------------------------------------------
-- VIEW 4: payment_summary_vw
-- Tender distribution analysis across CASH, CARD, MOBILE, and POINTS.
-- ------------------------------------------------------------
CREATE VIEW payment_summary_vw AS
SELECT 
    p.method,
    COUNT(p.payment_id) AS payment_count,
    COALESCE(SUM(p.amount), 0) AS total_amount
FROM payments p
GROUP BY p.method;

-- ------------------------------------------------------------
-- VIEW 5: return_report_vw
-- Refund audit view linking returns to original item sale lines.
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
JOIN sale_items si ON r.sale_item_id = si.sale_item_id;

-- ------------------------------------------------------------
-- VIEW 6: v_employee_directory
-- HR directory projection joining branches and masking credentials.
-- ------------------------------------------------------------
CREATE VIEW v_employee_directory AS
SELECT 
    e.employee_id,
    e.full_name,
    e.role,
    e.email,
    e.phone,
    b.branch_id,
    b.name AS branch_name,
    b.city AS branch_city,
    e.hire_date,
    e.monthly_salary,
    e.is_active,
    (e.password_hash IS NOT NULL) AS is_activated,
    e.created_at
FROM employees e
JOIN branches b ON e.branch_id = b.branch_id;

-- ------------------------------------------------------------
-- VIEW 7: v_attendance_report
-- Real-time attendance roster computing hours worked via fn_work_hours.
-- ------------------------------------------------------------
CREATE VIEW v_attendance_report AS
SELECT 
    s.shift_id,
    s.employee_id,
    e.full_name,
    s.branch_id,
    b.name AS branch_name,
    s.shift_date,
    s.start_time,
    s.end_time,
    s.clock_in,
    s.clock_out,
    s.status,
    fn_work_hours(s.clock_in, s.clock_out) AS hours_worked
FROM shifts s
JOIN employees e ON e.employee_id = s.employee_id
JOIN branches b ON b.branch_id = s.branch_id;

-- ------------------------------------------------------------
-- VIEW 8: v_audit_trail
-- Security telemetry view displaying DML log deltas chronologically.
-- ------------------------------------------------------------
CREATE VIEW v_audit_trail AS
SELECT 
    a.audit_id,
    a.table_name,
    a.record_id,
    a.action,
    a.old_value,
    a.new_value,
    a.changed_by,
    a.changed_at
FROM audit_log a
ORDER BY a.changed_at DESC;


-- ============================================================
-- 5. STORED PROCEDURES & ACID TRANSACTIONS
-- ============================================================

DELIMITER //

-- ------------------------------------------------------------
-- PROCEDURE 1: proc_log_error
-- Centralized telemetry routine for recording SQL exceptions.
-- ------------------------------------------------------------
CREATE PROCEDURE proc_log_error(
    IN p_procedure_name VARCHAR(64),
    IN p_error_code VARCHAR(20),
    IN p_error_message VARCHAR(500),
    IN p_employee_id INT
)
BEGIN
    INSERT INTO error_log (
        procedure_name,
        error_code,
        error_message,
        employee_id,
        created_at
    )
    VALUES (
        p_procedure_name,
        p_error_code,
        p_error_message,
        p_employee_id,
        NOW()
    );
END //

-- ------------------------------------------------------------
-- PROCEDURE 2: proc_transfer_employee
-- Features: ACID Transaction, Row-Level Concurrency Lock (FOR UPDATE),
-- Structured Exception Trapping (DECLARE EXIT HANDLER FOR SQLEXCEPTION),
-- ROLLBACK and COMMIT lifecycle management.
-- ------------------------------------------------------------
CREATE PROCEDURE proc_transfer_employee(
    IN p_employee_id INT,
    IN p_new_branch_id INT
)
BEGIN
    DECLARE v_employee_count INT DEFAULT 0;
    DECLARE v_branch_count INT DEFAULT 0;
    DECLARE v_old_branch_id INT DEFAULT NULL;

    -- Exit handler: rollback active transaction and record exception
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        GET DIAGNOSTICS CONDITION 1
            @err_state = RETURNED_SQLSTATE,
            @err_message = MESSAGE_TEXT;

        CALL proc_log_error(
            'proc_transfer_employee',
            @err_state,
            @err_message,
            p_employee_id
        );
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Verify employee exists and is active
    SELECT COUNT(*) INTO v_employee_count
    FROM employees
    WHERE employee_id = p_employee_id AND is_active = 1;

    IF v_employee_count = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Employee does not exist or is inactive';
    END IF;

    -- Verify destination branch exists and is active
    SELECT COUNT(*) INTO v_branch_count
    FROM branches
    WHERE branch_id = p_new_branch_id AND is_active = 1;

    IF v_branch_count = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Destination branch does not exist or is inactive';
    END IF;

    -- Acquire row-level lock on employee record to prevent race conditions
    SELECT branch_id INTO v_old_branch_id
    FROM employees
    WHERE employee_id = p_employee_id
    FOR UPDATE;

    IF v_old_branch_id = p_new_branch_id THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Employee already belongs to this branch';
    END IF;

    -- Reassign employee branch
    UPDATE employees
    SET branch_id = p_new_branch_id
    WHERE employee_id = p_employee_id;

    COMMIT;

    SELECT p_employee_id AS employee_id,
           v_old_branch_id AS previous_branch_id,
           p_new_branch_id AS new_branch_id,
           'Employee transferred successfully' AS message;
END //

-- ------------------------------------------------------------
-- PROCEDURE 3: proc_assign_shift
-- Validates shift time boundaries and creates a scheduled shift.
-- ------------------------------------------------------------
CREATE PROCEDURE proc_assign_shift(
    IN p_employee_id INT,
    IN p_branch_id INT,
    IN p_shift_date DATE,
    IN p_start_time TIME,
    IN p_end_time TIME
)
BEGIN
    DECLARE v_employee_count INT DEFAULT 0;
    DECLARE v_branch_count INT DEFAULT 0;

    IF p_employee_id IS NULL OR p_branch_id IS NULL OR p_shift_date IS NULL OR p_start_time IS NULL OR p_end_time IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Shift parameters cannot be NULL';
    END IF;

    IF p_start_time >= p_end_time THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'End time must be later than start time';
    END IF;

    SELECT COUNT(*) INTO v_employee_count FROM employees WHERE employee_id = p_employee_id AND is_active = 1;
    IF v_employee_count = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Employee does not exist or is inactive';
    END IF;

    SELECT COUNT(*) INTO v_branch_count FROM branches WHERE branch_id = p_branch_id AND is_active = 1;
    IF v_branch_count = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Branch does not exist or is inactive';
    END IF;

    INSERT INTO shifts (employee_id, branch_id, shift_date, start_time, end_time, status)
    VALUES (p_employee_id, p_branch_id, p_shift_date, p_start_time, p_end_time, 'SCHEDULED');

    SELECT LAST_INSERT_ID() AS new_shift_id, 'Shift assigned successfully' AS message;
END //

-- ------------------------------------------------------------
-- PROCEDURE 4: proc_clock_in_out
-- State transition engine enforcing clock-in and clock-out invariants.
-- ------------------------------------------------------------
CREATE PROCEDURE proc_clock_in_out(
    IN p_employee_id INT,
    IN p_shift_id INT,
    IN p_action VARCHAR(10)
)
BEGIN
    DECLARE v_found INT DEFAULT 0;
    DECLARE v_clock_in DATETIME DEFAULT NULL;
    DECLARE v_clock_out DATETIME DEFAULT NULL;
    DECLARE v_action VARCHAR(10);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            @err_state = RETURNED_SQLSTATE,
            @err_message = MESSAGE_TEXT;
        CALL proc_log_error('proc_clock_in_out', @err_state, @err_message, p_employee_id);
        RESIGNAL;
    END;

    SET v_action = UPPER(TRIM(p_action));

    IF p_employee_id IS NULL OR p_shift_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Employee ID and shift ID are required';
    END IF;

    IF v_action NOT IN ('IN', 'OUT') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Action must be IN or OUT';
    END IF;

    SELECT COUNT(*) INTO v_found FROM shifts WHERE shift_id = p_shift_id AND employee_id = p_employee_id;
    IF v_found = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Shift not found for this employee';
    END IF;

    SELECT clock_in, clock_out INTO v_clock_in, v_clock_out FROM shifts WHERE shift_id = p_shift_id AND employee_id = p_employee_id;

    IF v_action = 'IN' THEN
        IF v_clock_in IS NOT NULL THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Employee has already clocked in';
        END IF;

        UPDATE shifts SET clock_in = CURRENT_TIMESTAMP, status = 'PRESENT' WHERE shift_id = p_shift_id;
    ELSE
        IF v_clock_in IS NULL THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Employee must clock in first';
        END IF;

        IF v_clock_out IS NOT NULL THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Employee has already clocked out';
        END IF;

        UPDATE shifts SET clock_out = CURRENT_TIMESTAMP, status = 'COMPLETED' WHERE shift_id = p_shift_id;
    END IF;

    SELECT p_shift_id AS shift_id, v_action AS action_performed, 'Clock operation successful' AS message;
END //

DELIMITER ;


-- ============================================================
-- 6. DATABASE TRIGGERS
-- ============================================================

DELIMITER //

-- ------------------------------------------------------------
-- TRIGGER 1: trg_employees_bi (BEFORE INSERT ON employees)
-- Normalizes casing, enforces @shop.lk email domain and non-negative salary.
-- ------------------------------------------------------------
CREATE TRIGGER trg_employees_bi BEFORE INSERT ON employees FOR EACH ROW 
BEGIN
    DECLARE v_branch_count INT DEFAULT 0;

    SET NEW.full_name = TRIM(NEW.full_name);
    SET NEW.email = LOWER(TRIM(NEW.email));

    IF NEW.full_name IS NULL OR NEW.full_name = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Employee name is required';
    END IF;

    -- Enforce official company domain policy (@shop.lk)
    IF NEW.email NOT LIKE '%@shop.lk' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Invalid email: Staff must use an official @shop.lk company email address';
    END IF;

    -- Enforce minimum username prefix length
    IF INSTR(NEW.email, '@') < 4 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Email username must be at least 3 characters long';
    END IF;

    IF NEW.hire_date IS NULL OR NEW.hire_date > CURDATE() THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Hire date cannot be in the future';
    END IF;

    IF NEW.monthly_salary < 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Salary cannot be negative';
    END IF;

    SELECT COUNT(*) INTO v_branch_count FROM branches WHERE branch_id = NEW.branch_id AND is_active = 1;
    IF v_branch_count = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Employee must belong to an active branch';
    END IF;
END //

-- ------------------------------------------------------------
-- TRIGGER 2: trg_employees_bu (BEFORE UPDATE ON employees)
-- Validates updated email domain, non-negative salary, and active branch.
-- ------------------------------------------------------------
CREATE TRIGGER trg_employees_bu BEFORE UPDATE ON employees FOR EACH ROW 
BEGIN
    DECLARE v_branch_count INT DEFAULT 0;

    SET NEW.full_name = TRIM(NEW.full_name);
    SET NEW.email = LOWER(TRIM(NEW.email));

    IF NEW.full_name IS NULL OR NEW.full_name = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Employee name is required';
    END IF;

    -- Enforce company domain on email modification
    IF NEW.email != OLD.email AND NEW.email NOT LIKE '%@shop.lk' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Invalid email: Staff must use an official @shop.lk company email address';
    END IF;

    IF NEW.email != OLD.email AND INSTR(NEW.email, '@') < 4 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Email username must be at least 3 characters long';
    END IF;

    IF NEW.monthly_salary < 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Salary cannot be negative';
    END IF;

    IF NEW.branch_id != OLD.branch_id THEN
        SELECT COUNT(*) INTO v_branch_count FROM branches WHERE branch_id = NEW.branch_id AND is_active = 1;
        IF v_branch_count = 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Employee must belong to an active branch';
        END IF;
    END IF;
END //

-- ------------------------------------------------------------
-- TRIGGER 3: trg_shifts_bi (BEFORE INSERT ON shifts)
-- Enforces end_time > start_time and prevents double-booking overlapping shifts.
-- ------------------------------------------------------------
CREATE TRIGGER trg_shifts_bi BEFORE INSERT ON shifts FOR EACH ROW 
BEGIN
    DECLARE v_overlap_count INT DEFAULT 0;

    IF NEW.start_time >= NEW.end_time THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Shift end time must be later than start time';
    END IF;

    -- Concurrency check: reject overlapping shifts for the same worker on the same date
    SELECT COUNT(*)
    INTO v_overlap_count
    FROM shifts s
    WHERE s.employee_id = NEW.employee_id
      AND s.shift_date = NEW.shift_date
      AND NEW.start_time < s.end_time
      AND NEW.end_time > s.start_time;

    IF v_overlap_count > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Employee already has an overlapping shift';
    END IF;
END //

-- ------------------------------------------------------------
-- TRIGGER 4: trg_branches_bd (BEFORE DELETE ON branches)
-- Prevents deletion of branches that still have assigned employees.
-- ------------------------------------------------------------
CREATE TRIGGER trg_branches_bd BEFORE DELETE ON branches FOR EACH ROW 
BEGIN
    IF EXISTS (
        SELECT 1
        FROM employees
        WHERE branch_id = OLD.branch_id
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot delete a branch that has employees';
    END IF;
END //

DELIMITER ;


-- ============================================================
-- 7. SCHEDULED BACKGROUND EVENTS
-- ============================================================

DELIMITER //

-- ------------------------------------------------------------
-- EVENT 1: GenerateDailySalesSummary
-- Materializes prior day's net sales summary into daily_sales_summary nightly at 00:05.
-- ------------------------------------------------------------
CREATE EVENT GenerateDailySalesSummary
ON SCHEDULE EVERY 1 DAY
STARTS '2026-10-12 00:05:00'
ON COMPLETION PRESERVE
ENABLE
DO BEGIN
    -- Purge existing summary snapshot for yesterday
    DELETE FROM daily_sales_summary
    WHERE summary_date = CURRENT_DATE - INTERVAL 1 DAY;

    -- Materialize yesterday's sales figures grouped by branch
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
      AND DATE(sale_date) = CURRENT_DATE - INTERVAL 1 DAY
    GROUP BY branch_id;
END //

-- ------------------------------------------------------------
-- EVENT 2: evt_nightly_mark_absent
-- Scans shifts roster nightly at 23:55 and marks unclocked scheduled shifts as ABSENT.
-- ------------------------------------------------------------
CREATE EVENT evt_nightly_mark_absent
ON SCHEDULE EVERY 1 DAY
STARTS '2026-10-15 23:55:00'
ON COMPLETION PRESERVE
ENABLE
DO BEGIN
    UPDATE shifts
    SET status = 'ABSENT'
    WHERE shift_date <= CURDATE()
      AND status = 'SCHEDULED'
      AND clock_in IS NULL;
END //

-- ------------------------------------------------------------
-- EVENT 3: evt_monthly_archive_audit
-- Archives audit records older than 12 months to audit_log_archive on the 1st of each month.
-- ------------------------------------------------------------
CREATE EVENT evt_monthly_archive_audit
ON SCHEDULE EVERY 1 MONTH
STARTS '2026-11-14 02:00:00'
ON COMPLETION PRESERVE
ENABLE
DO BEGIN
    -- Copy records older than 12 months to audit_log_archive
    INSERT IGNORE INTO audit_log_archive
    SELECT *
    FROM audit_log
    WHERE changed_at < NOW() - INTERVAL 12 MONTH;

    -- Delete archived rows from primary audit table
    DELETE FROM audit_log
    WHERE changed_at < NOW() - INTERVAL 12 MONTH;
END //

DELIMITER ;


-- ============================================================
-- 8. TRANSACTION PATTERNS & ACID VERIFICATION SCRIPTS
-- ============================================================

-- ------------------------------------------------------------
-- TRANSACTION PATTERN A: Multi-statement Branch Reassignment with Row-level Lock
-- Demonstrates START TRANSACTION, SELECT ... FOR UPDATE, UPDATE, and COMMIT.
-- ------------------------------------------------------------
/*
START TRANSACTION;

-- Lock the target employee record against concurrent writes
SELECT employee_id, full_name, branch_id
FROM employees
WHERE employee_id = 1 AND is_active = 1
FOR UPDATE;

-- Update employee branch
UPDATE employees
SET branch_id = 2
WHERE employee_id = 1;

-- Record audit log entry within the same atomic transaction
INSERT INTO audit_log (table_name, record_id, action, old_value, new_value, changed_by)
VALUES ('employees', 1, 'UPDATE', '{"branch_id": 1}', '{"branch_id": 2}', 1);

COMMIT;
*/

-- ------------------------------------------------------------
-- TRANSACTION PATTERN B: Defensive Rollback on Failure
-- Demonstrates ROLLBACK when business invariants are violated.
-- ------------------------------------------------------------
/*
START TRANSACTION;

-- Attempt an invalid salary update
UPDATE employees
SET monthly_salary = -500.00
WHERE employee_id = 1;

-- Detect anomaly and roll back all pending changes cleanly
ROLLBACK;
*/

-- ============================================================
-- END OF SCRIPT: roles_sqls/admin.sql
-- ============================================================
