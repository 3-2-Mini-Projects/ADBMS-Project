import mysql from 'mysql2/promise';
import fs from 'fs';

// simple .env.local parser
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
  console.log('Connecting to:', env.DB_HOST, env.DB_PORT, env.DB_NAME);
  try {
    const connection = await mysql.createConnection({
      host: env.DB_HOST,
      port: Number(env.DB_PORT ?? 3306),
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      ssl: { rejectUnauthorized: false }
    });
    console.log('Connected successfully!');
    const [tables] = await connection.query('SHOW FULL TABLES');
    console.log('Tables in DB:');
    console.table(tables);
    
    // Check some row counts
    for (const row of tables) {
      const tableName = Object.values(row)[0];
      try {
        const [cnt] = await connection.query(`SELECT COUNT(*) as c FROM \`${tableName}\``);
        console.log(`Table ${tableName}: ${cnt[0].c} rows`);
      } catch (err) {
        console.log(`Table ${tableName}: error querying (${err.message})`);
      }
    }
    
    await connection.end();
  } catch (err) {
    console.error('Connection failed:', err);
  }
}

main();
