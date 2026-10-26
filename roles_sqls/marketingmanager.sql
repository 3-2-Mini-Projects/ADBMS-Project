USE supermarket_ADBMS;

##### views #####

create view customer_etl_vw As
 select 
   customer_id,
   card_no,
   full_name,
   concat(LEFT(phone, 3),'****',RIGHT(phone, 3))AS masked_phone,
   email,
   tier,
   points_balance,
   join_date 
 from customers ; 
 
 select * from customer_etl_vw;
 
 #2
 
 create view active_promotions_vw AS
 select 
  p.promo_id,
  p.name AS promotion_name,
  p.discount_percent,
  p.product_id,
  pro.name AS product_name,
  p.category_id,
  c.name AS category_name
from promotions p
left join products pro on pro.product_id = p.product_id
left join categories c on c.category_id = p.category_id
where p.is_active = 1 
AND CURDATE() BETWEEN p.start_date AND p.end_date ;

select * from active_promotions_vw;
  
  
#3

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
              WHEN lt.type = 'EARN' OR lt.type = 'EARNED'
              THEN COALESCE(lt.points, 0)
              ELSE 0
          END
      ), 0) AS total_points_earned
  FROM customers c
  LEFT JOIN loyalty_transactions lt ON c.customer_id = lt.customer_id
  WHERE c.is_active = 1 AND c.points_balance > 0
  GROUP BY c.customer_id, c.card_no, c.full_name, c.tier, c.points_balance, DATE_FORMAT(lt.created_at, '%Y-%m');
    

SELECT t.*
FROM top_customers_vw t
JOIN customers c ON t.customer_id = c.customer_id
WHERE c.city = 'Colombo'
ORDER BY t.total_points_earned DESC
LIMIT 10;


#4
create view customer_summary_vw AS
SELECT
    c.customer_id,
    c.card_no,
    c.full_name,
    c.phone,
    c.email,
    c.tier,
    c.points_balance,
    COALESCE(SUM(
       CASE
            WHEN lt.type = 'EARN' THEN lt.points
            ELSE 0
        END), 0) AS total_points_earned,
    COALESCE(SUM(
        CASE
            WHEN lt.type = 'REDEEM' THEN ABS(lt.points)
            ELSE 0
        END), 0) AS total_points_redeemed,
    COALESCE(s.total_spent, 0) AS total_spent,
    COALESCE(s.total_orders, 0) AS total_orders
  FROM customers c
  join loyalty_transactions lt ON c.customer_id = lt.customer_id
join(
    SELECT
        customer_id,
        SUM(total_amount) AS total_spent,
        COUNT(sale_id) AS total_orders
    FROM sales
    WHERE status = 'COMPLETED' AND customer_id IS NOT NULL
    GROUP BY customer_id) AS s ON c.customer_id = s.customer_id 
    GROUP BY
      c.customer_id,
      c.card_no,
      c.full_name,
      c.phone,
      c.email,
	  c.tier,
      c.points_balance,
      s.total_spent,
      s.total_orders;
      
 SELECT * FROM customer_summary_vw;
 
 
 
#####  procedures ######
 
#2

delimiter //
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
        customer_id, sale_id, points, type, note
    )
    VALUES (
        p_customer_id, p_sale_id, -p_points,
        'REDEEM', 'Points redeemed'
    );

    COMMIT;
END //
delimiter ;

select * from customers;
CALL redeem_points(1, 50, 53);
select * from loyalty_transactions ; 



# 3

delimiter //
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
   INSERT INTO loyalty_transactions (customer_id, sale_id, points, type, note)
    VALUES (p_customer_id, p_sale_id, p_points, 'EARN', p_note);
    UPDATE customers
    SET points_balance = points_balance + p_points
    WHERE customer_id = p_customer_id;
    COMMIT;
END //
delimiter ;

CALL add_ltpoints(1,100,53,'earned');
select * from loyalty_transactions;


#4

delimiter //
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
        product_id, category_id, is_active)
    VALUES (
        p_name, p_discount, p_start, p_end,
        p_product_id, p_category_id, 1);
    SELECT LAST_INSERT_ID() AS promo_id;
END //

delimiter ;

CALL create_promotion('New Offer',10.00,'2026-10-30','2026-11-30',NULL,NULL);
SELECT * FROM promotions;


#5

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


CALL recalculate_tiers();
SELECT customer_id, full_name, tier FROM customers;
SELECT * FROM customer_tier_history;

#6

delimiter //
 CREATE PROCEDURE get_active_promotions()
  BEGIN
      SELECT *
      FROM promotions
      WHERE is_active = 1
        AND CURDATE() BETWEEN start_date AND end_date;
  END//
  delimiter ;
  
  call get_active_promotions();
  
#7

  delimiter //
  CREATE PROCEDURE get_deactive_promotions()
  BEGIN
      SELECT *,
          CASE
              WHEN is_active = 0 THEN 'DEACTIVATED'
              WHEN CURDATE() < start_date THEN 'SCHEDULED'
              WHEN CURDATE() > end_date THEN 'EXPIRED'
          END AS promotion_status
      FROM promotions
      WHERE is_active = 0
         OR CURDATE() < start_date
         OR CURDATE() > end_date;
  END //
delimiter ;

call get_deactive_promotions();



-- DELIMITER //

-- CREATE PROCEDURE proc_apply_coupon(
--     IN p_sale_id INT,
--     IN p_code VARCHAR(50)
-- )
-- BEGIN
--     DECLARE v_coupon_id INT;
--     DECLARE v_promo_id INT;
--     DECLARE v_coupon_customer INT;
--     DECLARE v_sale_customer INT;
--     DECLARE v_is_used TINYINT;
--     DECLARE v_expiry_date DATE;
--     DECLARE v_discount_percent DECIMAL(5,2);
--     DECLARE v_subtotal DECIMAL(12,2);
--     DECLARE v_old_discount DECIMAL(12,2);
--     DECLARE v_tax DECIMAL(12,2);
--     DECLARE v_status VARCHAR(20);
--     DECLARE v_total_discount DECIMAL(12,2);
--     DECLARE v_not_found INT DEFAULT 0;

--     DECLARE CONTINUE HANDLER FOR NOT FOUND
--         SET v_not_found = 1;

--     DECLARE EXIT HANDLER FOR SQLEXCEPTION
--     BEGIN
--         ROLLBACK;
--         RESIGNAL;
--     END;

--     START TRANSACTION;

--     -- Check the sale
--     SELECT customer_id, subtotal, discount_total,
--            tax_total, status
--     INTO v_sale_customer, v_subtotal, v_old_discount,
--          v_tax, v_status
--     FROM sales
--     WHERE sale_id = p_sale_id
--     FOR UPDATE;

--     IF v_not_found = 1 THEN
--         SIGNAL SQLSTATE '45000'
--         SET MESSAGE_TEXT = 'Sale not found';
--     END IF;

--     IF v_status <> 'OPEN' THEN
--         SIGNAL SQLSTATE '45000'
--         SET MESSAGE_TEXT = 'Coupon can only be applied to an open sale';
--     END IF;

--     -- Check and lock the coupon
--     SET v_not_found = 0;

--     SELECT coupon_id, promo_id, customer_id, is_used, expiry_date
--     INTO v_coupon_id, v_promo_id, v_coupon_customer,
--          v_is_used, v_expiry_date
--     FROM coupons
--     WHERE code = p_code
--     FOR UPDATE;

--     IF v_not_found = 1 THEN
--         SIGNAL SQLSTATE '45000'
--         SET MESSAGE_TEXT = 'Coupon not found';
--     END IF;

--     IF v_is_used = 1 THEN
--         SIGNAL SQLSTATE '45000'
--         SET MESSAGE_TEXT = 'Coupon has already been used';
--     END IF;

--     IF v_expiry_date IS NOT NULL
--        AND v_expiry_date < CURDATE() THEN
--         SIGNAL SQLSTATE '45000'
--         SET MESSAGE_TEXT = 'Coupon has expired';
--     END IF;
--     IF v_coupon_customer IS NOT NULL
--        AND (v_sale_customer IS NULL
--             OR v_coupon_customer <> v_sale_customer) THEN
--         SIGNAL SQLSTATE '45000'
--         SET MESSAGE_TEXT = 'Coupon does not belong to this customer';
--     END IF;
--     -- Check the promotion
--     SET v_not_found = 0;

--     SELECT discount_percent
--     INTO v_discount_percent
--     FROM promotions
--     WHERE promo_id = v_promo_id
--       AND is_active = 1
--       AND CURDATE() BETWEEN start_date AND end_date;
--     IF v_not_found = 1 THEN
--         SIGNAL SQLSTATE '45000'
--         SET MESSAGE_TEXT = 'Promotion is not active';
--     END IF;
--     -- Calculate and apply the discount
--     SET v_total_discount =
--         LEAST(
--             v_subtotal,
--             COALESCE(v_old_discount, 0)
--             + (v_subtotal * v_discount_percent / 100)
--         );
--     UPDATE sales
--     SET coupon_id = v_coupon_id,
--         promo_id = v_promo_id,
--         discount_total = v_total_discount,
--         total_amount = GREATEST(
--             0,
--             v_subtotal - v_total_discount + COALESCE(v_tax, 0)
--         )
--     WHERE sale_id = p_sale_id;
--     UPDATE coupons
--     SET is_used = 1,
--         used_at = NOW()
--     WHERE coupon_id = v_coupon_id;
--     COMMIT;
-- END //
-- DELIMITER ;

-- CALL proc_apply_coupon(1, 'SAVE10');
-- SELECT * FROM sales WHERE sale_id = 1;
-- SELECT * FROM coupons WHERE code = 'SAVE10';
-- SET GLOBAL event_scheduler = ON;




#8


DELIMITER //

CREATE PROCEDURE get_active_promotions()
BEGIN
    SELECT *
    FROM promotions
    WHERE is_active = 1
      AND CURDATE() BETWEEN start_date AND end_date;
END //

DELIMITER ;

CALL get_active_promotions();


#9

DELIMITER //

CREATE PROCEDURE get_deactive_promotions()
BEGIN
    SELECT *,
        CASE
            WHEN is_active = 0 THEN 'DEACTIVATED'
            WHEN CURDATE() < start_date THEN 'SCHEDULED'
            WHEN CURDATE() > end_date THEN 'EXPIRED'
        END AS promotion_status
    FROM promotions
    WHERE is_active = 0
       OR CURDATE() < start_date
       OR CURDATE() > end_date;
END //

DELIMITER ;

CALL get_deactive_promotions;





##### functions #####

delimiter //
create  lt_points_earned(product_ammount decimal(12,2))
returns int
deterministic
no sql
 begin
   RETURN FLOOR(GREATEST(COALESCE(product_ammount, 0), 0) / 100);
 end //
delimiter ;

select lt_points_earned(350);


#2

delimiter //
create function get_discount(p_amount decimal(12,2),promo_id int)
returns decimal(9,2)
reads sql data 
 begin
   declare discount decimal(5,2) default 0;
   select COALESCE(MAX(discount_percent), 0) into discount
   from promotions
   where promotions.promo_id = promo_id and is_active =1
   AND CURDATE() BETWEEN start_date AND end_date;
   return GREATEST(COALESCE(p_amount, 0), 0)* discount / 100;
 end //
delimiter ;

select get_discount(350,1); // because the promotion is deactivate

#3

delimiter //
create function modify_customer_tier(p_customer_id int)
returns varchar(20)
reads sql data 
begin
 declare spending decimal(14,2) default 0 ;
 select COALESCE(SUM(total_amount), 0) into spending
 from sales 
 where customer_id = p_customer_id AND status = 'COMPLETED';
 RETURN CASE
    WHEN spending >= 100000 THEN 'PLATINUM'
    WHEN spending >= 50000  THEN 'GOLD'
    WHEN spending >= 20000  THEN 'SILVER'
    ELSE 'BRONZE'
    
    END;
end //
delimiter ;

SELECT modify_customer_tier(1);


#4
delimiter //
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
END//
DELIMITER ;

select promo_isactive(2);


###### triggers #####

-- check discount percentage
delimiter //
CREATE TRIGGER before_promotions_insert
BEFORE INSERT ON promotions
FOR EACH ROW
BEGIN
    IF NEW.discount_percent <= 0
       OR NEW.discount_percent > 100 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Discount must be between 0 and 100';
    END IF;

    IF NEW.end_date < NEW.start_date THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'End date cannot precede start date';
    END IF;
END//
delimiter ;

INSERT INTO promotions(name, discount_percent, start_date, end_date)
VALUES('New Year Sale', 5, '2026-12-01', '2026-12-31');
SELECT * FROM promotions;


#2
delimiter //
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
END//
delimiter ;


#3
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
                INSERT INTO loyalty_transactions
                    (customer_id, sale_id, points, type, note)
                VALUES
                    (NEW.customer_id, NEW.sale_id, v_points,
                     'EARN', 'Points earned from completed sale');
            END IF;
        END IF;
    END IF;
END //

DELIMITER ;


SELECT * FROM loyalty_transactions WHERE type = 'EARN';
SELECT customer_id, points_balance FROM customers;


##### Events ####  (Scheduled time ekkata wenne )


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

SHOW EVENTS;

SELECT promo_id, name, end_date, is_active
FROM promotions
WHERE end_date < CURDATE();


#2

DELIMITER //

CREATE EVENT update_promotion_status
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO
BEGIN
    UPDATE promotions
    SET is_active = CASE
        WHEN CURDATE() >= start_date
         AND CURDATE() <= end_date THEN 1
        ELSE 0
    END
    WHERE promo_id > 0;
END //

DELIMITER ;