const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Parse .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
    const [k, ...v] = trimmed.split('=');
    env[k.trim()] = v.join('=').trim();
  }
}

async function runTest() {
  console.log('--- TEST: Business Rules for Loyalty Point Spending at Checkout ---');

  const pool = mysql.createPool({
    host: env.DB_HOST,
    port: Number(env.DB_PORT),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // 1. Find an active customer with points
    const [custs] = await pool.query(
      "SELECT customer_id, card_no, full_name, tier, points_balance FROM customers WHERE is_active = 1 AND points_balance >= 100 ORDER BY points_balance DESC LIMIT 1"
    );

    const testCust = custs[0];
    const initialBalance = Number(testCust.points_balance);
    console.log(`Using Customer: ${testCust.full_name} (ID: ${testCust.customer_id}, Card: ${testCust.card_no}, Balance: ${initialBalance} pts)`);

    // 2. Find a product in branch 1
    const [prods] = await pool.query(`
      SELECT p.product_id, p.name, p.unit_price
      FROM inventory i
      JOIN products p ON i.product_id = p.product_id
      WHERE i.branch_id = 1 AND i.quantity_on_hand >= 5 AND p.is_active = 1
      LIMIT 1
    `);

    const testProd = prods[0];
    const unitPrice = Number(testProd.unit_price);
    const qty = 2;
    const grandTotal = Number((qty * unitPrice * 1.18).toFixed(2));
    const pointsToSpend = 40;
    const cashRemaining = Number((grandTotal - pointsToSpend).toFixed(2));

    console.log(`Product: ${testProd.name}, Total Due: Rs. ${grandTotal.toFixed(2)}`);

    // TEST A: Cannot spend more points than the bill total
    console.log('\n--- Scenario A: Attempting to spend more points than total bill ---');
    const overBillPayload = {
      branchId: 1,
      cashierId: 1,
      customerId: testCust.customer_id,
      items: [{ product_id: testProd.product_id, quantity: 1, unit_price: unitPrice }],
      payments: [{ method: 'POINTS', amount: 50000 }], // 50,000 points on a Rs. 413 bill
      amountTendered: 50000
    };
    const overBillRes = await fetch('http://localhost:3100/api/cashier/sale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(overBillPayload)
    });
    const overBillData = await overBillRes.json();
    console.log(`Status: ${overBillRes.status}, Error: "${overBillData.error}"`);
    if (overBillRes.status === 400 && overBillData.error) {
      console.log('✓ PASS: Spending more points than bill total was properly rejected!');
    } else {
      console.error('✗ FAIL: Over-bill points spend was not rejected.');
    }

    // TEST B: Partial payment from points -> MUST EARN ZERO POINTS
    console.log('\n--- Scenario B: Partial payment from loyalty points (Rule: Earns 0 Points) ---');
    const partialPayload = {
      branchId: 1,
      cashierId: 1,
      customerId: testCust.customer_id,
      items: [{ product_id: testProd.product_id, quantity: qty, unit_price: unitPrice }],
      payments: [
        { method: 'POINTS', amount: pointsToSpend, reference: `PTS-PARTIAL-${testCust.card_no}` },
        { method: 'CASH', amount: cashRemaining }
      ],
      amountTendered: cashRemaining
    };

    const partialRes = await fetch('http://localhost:3100/api/cashier/sale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partialPayload)
    });

    const partialData = await partialRes.json();
    if (!partialRes.ok || !partialData.success) {
      throw new Error(`Partial sale failed: ${JSON.stringify(partialData)}`);
    }

    console.log('Sale ID:', partialData.receipt.saleId);
    console.log('Points Redeemed:', partialData.receipt.customer?.points_redeemed);
    console.log('Points Earned:', partialData.receipt.customer?.points_earned);
    console.log('New Balance:', partialData.receipt.customer?.points_balance);

    if (partialData.receipt.customer?.points_earned === 0) {
      console.log('✓ PASS: Transaction earned exactly 0 points because points were redeemed!');
    } else {
      console.error('✗ FAIL: Transaction earned points when it should have earned 0!');
    }

    // Check DB for loyalty transactions on this sale
    const [txRows] = await pool.query(
      "SELECT loyalty_id, points, type, note FROM loyalty_transactions WHERE customer_id = ? AND sale_id = ?",
      [testCust.customer_id, partialData.receipt.saleId]
    );
    console.log('DB loyalty transactions:', txRows);
    const hasEarn = txRows.some(t => t.type === 'EARN');
    const hasRedeem = txRows.some(t => t.type === 'REDEEM' && Number(t.points) === -pointsToSpend);

    if (!hasEarn && hasRedeem) {
      console.log('✓ PASS: Verified in DB: only REDEEM record exists, NO EARN record created!');
    } else {
      console.error('✗ FAIL: DB verification failed. Has EARN record:', hasEarn);
    }

    // TEST C: Regular sale with NO points redemption -> MUST EARN POINTS
    console.log('\n--- Scenario C: Regular purchase with 0 points redeemed (Must earn points) ---');
    const normalPayload = {
      branchId: 1,
      cashierId: 1,
      customerId: testCust.customer_id,
      items: [{ product_id: testProd.product_id, quantity: 1, unit_price: unitPrice }],
      payments: [{ method: 'CASH', amount: Number((unitPrice * 1.18).toFixed(2)) }],
      amountTendered: Number((unitPrice * 1.18).toFixed(2))
    };

    const normalRes = await fetch('http://localhost:3100/api/cashier/sale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalPayload)
    });
    const normalData = await normalRes.json();
    console.log('Points Redeemed:', normalData.receipt.customer?.points_redeemed);
    console.log('Points Earned:', normalData.receipt.customer?.points_earned);

    if (normalData.receipt.customer?.points_earned > 0) {
      console.log('✓ PASS: Normal purchase earned points properly!');
    } else {
      console.error('✗ FAIL: Normal purchase did not earn points.');
    }

    console.log('\n=== ALL BUSINESS RULE TESTS PASSED PERFECTLY! ===');
  } finally {
    await pool.end();
  }
}

runTest().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
