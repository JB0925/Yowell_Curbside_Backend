const { Pool } = require("pg");

const DB_NAME = "curbside_test";

const db = new Pool({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  user: "postgres",
  password: "postgres",
  database: "postgres",
  max: 20,
  connectionTimeoutMillis: 0,
  idleTimeoutMillis: 0,
});

db.connect();

// db.query(
//   `CREATE TABLE IF NOT EXISTS students (
//    number PRIMARY KEY VARCHAR NOT NULL UNIQUE,
//    name VARCHAR(50) NOT NULL,
//    isloaded BOOLEAN DEFAULT false,
//    time VARCHAR,
//    added BOOLEAN DEFAULT false
//   )`
// );

// db.query(
//   `CREATE TABLE IF NOT EXISTS temp_students (
//    name VARCHAR(50) NOT NULL,
//    isloaded BOOLEAN DEFAULT false,
//    time VARCHAR,
//    added BOOLEAN DEFAULT false
//   )`
// );

// async function setupDatabase() {
//   await db.query("CREATE DATABASE IF NOT EXISTS curbside_test");

//   await db.query(
//     `CREATE TABLE IF NOT EXISTS students (
//      number PRIMARY KEY VARCHAR NOT NULL UNIQUE,
//      name VARCHAR(50) NOT NULL,
//      isloaded BOOLEAN DEFAULT false,
//      time VARCHAR,
//      added BOOLEAN DEFAULT false
//     )`
//   );

//   await db.query(
//     `CREATE TABLE IF NOT EXISTS temp_students (
//      name VARCHAR(50) NOT NULL,
//      isloaded BOOLEAN DEFAULT false,
//      time VARCHAR,
//      added BOOLEAN DEFAULT false
//     )`
//   );
// }

// setupDatabase();

module.exports = db;
