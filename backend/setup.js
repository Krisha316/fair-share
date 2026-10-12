// npm run setup  -> creates database + tables
// npm run reset  -> deletes the database first, then creates it fresh
const fs = require("fs");
const mysql = require("mysql2/promise");
const { config } = require("./db");

async function main() {
  const { database, ...connection } = config;
  const conn = await mysql.createConnection({ ...connection, multipleStatements: true });
  if (process.argv[2] === "reset") {
    await conn.query(`DROP DATABASE IF EXISTS \`${database}\``);
  }
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
  await conn.query(`USE \`${database}\``);
  await conn.query(fs.readFileSync(__dirname + "/schema.sql", "utf8"));
  await conn.end();
  console.log(`Database "${database}" is ready.`);
}

main().catch((err) => {
  console.error("Setup failed:", err.message);
  process.exit(1);
});