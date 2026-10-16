# Supermarket ADBMS - Project Summary

## 1. Project Overview
**Supermarket ADBMS** is a multi-branch enterprise supermarket management and Point-of-Sale (POS) application built for an Advanced Database Management Systems (ADBMS) project. It combines an OLTP transaction engine with real-time inventory management, supplier purchasing, batch expiry tracking, customer loyalty tiers, shift scheduling, audit logging, and SQL view-driven analytics.

---

## 2. Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js 16.4.0 (App Router), React 19.3.0 | Turbopack compilation, React Compiler enabled |
| **Language & Styling** | TypeScript 5, Tailwind CSS v4, Lucide Icons | Responsive modern dark-theme dashboard UI |
| **Database & Driver** | MySQL (`supermarket_ADBMS` / `supermarket_oltp`), `mysql2/promise` | Connection pooling (limit 10, SSL), parameterized SQL, row locks |
| **State & Context** | React Context API (`src/lib/context.tsx`) | Global branch switcher, active employee/role simulator, toast system |
| **Access Control** | Role-Based Access Control (RBAC) (`src/lib/permissions.ts`) | 7 roles mapped against 10 granular system permissions |

---

## 3. High-Level Architecture

```mermaid
flowchart TD
    UI[Next.js App Router Client Pages] --> Context[AppContext: Branch & Role Switcher]
    Context --> API[Next.js Route Handlers /api/*]
    API --> Pool[(MySQL Connection Pool: supermarket_ADBMS)]

    subgraph OLTP Transactions
        POS[POS Checkout Engine] -->|BEGIN ... FOR UPDATE| InvLock[Lock Products & Inventory]
        InvLock --> StockDec[Decrement Stock & Deduct Batches]
        StockDec --> SaleRec[Insert Sales, Items & Payments]
        SaleRec --> Points[Accrue / Redeem Loyalty Points]
        Points --> Audit[Write Audit Log Record]
    end

    subgraph Inventory & Procurement
        PO[Purchase Order Lifecycle] -->|Receive PO| BatchGen[Generate Batches & Add Inventory]
        Returns[Returns & Refunds] --> Restock[Restock Inventory & Refund Record]
    end

    subgraph Analytics & Reporting
        Views[MySQL Analytical Views] --> RepAPI[/api/reports]
        RepAPI --> Dash[Dashboard & Reporting UI]
    end

    API --> POS
    API --> PO
    API --> Returns
    Pool --> Views
```

---

## 4. Role-Based Access Control (RBAC)

The system defines 7 roles in `src/lib/permissions.ts`:

| Role | Primary Responsibilities & Permitted Actions |
| :--- | :--- |
| **ADMIN** | Full system governance: branches, staff, pricing, catalog, inventory, audit logs, and reports. |
| **MANAGER** | Store operations, inventory adjustments, PO receipts, returns processing, shift rosters, and reports. |
| **CASHIER** | POS terminal checkout, customer lookup, allowed returns processing, own-shift tracking. |
| **STOCK_CLERK**| Stock counts, inventory adjustments, purchase order receiving, and batch expiration tracking. |
| **CATALOG_MANAGER** | Categories, suppliers, product definitions, and price changes with audit reasoning. |
| **MARKETING** | Customer loyalty tier rules, promotional discount campaigns, and coupon lifecycle. |
| **HR** | Employee records, salary administration, branch assignments, and shift scheduling. |

---

## 5. Core Modules & Capabilities

### 5.1 Point-of-Sale (POS) & Checkout
- **Location:** `src/app/pos/page.tsx`, `src/app/api/pos/`
- **Features:**
  - Barcode scanning and product name search.
  - Real-time branch stock level validation.
  - Customer loyalty redemption ($5 discount per 100 points, multiplier by tier).
  - Promo campaign and single-use coupon verification.
  - Multi-tender payment support: `CASH`, `CARD`, `MOBILE`, `POINTS`.
  - Transaction-safe checkout (`api/pos/checkout/route.ts`) executing with `SELECT ... FOR UPDATE`, inventory stock decrement, batch deductions, and receipt generation.

### 5.2 Inventory & Batch Expiry Tracking
- **Location:** `src/app/inventory/`, `src/app/api/inventory/`
- **Features:**
  - Per-branch inventory tracking (`quantity_on_hand`, `reserved_qty`, `reorder_level`).
  - Batch tracking with expiry dates and dynamic health indicators: `GOOD`, `NEAR_EXPIRY` (within 30 days), and `EXPIRED`.
  - Stock alerts for low stock and depleted items.
  - Reorder recommendations based on stock thresholds.
  - Visual inventory dashboard (`/inventory/dashboard`).

### 5.3 Purchasing & Supply Chain
- **Location:** `src/app/purchases/`, `src/app/suppliers/`, `src/app/api/purchases/`
- **Features:**
  - Supplier management with vendor codes and contact details.
  - Purchase order creation and status lifecycle: `PENDING` $\rightarrow$ `ORDERED` $\rightarrow$ `RECEIVED` $\rightarrow$ `CANCELLED`.
  - Order receiving pipeline: increments branch stock, automatically produces tracking batch numbers (`BATCH-<PO_NUM>-<ITEM_ID>`), applies default 60-day expiry dates, and updates order status.

### 5.4 Product Catalog & Pricing
- **Location:** `src/app/products/`, `src/app/categories/`, `src/app/api/products/`
- **Features:**
  - Product catalog with unique barcode constraints, brand attributes, category mapping, unit pricing, cost pricing, and tax rates.
  - Hierarchical category structure with parent-child relationships and product count aggregates.
  - Historical price audit log (`product_price_history`) capturing previous price, new price, modifier employee ID, timestamp, and justification.

### 5.5 Customer Loyalty & CRM
- **Location:** `src/app/customers/`, `src/app/promotions/`, `src/app/api/customers/`
- **Features:**
  - Customer profile tracking with membership card numbers and contact records.
  - 4-Tier loyalty progression: `BRONZE`, `SILVER`, `GOLD`, `PLATINUM`.
  - Immutable loyalty transaction history (`EARNED`, `REDEEMED`, `EXPIRED`, `ADJUSTED`).
  - Campaign promotions (percent discounts by product or category) and unique single-use promotional coupons (`is_used`, `used_at`).

### 5.6 Staff Operations & Shift Rostering
- **Location:** `src/app/employees/`, `src/app/shifts/`, `src/app/branches/`
- **Features:**
  - Staff management with role designations, branch assignments, hire dates, and compensation details.
  - Shift scheduling roster with real-time status progression (`SCHEDULED` $\rightarrow$ `PRESENT` $\rightarrow$ `ABSENT` $\rightarrow$ `COMPLETED`) and clock-in/clock-out capture.
  - Multi-branch administration tracking city, region, manager in charge, and operating status.

### 5.7 Returns & Refunds
- **Location:** `src/app/returns/`, `src/app/api/returns/`
- **Features:**
  - Line-item returns linked to original sales receipts.
  - Return reason capture, refund amount validation, and automated inventory restocking.
  - Audit logs recorded for all return transactions.

### 5.8 Audit Trail & System Diagnostics
- **Location:** `src/app/audit/`, `src/app/api/audit/`
- **Features:**
  - Centralized database audit log (`audit_log`) recording table name, record ID, action (`INSERT`, `UPDATE`, `DELETE`), previous and new state JSON deltas, timestamp, and actor.
  - Error logging table (`error_log`) storing code exceptions, message strings, and stack traces.

### 5.9 Reports & Analytics
- **Location:** `src/app/reports/`, `src/app/dashboard/`, `src/app/api/reports/`
- **Features:**
  - Powered directly by database views for high performance:
    - `daily_sales_vw`: Daily revenue, orders, discounts, taxes, and average order value.
    - `branch_sales_vw`: Comparative sales volumes and gross margins by store location.
    - `cashier_sales_vw`: Staff productivity metrics and transaction counts.
    - `payment_summary_vw`: Aggregated tender distributions across cash, card, mobile, and points.
    - `return_report_vw`: Item return frequencies and total refunded value.

---

## 6. Database Entity Relationships

| Domain | Tables | Description |
| :--- | :--- | :--- |
| **Organization** | `branches`, `employees`, `shifts` | Core organizational hierarchy, branches, employees, and work schedules. |
| **Catalog** | `categories`, `suppliers`, `products`, `product_price_history` | Merchandising, vendor relationships, product definitions, and price revision audits. |
| **Inventory** | `inventory`, `product_batches`, `purchase_orders`, `purchase_order_items` | Warehouse/store inventory, FIFO batch expiries, and supplier purchase orders. |
| **Sales** | `sales`, `sale_items`, `payments`, `returns` | POS receipts, line-item transactions, multi-method payments, and return processing. |
| **Customers** | `customers`, `loyalty_transactions`, `promotions`, `coupons` | Loyalty CRM, reward point ledgers, promotional campaigns, and discount vouchers. |
| **System** | `audit_log`, `error_log` | Diagnostic telemetry, data integrity history, and application exception tracking. |

---

## 7. Directory Layout

```
supermarket-app/
├── src/
│   ├── app/                    # Next.js App Router (Pages & API Route Handlers)
│   │   ├── api/                # REST endpoints (pos, sales, inventory, purchases, etc.)
│   │   ├── audit/              # Audit trail and error log viewer
│   │   ├── branches/           # Store branch administration
│   │   ├── categories/         # Product category hierarchy
│   │   ├── customers/          # Customer loyalty and CRM profiles
│   │   ├── dashboard/          # Executive operations dashboard
│   │   ├── employees/          # Staff and role management
│   │   ├── inventory/          # Stock levels, batches, alerts, and suggestions
│   │   ├── pos/                # POS checkout terminal
│   │   ├── products/           # Catalog management and price history
│   │   ├── promotions/         # Promotional campaigns and coupons
│   │   ├── purchases/          # Purchase order creation and receiving
│   │   ├── reports/            # Analytical reports powered by SQL views
│   │   ├── returns/            # Return and refund workflows
│   │   ├── sales/              # Sales history and receipt inspection
│   │   ├── settings/           # System settings
│   │   └── shifts/             # Employee shift scheduling and clock-in/out
│   ├── components/             # Reusable UI, Layout, and Dashboard views
│   │   ├── dashboard/          # Metric cards, sales charts, inventory overview
│   │   ├── layout/             # Top Header (branch/role switchers) and Navigation Sidebar
│   │   └── ui/                 # Toast notifications and modal overlays
│   └── lib/                    # Core application libraries
│       ├── db.ts               # MySQL connection pool configuration
│       ├── context.tsx         # Global client-side application context
│       ├── permissions.ts      # RBAC permission matrix and access guards
│       └── types.ts            # TypeScript data models and interfaces
├── scripts/                    # Schema inspection and database verification utilities
├── package.json                # Project dependencies and script runner
└── tsconfig.json               # TypeScript configuration
```
