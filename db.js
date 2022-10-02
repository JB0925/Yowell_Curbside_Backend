"use strict";
/** Database setup for the Yowell Curbside App. */
require("dotenv").config();

// const { Client } = require("pg");
const { Pool } = require("pg");
const { getDatabaseUri } = process.env.DATABASE_URL || require("./config");
let db;

// if (process.env.NODE_ENV === "production") {
//   db = new Client({
//     connectionString: process.env.DATABASE_URL || getDatabaseUri(),
//     ssl: {
//       rejectUnauthorized: false,
//     },
//   });
// } else {
//   db = new Client({
//     connectionString: getDatabaseUri(),
//   });
// }
if (process.env.NODE_ENV === "production") {
  db = new Pool({
    connectionString: process.env.DATABASE_URL || getDatabaseUri(),
    max: 20,
    connectionTimeoutMillis: 0,
    idleTimeoutMillis: 0,
    ssl: {
      rejectUnauthorized: false,
    },
  });
} else {
  db = new Pool({
    connectionString: getDatabaseUri(),
    max: 20,
    connectionTimeoutMillis: 0,
    idleTimeoutMillis: 0,
  });
}

db.connect();

module.exports = db;
