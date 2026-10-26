import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env.local");

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        const value = trimmed.substring(idx + 1).trim();
        process.env[key] = value;
      }
    }
  });
}

async function testAdmin() {
  console.log("DB_HOST:", process.env.DB_HOST);
  console.log("DB_PORT:", process.env.DB_PORT);
  console.log("DB_ADMIN_PASS:", process.env.DB_ADMIN_PASS);

  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      database: process.env.DB_NAME || "supermarket_ADBMS",
      user: "admin_user",
      password: process.env.DB_ADMIN_PASS,
      ssl: { rejectUnauthorized: false },
    });
    console.log("Connected successfully as admin_user!");
    const [rows] = await conn.query("SELECT CURRENT_USER(), CURRENT_ROLE()");
    console.log("User & Role:", rows);
    await conn.end();
  } catch (err) {
    console.error("Connection error:", err);
  }
}

testAdmin();
