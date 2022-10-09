DROP DATABASE IF EXISTS curbside_test;

CREATE DATABASE curbside_test;

\c curbside_test

CREATE TABLE students (
  number PRIMARY KEY VARCHAR NOT NULL UNIQUE,
  name VARCHAR(50) NOT NULL,
  isloaded BOOLEAN DEFAULT false,
  time VARCHAR,
  added BOOLEAN DEFAULT false    
)

CREATE TABLE temp_students (
  name VARCHAR(50) NOT NULL,
  isloaded BOOLEAN DEFAULT false,
  time VARCHAR,
  added BOOLEAN DEFAULT false    
)