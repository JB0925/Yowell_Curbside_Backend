DROP DATABASE IF EXISTS curbside_test2;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS temp_students;

CREATE DATABASE curbside_test2;

\c curbside_test2

CREATE TABLE IF NOT EXISTS students (
  number VARCHAR PRIMARY KEY NOT NULL UNIQUE,
  name VARCHAR(50) NOT NULL,
  isloaded BOOLEAN DEFAULT false,
  time VARCHAR,
  added BOOLEAN DEFAULT false    
);

CREATE TABLE IF NOT EXISTS temp_students (
  name VARCHAR(50) NOT NULL,
  number VARCHAR NOT NULL,
  isloaded BOOLEAN DEFAULT false,
  time VARCHAR,
  added BOOLEAN DEFAULT false    
);