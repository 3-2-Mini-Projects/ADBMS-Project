import { NextResponse } from "next/server";
import { withTransaction, query } from "@/lib/db";

interface SaleItemInput {
  product_id: number;
  quantity: number;
  unit_price: number;
  discount_amount?: number;
  tax_rate?: number;
}

interface PaymentInput {
  method: "CASH" | "CARD" | "MOBILE" | "POINTS";
  amount: number;
  reference?: string | null;
}

interface CreateSaleRequest {
  branchId: number;
  cashierId: number;
  customerId?: number | null;
  promoId?: number | null;
  couponId?: number | null;
  items: SaleItemInput[];
  payments: PaymentInput[];
  amountTendered?: number;
}

// In-memory idempotency cache for 30 seconds
const idempotencyMap = new Map<string, any>();

// POST /api/cashier/sale — Process a complete POS checkout atomically
export async function POST(req: Request) {
  try {
    const body: CreateSaleRequest = await req.json();
    const idempotencyKey = req.headers.get("x-idempotency-key");

    if (idempotencyKey && idempotencyMap.has(idempotencyKey)) {
      return NextResponse.json(idempotencyMap.get(idempotencyKey));
    }

    const { branchId, cashierId, customerId, promoId, couponId, items, payments, amountTendered } = body;

    // 1. Validation
    if (!branchId || !cashierId) {
      return NextResponse.json({ error: "Branch ID and Cashier ID are required" }, { status: 400 });
    }
    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Shopping cart cannot be empty" }, { status: 400 });
    }
    if (!payments || payments.length === 0) {
      return NextResponse.json({ error: "At least one payment method is required" }, { status: 400 });
    }

    // 2. Perform checkout inside an atomic database transaction
    const saleResult = await withTransaction(async (conn) => {
      // Step A: Lock and validate inventory for all items
      let calculatedSubtotal = 0;
      let calculatedDiscountTotal = 0;
      let calculatedTaxTotal = 0;

      const validatedItems: Array<{
        product_id: number;
        product_name: string;
        barcode: string;
        quantity: number;
        unit_price: number;
        discount_amount: number;
        tax_rate: number;
        line_total: number;
      }> = [];

      for (const item of items) {
        if (item.quantity <= 0) {
          throw new Error(`Quantity must be greater than zero for product ID ${item.product_id}`);
        }

        // Lock inventory row with FOR UPDATE to prevent race conditions between cashiers
        const [invRows]: any = await conn.query(
          `SELECT i.quantity_on_hand, i.reserved_qty, p.name, p.barcode, p.is_active, p.unit_price, p.tax_rate
           FROM inventory i
           JOIN products p ON i.product_id = p.product_id
           WHERE i.branch_id = ? AND i.product_id = ?
           FOR UPDATE`,
          [branchId, item.product_id]
        );

        if (!invRows || invRows.length === 0) {
          throw new Error(`Product ID ${item.product_id} is not registered in this branch inventory`);
        }

        const inv = invRows[0];

        if (!inv.is_active) {
          throw new Error(`Product "${inv.name}" is marked inactive and cannot be sold`);
        }

        const available = inv.quantity_on_hand - inv.reserved_qty;
        if (available < item.quantity) {
          throw new Error(
            `Insufficient stock for "${inv.name}". Available: ${available}, Requested: ${item.quantity}`
          );
        }

        // Use actual selling unit price at time of sale
        const unitPrice = Number(item.unit_price || inv.unit_price);
        const discountAmt = Math.max(0, Number(item.discount_amount || 0));
        const lineSubtotal = unitPrice * item.quantity;
        const lineTotal = Math.max(0, lineSubtotal - discountAmt);
        const taxRate = Number(inv.tax_rate || item.tax_rate || 0);
        const lineTax = lineTotal * (taxRate / 100);

        calculatedSubtotal += lineSubtotal;
        calculatedDiscountTotal += discountAmt;
        calculatedTaxTotal += lineTax;

        validatedItems.push({
          product_id: item.product_id,
          product_name: inv.name,
          barcode: inv.barcode,
          quantity: item.quantity,
          unit_price: unitPrice,
          discount_amount: discountAmt,
          tax_rate: taxRate,
          line_total: lineTotal,
        });
      }

      // If no item-level taxes were specified, use standard 18% VAT on taxable base
      if (calculatedTaxTotal === 0) {
        const taxableBase = Math.max(0, calculatedSubtotal - calculatedDiscountTotal);
        calculatedTaxTotal = taxableBase * 0.18;
      }

      const calculatedGrandTotal = Number(
        (calculatedSubtotal - calculatedDiscountTotal + calculatedTaxTotal).toFixed(2)
      );

      // Step B: Validate payments sum matches or covers total
      const totalPayments = payments.reduce((acc, p) => acc + Number(p.amount), 0);
      const isCashPayment = payments.some((p) => p.method === "CASH");
      const effectiveTendered = amountTendered ? Number(amountTendered) : totalPayments;

      if (effectiveTendered < calculatedGrandTotal - 0.05) {
        throw new Error(
          `Total payment (Rs. ${effectiveTendered.toFixed(2)}) is less than total amount due (Rs. ${calculatedGrandTotal.toFixed(2)})`
        );
      }

      const changeDue = isCashPayment && effectiveTendered > calculatedGrandTotal
        ? Number((effectiveTendered - calculatedGrandTotal).toFixed(2))
        : 0;

      // Step C: Create the sale record
      const [saleInsertResult]: any = await conn.query(
        `INSERT INTO sales (
          branch_id, cashier_id, customer_id, promo_id, coupon_id,
          sale_date, status, subtotal, discount_total, tax_total, total_amount
        ) VALUES (?, ?, ?, ?, ?, NOW(), 'COMPLETED', ?, ?, ?, ?)`,
        [
          branchId,
          cashierId,
          customerId || null,
          promoId || null,
          couponId || null,
          calculatedSubtotal.toFixed(2),
          calculatedDiscountTotal.toFixed(2),
          calculatedTaxTotal.toFixed(2),
          calculatedGrandTotal.toFixed(2),
        ]
      );

      const saleId = saleInsertResult.insertId;

      // Step D: Insert sale_items and decrement branch inventory
      for (const item of validatedItems) {
        await conn.query(
          `INSERT INTO sale_items (
            sale_id, product_id, quantity, unit_price, discount_amount, line_total
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            saleId,
            item.product_id,
            item.quantity,
            item.unit_price.toFixed(2),
            item.discount_amount.toFixed(2),
            item.line_total.toFixed(2),
          ]
        );

        // Deduct inventory
        await conn.query(
          `UPDATE inventory 
           SET quantity_on_hand = quantity_on_hand - ? 
           WHERE branch_id = ? AND product_id = ?`,
          [item.quantity, branchId, item.product_id]
        );
      }

      // Step E: Insert payment records
      for (const pay of payments) {
        await conn.query(
          `INSERT INTO payments (
            sale_id, method, amount, reference, paid_at
          ) VALUES (?, ?, ?, ?, NOW())`,
          [
            saleId,
            pay.method,
            Number(pay.amount).toFixed(2),
            pay.reference || null,
          ]
        );
      }

      return {
        saleId,
        subtotal: calculatedSubtotal,
        discountTotal: calculatedDiscountTotal,
        taxTotal: calculatedTaxTotal,
        totalAmount: calculatedGrandTotal,
        amountTendered: effectiveTendered,
        changeDue,
        items: validatedItems,
        payments,
      };
    });

    // 3. Fetch enriched receipt information
    const [branchInfo]: any = await query(
      `SELECT branch_id, branch_code, name, address, phone, city FROM branches WHERE branch_id = ?`,
      [branchId]
    );
    const [cashierInfo]: any = await query(
      `SELECT employee_id, full_name, email FROM employees WHERE employee_id = ?`,
      [cashierId]
    );
    let customerInfo = null;
    if (customerId) {
      const [cust]: any = await query(
        `SELECT customer_id, card_no, full_name, phone, tier, points_balance FROM customers WHERE customer_id = ?`,
        [customerId]
      );
      customerInfo = cust || null;
    }

    const receiptNumber = `REC-${branchInfo?.branch_code || "BR"}-${String(saleResult.saleId).padStart(6, "0")}`;

    const receipt = {
      saleId: saleResult.saleId,
      receiptNumber,
      saleDate: new Date().toISOString(),
      branch: branchInfo,
      cashier: cashierInfo,
      customer: customerInfo,
      items: saleResult.items,
      subtotal: saleResult.subtotal,
      discountTotal: saleResult.discountTotal,
      taxTotal: saleResult.taxTotal,
      totalAmount: saleResult.totalAmount,
      amountTendered: saleResult.amountTendered,
      changeDue: saleResult.changeDue,
      payments: saleResult.payments,
    };

    if (idempotencyKey) {
      idempotencyMap.set(idempotencyKey, receipt);
      setTimeout(() => idempotencyMap.delete(idempotencyKey), 30000);
    }

    return NextResponse.json({
      success: true,
      receipt,
    });
  } catch (error: any) {
    console.error("Sale processing error:", error);
    return NextResponse.json({ error: error.message || "Failed to process sale" }, { status: 400 });
  }
}
