# Supermarket Management System --- Development Guide

**Project stack:** Next.js + TypeScript + MySQL\
**Database:** `supermarket_ADBMS`\
**Primary goal:** Build a multi-branch supermarket management system
with POS billing, product catalog, inventory, purchasing, customer
loyalty, staff management, audit logging, and reporting.

This guide uses the database schema supplied for the project. Treat the
SQL schema as the starting database design, then implement the business
rules in the application and database transactions.

------------------------------------------------------------------------

## 1. What you are building

The system should support these workflows:

1.  An administrator configures branches, employees, roles, and system
    access.
2.  Catalog staff create categories, suppliers, and products.
3.  Stock clerks receive stock from suppliers through purchase orders.
4.  Each branch tracks its own inventory and product batches.
5.  Cashiers scan barcodes, type product name, add products to a sale, accept payments, and
    complete receipts.
6.  Customers can use loyalty points, promotions, and coupons.
7.  Managers review sales, inventory, returns, employee shifts, and
    reports.
8.  The system records important changes and operational errors.

### Recommended modules

  --------------------------------------------------------------------------
  Module                  Main tables                Main users
  ----------------------- -------------------------- -----------------------
  Authentication and      `employees`, `branches`    All staff
  access                                             

  Branch and employee     `branches`, `employees`,   Admin, HR, manager
  management              `shifts`                   

  Product catalog         `categories`, `suppliers`, Catalog manager
                          `products`,                
                          `product_price_history`,   
                          `slow_movers`              

  Purchasing              `purchase_orders`,         Stock clerk, manager
                          `purchase_order_items`     

  Inventory               `inventory`,               Stock clerk, manager
                          `product_batches`,         
                          `stock_alerts`             

  POS and billing         `sales`, `sale_items`,     Cashier
                          `payments`                 

  Returns and refunds     `returns`                  Cashier with
                                                     permission, manager

  Customers and loyalty   `customers`,               Cashier, marketing
                          `loyalty_transactions`,    
                          `customer_tier_history`    

  Promotions and coupons  `promotions`, `coupons`    Marketing, manager

  Reports                 `daily_sales_summary`,     Manager, admin
                          sales and inventory tables 

  Audit and error         `audit_log`, `error_log`   Admin, developer
  handling                                           
  --------------------------------------------------------------------------

------------------------------------------------------------------------

## 2. Recommended technology architecture

Use a clear separation between the user interface, server-side business
logic, and database.

-   **Frontend:** Next.js App Router, React, TypeScript, CSS
    CSS.
-   **Backend:** Next.js Route Handlers or Server Actions for
    server-side operations.
-   **Database:** MySQL with InnoDB.
-   **Database access:** `mysql2/promise` with parameterized SQL. A
    query builder or ORM is also possible, but do not mix several
    database-access approaches.
-   **Validation:** Zod or equivalent validation on the server.
-   **Authentication:** A maintained authentication library, or a
    carefully implemented server-side session system.
-   **Password storage:** Store only a modern password hash such as
    bcrypt/Argon2 output in `password_hash`; never store plaintext
    passwords.
-   **Charts:** A React chart library for reports, if required.
-   **Testing:** Unit tests for calculations and integration tests
    against a test database.

### Request flow

``` text
Browser / POS screen
        |
        v
Next.js page and components
        |
        v
Server Action or Route Handler
        |
        +--> Authentication and role/branch authorization
        +--> Input validation
        +--> Business rules
        |
        v
MySQL transaction (where multiple writes must succeed together)
        |
        v
Response to the screen
```

**Important:** Do not connect to MySQL directly from browser/client
components. Database credentials and SQL queries must remain on the
server.

------------------------------------------------------------------------

## 3. Suggested project structure

One practical App Router layout is:

``` text
supermarket-system/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── pos/page.tsx
│   │   ├── products/page.tsx
│   │   ├── categories/page.tsx
│   │   ├── suppliers/page.tsx
│   │   ├── inventory/page.tsx
│   │   ├── purchases/page.tsx
│   │   ├── sales/page.tsx
│   │   ├── customers/page.tsx
│   │   ├── promotions/page.tsx
│   │   ├── employees/page.tsx
│   │   ├── branches/page.tsx
│   │   ├── returns/page.tsx
│   │   └── reports/page.tsx
│   └── api/
│       ├── auth/
│       ├── products/
│       ├── inventory/
│       ├── purchases/
│       ├── sales/
│       ├── customers/
│       └── reports/
├── components/
│   ├── layout/
│   ├── forms/
│   ├── tables/
│   └── pos/
├── lib/
│   ├── db.ts
│   ├── auth.ts
│   ├── permissions.ts
│   ├── validation/
│   ├── services/
│   └── utils/
├── types/
├── tests/
├── .env.local
├── .gitignore
└── package.json
```

Keep reusable business operations in `lib/services/` rather than
duplicating them across pages or API endpoints.

------------------------------------------------------------------------

## 4. Prepare the development environment

Install a current supported Node.js LTS release, MySQL Server, and VS
Code.

Create the Next.js project:

``` bash
npx create-next-app@latest supermarket-system
cd supermarket-system
npm install mysql2 zod bcryptjs
npm run dev
```

Choose TypeScript and App Router during setup. If you use a different
authentication library, install and configure it separately.

Create a MySQL database and run the supplied SQL script in dependency
order. Keep a copy of the original schema in a version-controlled
`database/` directory, for example:

``` text
database/
├── 001_create_database.sql
├── 002_create_core_tables.sql
├── 003_create_catalog_tables.sql
├── 004_create_inventory_tables.sql
├── 005_create_sales_tables.sql
└── 006_create_loyalty_and_audit_tables.sql
```

The filenames are a suggested organization, not a requirement. Split the
SQL carefully so referenced tables exist before foreign keys are added.

### Environment variables

Create `.env.local` in the project root:

``` env
DB_HOST=bluebirddb-sandeepal513-4009.k.aivencloud.com
DB_PORT=15359
DB_USER=avnadmin
DB_PASSWORD=
DB_NAME=supermarket_ADBMS
```

Do not commit `.env.local` to Git. Add it to `.gitignore`. Use a
separate, restricted MySQL account for the application rather than using
MySQL's root account.

Example connection helper in `lib/db.ts`:

``` ts
import mysql from "mysql2/promise";

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: false,
});
```

`decimalNumbers: false` helps avoid silently converting exact MySQL
decimal values to JavaScript floating-point numbers. Convert monetary
values deliberately, preferably using decimal-safe calculations or
integer minor units (cents) where appropriate.

Example parameterized query:

``` ts
import { pool } from "@/lib/db";

const [rows] = await pool.execute(
  "SELECT product_id, barcode, name, unit_price FROM products WHERE barcode = ? AND is_active = 1",
  [barcode]
);
```

Never build SQL by concatenating untrusted input into the query string.

------------------------------------------------------------------------

## 5. Database review before building screens

The supplied schema is comprehensive, but several business rules need to
be implemented or clarified.

### 5.1 Foreign-key creation order

`branches` references `employees` through `manager_id`, while
`employees` references `branches`. Your script correctly starts by
creating `branches` with a nullable `manager_id`, creates `employees`,
and then adds the manager foreign key. Preserve that order.

Other tables must be created after the tables they reference. For
example, `sales` needs branches, employees, customers, promotions, and
coupons; `loyalty_transactions` needs customers and sales.

### 5.2 Branch manager integrity

The foreign key ensures a manager ID exists, but does not ensure that
the employee is a `MANAGER` or belongs to the same branch. Enforce that
rule in server-side business logic, and consider a trigger or a stronger
data model if database-level enforcement is required.

### 5.3 Inventory and batches

`inventory.quantity_on_hand` and the sum of `product_batches.quantity`
can drift apart unless every stock operation updates both consistently.
Decide which representation is authoritative. A practical approach is to
update both in one database transaction and run reconciliation reports
to detect differences.

Consider a uniqueness rule for a batch number within a branch/product,
such as `UNIQUE(branch_id, product_id, batch_no)`, if that matches the
supplier and receiving process.

### 5.4 Purchase order receiving

The current schema has purchase order headers and items but no
receiving-history table. For a basic project, receiving can update the
order status and stock in one transaction. For partial deliveries or
multiple deliveries, add tables such as `goods_receipts` and
`goods_receipt_items`; do not mark the whole order received until the
intended receiving rules are satisfied.

### 5.5 Sales and payment consistency

The schema does not automatically guarantee that: - `sales.subtotal`
equals the sum of sale-item line amounts before discounts/tax; -
`total_amount` equals subtotal minus discounts plus tax; - the sum of
successful payments equals the amount due; - returned quantity does not
exceed the quantity originally sold minus previous returns.

Calculate and validate these in the server-side transaction. Consider
adding payment status and refund-payment tracking if your requirements
need them.

### 5.6 Price and discount calculations

Choose one documented formula and use it everywhere. For example:

-   Gross line amount = quantity × unit price.
-   Line discount = applicable item discount.
-   Net line amount = gross line amount − line discount.
-   Subtotal = sum of gross line amounts.
-   Discount total = sum of line discounts plus any basket-level
    discount, without double-counting.
-   Tax total = calculated using the agreed tax policy and taxable
    amount.
-   Total due = subtotal − discount total + tax total.

Clarify whether `line_total` stores the post-discount amount and whether
tax is included in `unit_price`. The schema does not fully define these
choices. Use decimal-safe arithmetic and round according to the business
rules.

### 5.7 Promotions and coupons

Your `promotions` table supports one product, one category, or the whole
basket. `chk_promo_target` prevents product and category targets being
set together, but application logic must still validate dates,
`is_active`, overlapping promotions, coupon expiry, customer
restrictions, and coupon reuse.

A coupon's `is_used` flag alone is not enough for robust concurrent
checkout. Lock the coupon row and mark it used inside the same
transaction that completes the sale.

### 5.8 Returns

The current `returns` table stores return quantity and refund amount but
does not identify a refund payment transaction. Add a refund table or
suitable payment/refund fields if you need a full financial audit trail.
Validate return quantity against previous returns and update inventory
according to your policy for resellable goods.

### 5.9 Audit logging

`audit_log` is useful, but the application must actually write audit
records. For important changes, insert the audit record in the same
transaction as the business change. Store only the fields necessary for
auditing; never put passwords, session tokens, or other secrets in audit
JSON.

### 5.10 Additional constraints worth considering

Review whether the following rules should be added: - `tax_rate >= 0`
and a sensible maximum. - `reorder_level >= 0` on products and
inventory. - `reserved_qty <= quantity_on_hand`, if that is the intended
reservation model. - `end_time > start_time` for shifts, with a policy
for overnight shifts. - `quantity` in returns cannot exceed sold
quantity after previous returns (usually needs transactional application
logic). - A suitable index on common report filters, such as
`(branch_id, sale_date)` on `sales`. - An index on
`sale_items(product_id)` for product-level sales analysis. - An index on
`product_batches(branch_id, product_id, expiry_date)` for expiry
monitoring.

Do not add every index automatically. Confirm the actual query patterns
and use `EXPLAIN` to assess index use.

------------------------------------------------------------------------

## 6. Authentication, roles, and permissions

The `employees.role` column has these roles:

-   `ADMIN`
-   `MANAGER`
-   `CASHIER`
-   `STOCK_CLERK`
-   `CATALOG_MANAGER`
-   `MARKETING`
-   `HR`

Create a permission matrix before coding. Suggested initial policy:

  ---------------------------------------------------------------------------------------------------------------
  Feature                   Admin          Manager            Cashier Stock clerk   Catalog   Marketing        HR
                                                                                    manager             
  --------------------- --------- ---------------- ------------------ ----------- --------- ----------- ---------
  Manage branches             Yes          Limited                 No          No        No          No        No

  Manage employees            Yes   Branch-limited                 No          No        No          No       Yes

  Manage                      Yes              Yes          Read-only   Read-only       Yes   Read-only        No
  products/categories                                                                                   

  Receive                     Yes              Yes                 No         Yes        No          No        No
  purchases/update                                                                                      
  stock                                                                                                 

  Create/complete POS         Yes              Yes                Yes          No        No          No        No
  sales                                                                                                 

  Process returns             Yes              Yes   Permission-based          No        No          No        No

  Manage                      Yes              Yes                 No          No        No         Yes        No
  promotions/coupons                                                                                    

  View branch reports         Yes              Yes  Own-shift summary       Stock   Catalog   Promotion        HR
                                                                          reports   reports     reports   reports
  ---------------------------------------------------------------------------------------------------------------

This is a starting point; your project group should approve the final
rules. Always check permissions on the server. Hiding a button in the UI
is not access control.

For branch-limited staff, validate that the requested branch matches the
employee's permitted branch. Do not trust a `branch_id` sent by the
browser without authorization checks.

------------------------------------------------------------------------

## 7. Build the system in this order

Build and test one working module at a time. Do not start by building
every screen simultaneously.

### Phase 1 --- Database and application foundation

1.  Create the database and tables in dependency order.
2.  Insert test branches and employees.
3.  Create the Next.js project and database connection.
4.  Add validation and consistent error responses.
5.  Set up Git and keep database scripts under version control.
6.  Test a read query and an insert using parameterized SQL.

**Done when:** the server can safely query MySQL, errors are handled,
and secrets are not exposed to the browser.

### Phase 2 --- Login and access control

1.  Build the login page.
2.  Find the employee by unique email.
3.  Verify the submitted password against `password_hash`.
4.  Create a secure session using a maintained authentication approach.
5.  Add logout and session-expiry behavior.
6.  Protect dashboard pages and server endpoints.
7.  Enforce role and branch permissions.

Do not create a public employee-registration page for an internal
supermarket system unless explicitly required. An administrator should
normally create staff accounts.

**Done when:** an unauthenticated user cannot access protected pages or
APIs, and a cashier cannot call manager-only operations.

### Phase 3 --- Branches and employees

Build create, view, update, and deactivate operations for branches and
employees. Use `is_active` for deactivation where history must be
preserved. Validate manager assignments and avoid deleting employees
referenced by sales or audit records.

Build shift scheduling and attendance after basic employee management
works.

### Phase 4 --- Catalog

Implement: 1. Categories, including parent categories. 2. Suppliers. 3.
Products with unique barcode. 4. Product search by barcode/name. 5.
Product activation/deactivation. 6. Price updates with
`product_price_history`.

When a product price changes, update the product and insert its history
record in the same transaction. Restrict who can change cost price and
selling price.

### Phase 5 --- Inventory and purchasing

Build: 1. Inventory view by branch. 2. Low-stock and out-of-stock views.
3. Purchase order creation. 4. Purchase order item management. 5. Order
status changes. 6. Goods receiving. 7. Batch and expiry tracking. 8.
Stock alerts.

When receiving goods, use a transaction to validate the order, update
inventory, add or update batches, update purchase-order status, and
write an audit record. Roll back everything if any step fails.

For stock deduction, lock the relevant inventory row
(`SELECT ... FOR UPDATE`) inside a transaction, verify available
quantity, deduct stock, and commit. This prevents two concurrent
cashiers from selling the same last item.

### Phase 6 --- POS checkout (the core module)

Build the POS before optional reports and advanced analytics.

Recommended POS screen: - Barcode/search input. - Product result list. -
Cart with quantity controls. - Subtotal, discounts, tax, and total. -
Optional customer/loyalty lookup. - Promotion/coupon entry. - Payment
method and amount. - Complete sale button. - Receipt display/print view.

#### Recommended checkout workflow

1.  Cashier scans or searches for a product.
2.  Server returns the active product and current permitted selling
    price.
3.  UI adds the item to the cart; the cart is only a preview, not the
    trusted final calculation.
4.  Cashier selects a customer if applicable and enters a coupon if
    applicable.
5.  On checkout, server validates every product, quantity, price,
    promotion, coupon, branch, and permission again.
6.  Start a MySQL transaction.
7.  Lock stock rows in a consistent order and verify sufficient
    available stock.
8.  Recalculate all amounts on the server.
9.  Insert the `sales` header.
10. Insert `sale_items` with the price used at the time of sale.
11. Deduct stock and update batch quantities according to the
    stock-rotation policy.
12. Insert payment rows and verify the amount paid meets the amount due.
13. Mark the sale `COMPLETED`.
14. Mark a coupon used, if applicable.
15. Update loyalty points and insert `loyalty_transactions`, if
    applicable.
16. Write audit records.
17. Commit the transaction.
18. Return the sale ID and receipt data.

If any required step fails, roll back the entire transaction. Do not
leave a completed sale with no stock deduction or a used coupon without
a completed sale.

Use a unique checkout/idempotency key if possible, so a double-click or
retry does not create duplicate sales. Use a consistent row-lock order
to reduce deadlocks; retry a transaction safely if a deadlock occurs.

#### Payment rules to decide

-   Can one sale have split payments? The schema allows multiple
    `payments` rows.
-   Can a cashier accept partial payment? If not, require the payment
    sum to equal the amount due before completion.
-   How is change for cash recorded? Usually the payment amount recorded
    as collected should be the amount applied to the sale, while change
    is displayed separately; document your chosen policy.
-   Are points a discount or a payment method? The schema includes
    `POINTS`, so define how redeemed points convert to value and how
    they affect customer balance.
-   Are refunds stored as negative payments, separate refund records, or
    another structure? Choose one auditable approach.

### Phase 7 --- Customers and loyalty

Build customer lookup by card number or phone, registration, profile
updates, point balance, and transaction history.

Define the loyalty rules before coding: - How points are earned per
eligible amount. - Whether discounted/taxed amounts count. - How many
points equal one unit of currency. - Minimum points required for
redemption. - When points expire. - How tier thresholds are calculated.

Every points change should update `customers.points_balance` and insert
a corresponding `loyalty_transactions` record in the same transaction.
Prevent a concurrent redemption from making the balance negative. Record
tier changes in `customer_tier_history`.

### Phase 8 --- Promotions and coupons

Build promotion creation/editing, date range, active flag, target
product/category/basket, and coupon issuance. Validate promotion
eligibility on the server at checkout. Decide how conflicting promotions
are prioritized and ensure discounts are not applied twice.

### Phase 9 --- Returns and refunds

1.  Search completed sales/receipts.
2.  Select the original sale item.
3.  Check returnable quantity after prior returns.
4.  Determine refund amount using the original sale price and the agreed
    discount/tax policy.
5.  Record the return and employee.
6.  Restock only if the item is accepted back into sellable inventory.
7.  Record the refund transaction.
8.  Audit the operation.

Returns should be transactional and must not permit returning more units
than were sold.

### Phase 10 --- Reports and dashboard

Start with simple SQL reports: - Today's sales by branch. - Sales by
date range. - Number of completed transactions. - Top-selling
products. - Revenue by category. - Low-stock products. - Products near
expiry. - Purchase totals by supplier. - Returns and refunds. - Sales by
cashier. - Customer loyalty activity. - Slow-moving products.

Use `daily_sales_summary` only if you implement a reliable process to
maintain it. A summary table is not automatically updated just because
it exists. For correctness, compare summary totals with the underlying
sales data during testing.

### Phase 11 --- Audit, errors, and operational reliability

-   Log sensitive business changes.
-   Log handled stored-procedure/application failures in `error_log`
    where appropriate.
-   Do not expose stack traces, database passwords, or SQL details to
    end users.
-   Use database backups and test restoration.
-   Add pagination and filters to large tables.
-   Add loading, empty, success, and error states to screens.
-   Keep an audit trail for price changes, stock corrections, refunds,
    employee changes, and permission-sensitive actions.

### Phase 12 --- Testing and deployment

Test on a staging database before using real data. Deploy the Next.js
server and MySQL to environments that support secure network access and
backups. Use HTTPS, secure session cookies, restricted database
credentials, and environment-specific secrets.

------------------------------------------------------------------------

## 8. API / server-operation plan

You can implement these as Route Handlers or Server Actions. The names
below are a suggested design, not pre-existing endpoints.

  ----------------------------------------------------------------------------------
  Operation               Example endpoint                 Main tables
  ----------------------- -------------------------------- -------------------------
  Login/logout            `/api/auth/login`,               `employees` plus session
                          `/api/auth/logout`               store

  Search products         `GET /api/products?search=`      `products`, `categories`

  Product maintenance     `/api/products`                  `products`,
                                                           `product_price_history`

  Inventory by branch     `GET /api/inventory?branchId=`   `inventory`, `products`,
                                                           `branches`

  Create purchase order   `/api/purchases`                 `purchase_orders`,
                                                           `purchase_order_items`

  Receive purchase order  `/api/purchases/[id]/receive`    purchase tables,
                                                           inventory, batches

  Search customer         `GET /api/customers?cardNo=`     `customers`

  Checkout                `POST /api/sales/checkout`       sales, items, payments,
                                                           inventory, loyalty

  Sale receipt            `GET /api/sales/[id]`            sales, sale_items,
                                                           payments, products

  Process return          `POST /api/returns`              returns, inventory,
                                                           refund records

  Sales report            `GET /api/reports/sales`         sales, sale_items,
                                                           branches

  Stock report            `GET /api/reports/stock`         inventory, products,
                                                           batches
  ----------------------------------------------------------------------------------

For every write operation: 1. Authenticate the user. 2. Check role and
branch access. 3. Validate the request. 4. Apply the business rules. 5.
Use a transaction when multiple records must change together. 6. Return
a predictable response and safe error message.

------------------------------------------------------------------------

## 9. UI pages and navigation

Suggested sidebar:

``` text
Dashboard
POS
Sales
Returns
Products
Categories
Suppliers
Inventory
Purchase Orders
Customers
Promotions & Coupons
Employees
Shifts
Branches
Reports
Audit Log
Settings
```

Only show navigation items that the logged-in employee is allowed to
use. Still enforce the same permissions on the server.

### UI guidelines

-   Use forms with clear labels and validation messages.
-   Show money with a consistent currency and decimal format.
-   Display branch context prominently for branch-specific screens.
-   Use pagination, search, sorting, and filters for lists.
-   Confirm destructive or high-impact actions.
-   Prefer deactivation over deletion for records with transaction
    history.
-   Make the POS keyboard-friendly; barcode scanning normally behaves
    like keyboard input.
-   Make the receipt easy to print and include sale number, branch,
    cashier, item details, discounts, tax, payment, and total.
-   Never treat a hidden form field or client-calculated total as
    trusted.

------------------------------------------------------------------------

## 10. Database transactions: minimum examples

### Example A --- Update a product price and keep history

The exact SQL depends on your chosen API, but the operation should be:

``` text
BEGIN
  Read and lock the product row.
  Validate the new price.
  Insert old_price/new_price into product_price_history.
  Update products.unit_price.
  Insert audit_log record.
COMMIT
```

Rollback if any operation fails. Obtain the employee ID from the
authenticated server session, not from a user-editable form field.

### Example B --- Receive a purchase order

``` text
BEGIN
  Lock the purchase order.
  Confirm its status permits receiving.
  Read its items.
  For each item:
    Add received quantity to inventory.
    Insert a product batch when batch tracking is used.
  Update purchase order status according to receiving policy.
  Insert audit_log record.
COMMIT
```

For partial receiving, store each receipt separately rather than losing
the history of multiple deliveries.

### Example C --- Complete a sale

``` text
BEGIN
  Validate and lock stock/coupon/customer rows as required.
  Recalculate totals from trusted database values.
  Insert sales.
  Insert sale_items.
  Deduct inventory and batches.
  Insert payments.
  Update coupon and loyalty records.
  Insert audit_log records.
COMMIT
```

These are workflow examples, not complete executable SQL. Implement
rollback/error handling in the service layer.

------------------------------------------------------------------------

## 11. Indexing and performance

The schema already includes useful indexes, including: - Unique barcode
and email indexes. - `inventory(branch_id, product_id)` unique composite
index. - `shifts(employee_id, shift_date)`. - `sales(sale_date)`. -
`sale_items(sale_id)`. - Full-text product-name index.

Use indexes that match actual search and report conditions. For example,
a branch-and-date sales report may benefit from an index on
`(branch_id, sale_date)`. A query filtering by `product_id` in
`sale_items` may benefit from an index on that column.

Use `EXPLAIN` for important queries. Do not add indexes without
considering write overhead and storage cost. Foreign-key columns often
need indexes; MySQL may create an index automatically if a suitable one
is not present, but verify the final schema.

For large data volumes, use pagination and aggregate reports in SQL
rather than loading every sale into the browser.

------------------------------------------------------------------------

## 12. Test checklist

### Catalog

-   [ ] Duplicate barcode is rejected.
-   [ ] Duplicate email is rejected.
-   [ ] Inactive products cannot be sold.
-   [ ] Price changes create price history.

### Inventory and purchasing

-   [ ] Stock cannot become negative.
-   [ ] Receiving increases the correct branch's stock.
-   [ ] Two concurrent checkouts cannot oversell the same stock.
-   [ ] Expiry and low-stock alerts are generated correctly.
-   [ ] Inventory totals can be reconciled against batches.

### POS

-   [ ] Server recalculates totals.
-   [ ] Invalid/inactive products are rejected.
-   [ ] Coupon dates and eligibility are checked.
-   [ ] Payment total follows the chosen payment rule.
-   [ ] Failed checkout rolls back all changes.
-   [ ] Retrying checkout does not create duplicate sales.
-   [ ] Receipt values match stored database values.

### Customers and returns

-   [ ] Loyalty points cannot be redeemed below zero.
-   [ ] Each points change has a ledger row.
-   [ ] Returns cannot exceed sold quantities after earlier returns.
-   [ ] Refund and inventory changes are consistent.

### Security

-   [ ] Passwords are hashed.
-   [ ] SQL uses parameters.
-   [ ] Cashiers cannot access admin operations.
-   [ ] Users cannot access another branch's data without permission.
-   [ ] Secrets and stack traces are not exposed.
-   [ ] Audit records exclude credentials and tokens.

### Reports

-   [ ] Date range boundaries are correct.
-   [ ] Cancelled/open sales are excluded where appropriate.
-   [ ] Summary totals reconcile with transaction tables.
-   [ ] Large lists are paginated.

------------------------------------------------------------------------

## 13. Suggested group-member division

If this is a five-member group project, assign ownership by module but
agree on shared rules first.

  -----------------------------------------------------------------------
  Member                              Suggested ownership
  ----------------------------------- -----------------------------------
  Member 1                            Categories, suppliers, products,
                                      price history

  Member 2                            Inventory, batches, purchase
                                      orders, stock alerts

  Member 3                            POS, sales, sale items, payments,
                                      returns

  Member 4                            Customers, promotions, coupons,
                                      loyalty

  Member 5                            Branches, employees, shifts,
                                      authentication support, audit/error
                                      logging
  -----------------------------------------------------------------------

One person should coordinate integration, shared UI components, database
migrations, naming conventions, and final testing. The exact division
can be adjusted to match the course requirements. Each member should
provide documented APIs/services, test data, and integration tests.

------------------------------------------------------------------------

## 14. Recommended first-week implementation plan

1.  **Day 1:** Confirm business rules, review the SQL schema, create Git
    repository, and create the database.
2.  **Day 2:** Set up Next.js, MySQL connection, environment variables,
    and a test query.
3.  **Day 3:** Build login/session protection and role/branch
    authorization.
4.  **Day 4:** Build branch, supplier, category, and product CRUD.
5.  **Day 5:** Build inventory view and purchase order creation.
6.  **Day 6:** Build barcode product search and the initial POS cart.
7.  **Day 7:** Implement checkout transaction, then test stock
    deduction, payment, rollback, and duplicate submission.

This is a planning template; adjust it based on group availability and
the time allowed by the assignment.

------------------------------------------------------------------------

## 15. What to build first right now

Start with these concrete tasks:

1.  Run the schema and confirm all tables were created successfully.
2.  Insert one branch, one manager, one cashier, one supplier, one
    category, and a few products.
3.  Set up the Next.js project and test the MySQL connection.
4.  Implement login and server-side authorization.
5.  Build product search by barcode.
6.  Build a POS cart.
7.  Implement checkout as one transaction before adding advanced
    features.
8.  Add purchasing, loyalty, returns, and reports in later iterations.

**Most important principle:** The browser is for displaying and
collecting input. The server and MySQL transaction are responsible for
validating prices, permissions, stock, discounts, payments, and the
final sale. This prevents incorrect totals, overselling, duplicate
checkouts, and inconsistent data.

------------------------------------------------------------------------

## 16. Final decisions to confirm with your group

Before implementing checkout, write down answers to these questions:

-   What currency should the system use?
-   Is tax included in the displayed product price?
-   What is the exact discount and tax calculation order?
-   Is a sale completed only when fully paid?
-   How is cash change represented?
-   How are loyalty points earned and redeemed?
-   Can purchase orders be partially received?
-   Are batches mandatory for all products or only expiry-sensitive
    goods?
-   How should returned products affect inventory?
-   Which reports and database techniques are specifically required by
    the ADBMS assignment (for example procedures, functions, triggers,
    views, indexes, audit logs, or partitioning)?

Document these decisions in the repository so all group members
implement the same rules.
