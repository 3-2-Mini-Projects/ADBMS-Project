import mysql from 'mysql2/promise';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split(/\r?\n/).forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
});

async function main() {
  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    port: Number(env.DB_PORT ?? 3306),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });

  const tables = [
    'employees', 'branches', 'categories', 'suppliers', 'products',
    'inventory', 'product_batches', 'sales', 'sale_items', 'payments',
    'returns', 'customers', 'promotions', 'coupons', 'shifts', 'audit_log'
  ];

  const schema = {};
  for (const t of tables) {
    try {
      const [cols] = await connection.query(`DESCRIBE \`${t}\``);
      schema[t] = cols.map(c => ({ Field: c.Field, Type: c.Type, Null: c.Null, Key: c.Key, Default: c.Default }));
      
      const [sample] = await connection.query(`SELECT * FROM \`${t}\` LIMIT 2`);
      schema[t + '_sample'] = sample;
    } catch (e) {
      schema[t] = { error: e.message };
    }
  }

  fs.writeFileSync('scripts/schema-dump.json', JSON.stringify(schema, null, 2));
  console.log('Schema dumped successfully to scripts/schema-dump.json');
  await connection.end();
}

main();
