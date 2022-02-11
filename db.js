"use strict";
/** Database setup for the Guitar App. */
require("dotenv").config();

const { Client } = require("pg");
const { getDatabaseUri } = process.env.DATABASE_URL || require("./config");

let db;

if (process.env.NODE_ENV === "production") {
  db = new Client({
    connectionString: process.env.DATABASE_URL || getDatabaseUri(),
    ssl: {
      rejectUnauthorized: false,
    },
  });
} else {
  db = new Client({
    connectionString: getDatabaseUri(),
  });
}

db.connect();

module.exports = db;
