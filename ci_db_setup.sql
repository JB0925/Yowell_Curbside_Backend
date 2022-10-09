DROP DATABASE IF EXISTS curbside_test;

CREATE DATABASE curbside_test;

\c curbside_test

CREATE TABLE IF NOT EXISTS students (
  number VARCHAR PRIMARY KEY NOT NULL UNIQUE,
  name VARCHAR(50) NOT NULL,
  isloaded BOOLEAN DEFAULT false,
  time VARCHAR,
  added BOOLEAN DEFAULT false    
)

CREATE TABLE IF NOT EXISTS temp_students (
  name VARCHAR(50) NOT NULL,
  isloaded BOOLEAN DEFAULT false,
  time VARCHAR,
  added BOOLEAN DEFAULT false    
)