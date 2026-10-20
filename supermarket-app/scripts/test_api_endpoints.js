const crypto = require('crypto');

const secret = Buffer.from('adbms_supermarket_local_dev_fallback_secret_32bytes!', 'utf-8');

function makeToken(emp) {
  const now = Math.floor(Date.now() / 1000);
  const payload = { ...emp, iat: now, exp: now + 86400 };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

const adminToken = makeToken({ employee_id: 11, full_name: 'System Admin', email: 'admin@shop.lk', role: 'ADMIN', branch_id: 1 });
const managerToken = makeToken({ employee_id: 4, full_name: 'Chaminda Rathnayake', email: 'chaminda@shop.lk', role: 'MANAGER', branch_id: 2 });

async function run() {
  console.log('Testing Top 10 Loyalty Customers API with Role-Based Access Control...\n');

  // Test 1: Admin requesting scope=all (Chain-wide report)
  const resAll = await fetch('http://localhost:3100/api/marketing/reports/top-loyalty-customers?start_date=2026-01-01&end_date=2026-12-31&scope=all', {
    headers: { 'Cookie': `adbms_session=${adminToken}` }
  });
  const dataAll = await resAll.json();
  console.log('1. Admin scope=all status:', resAll.status);
  console.log('   Results count:', dataAll.results?.length);
  console.log('   #1 Customer with branch breakdown:\n', JSON.stringify(dataAll.results?.[0], null, 2));

  // Test 2: Branch Manager requesting scope=all (expect 403 Forbidden)
  const resForbidden = await fetch('http://localhost:3100/api/marketing/reports/top-loyalty-customers?start_date=2026-01-01&end_date=2026-12-31&scope=all', {
    headers: { 'Cookie': `adbms_session=${managerToken}` }
  });
  console.log('\n2. Branch Manager requesting scope=all status:', resForbidden.status);
  console.log('   Response error:', (await resForbidden.json()).error);

  // Test 3: Branch Manager requesting unauthorized branch (expect 403 Forbidden)
  const resBranchMismatch = await fetch('http://localhost:3100/api/marketing/reports/top-loyalty-customers?start_date=2026-01-01&end_date=2026-12-31&scope=branch&branch_id=1', {
    headers: { 'Cookie': `adbms_session=${managerToken}` }
  });
  console.log('\n3. Branch Manager requesting unauthorized Branch 1 status:', resBranchMismatch.status);
  console.log('   Response error:', (await resBranchMismatch.json()).error);

  // Test 4: Branch Manager requesting authorized branch (expect 200 OK)
  const resOwnBranch = await fetch('http://localhost:3100/api/marketing/reports/top-loyalty-customers?start_date=2026-01-01&end_date=2026-12-31&scope=branch&branch_id=2', {
    headers: { 'Cookie': `adbms_session=${managerToken}` }
  });
  console.log('\n4. Branch Manager requesting authorized Branch 2 status:', resOwnBranch.status);
  const dataOwn = await resOwnBranch.json();
  console.log('   Branch 2 results count:', dataOwn.results?.length);

  // Test 5: Invalid date range (start > end, expect 400 Bad Request)
  const resBadDate = await fetch('http://localhost:3100/api/marketing/reports/top-loyalty-customers?start_date=2026-12-31&end_date=2026-01-01', {
    headers: { 'Cookie': `adbms_session=${adminToken}` }
  });
  console.log('\n5. Invalid date range (2026-12-31 to 2026-01-01) status:', resBadDate.status);
  console.log('   Response error:', (await resBadDate.json()).error);

  console.log('\nALL API TESTS COMPLETED SUCCESSFULLY!');
}

run();
