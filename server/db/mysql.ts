import mysql from "mysql2/promise";

const MYSQL_HOST = process.env.MYSQL_HOST || "localhost";
const MYSQL_PORT = Number(process.env.MYSQL_PORT || 3306);
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || "";
const MYSQL_USER = process.env.MYSQL_USER || "";
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || "";

// Create a singleton pool for MySQL
export const mysqlPool = mysql.createPool({
  host: MYSQL_HOST,
  port: MYSQL_PORT,
  database: MYSQL_DATABASE,
  user: MYSQL_USER,
  password: MYSQL_PASSWORD,
  connectionLimit: 5,
  charset: "utf8mb4",
  supportBigNumbers: true,
});

export async function ensureMysqlConnection(): Promise<void> {
  const conn = await mysqlPool.getConnection();
  try {
    await conn.ping();
  } finally {
    conn.release();
  }
}


