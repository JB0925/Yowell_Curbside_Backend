DROP DATABASE IF EXISTS curbside_test;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS temp_students;

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
  number VARCHAR NOT NULL,
  isloaded BOOLEAN DEFAULT false,
  time VARCHAR,
  added BOOLEAN DEFAULT false    
)

ALTER TABLE temp_students ADD COLUMN number VARCHAR NOT NULL;