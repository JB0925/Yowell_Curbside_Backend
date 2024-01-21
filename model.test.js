process.env.NODE_ENV = "test";
process.env.USE_CI = "true";
const app = require("./index");
const db = require("./db");
const request = require("supertest");
const Student = require("./model");
const LRU = require("lru-cache");
const cache = new LRU({
  max: 20,
});
cache.set("allStudents", {});

beforeAll(async () => {
  await db.query(
    `CREATE TABLE IF NOT EXISTS students (
     number VARCHAR PRIMARY KEY NOT NULL UNIQUE,
     name VARCHAR(50) NOT NULL,
     isloaded BOOLEAN DEFAULT false,
     time VARCHAR,
     added BOOLEAN DEFAULT false
    )`
  );

  await db.query(
    `CREATE TABLE IF NOT EXISTS temp_students (
     name VARCHAR(50) NOT NULL,
     number VARCHAR NOT NULL,
     isloaded BOOLEAN DEFAULT false,
     time VARCHAR,
     added BOOLEAN DEFAULT false    
    )`
  );
});

beforeEach(async () => {
  await db.query(
    `INSERT INTO students
     (number, name)
     VALUES
     ('1', 'Joe'),
     ('2', 'Tim'),
     ('3', 'Sarah'),
     ('4', 'Mary'),
     ('5', 'Mark')`
  );
});

afterEach(async () => {
  await db.query("DELETE FROM students");
  await db.query("DELETE from temp_students");
});

describe("testing the model to remove students who have no number", () => {
  it("sets isloaded to false for a student with no number from the temporary students table", async () => {
    const result = await db.query(
      `INSERT INTO temp_students
       (name, number, time, isloaded)
       VALUES
       ($1, $2, $3, $4)
       RETURNING name, time, isloaded`,
      ["joe", "627", "167856788654", true]
    );

    await Student.removeStudentWithNoNumber("joe");
    const newResult = await db.query(
      `SELECT *
       FROM temp_students
       WHERE name = $1`,
      ["joe"]
    );

    expect(newResult.rows[0].added).toBe(true);
    expect(newResult.rows[0].time).toBeNull();
    expect(newResult.rows[0].isloaded).toBe(false);
  });
});

describe("testing the model to remove students who have no number, but have a temp number before their name", () => {
  it("sets isloaded to false for a student with a temp number from the temporary students table", async () => {
    const result = await db.query(
      `INSERT INTO temp_students
       (name, number, time, isloaded)
       VALUES
       ($1, $2, $3, $4)
       RETURNING name, time, isloaded`,
      ["jason", "789", "167856788655", true]
    );

    await Student.removeStudentWithNoNumber("#522: jason");
    const newResult = await db.query(
      `SELECT *
       FROM temp_students
       WHERE name = $1`,
      ["jason"]
    );

    expect(newResult.rows[0].added).toBe(true);
    expect(newResult.rows[0].time).toBeNull();
    expect(newResult.rows[0].isloaded).toBe(false);
  });
});

describe("testing the model to remove a student that accidentally has two numbers", () => {
  it("sets isloaded to false for a student with two numbers", async () => {
    const result = await db.query(
      `INSERT INTO students
       (number, name, time, isloaded)
       VALUES
       ($1, $2, $3, $4)
       RETURNING name, time, isloaded`,
      ["265", "Justice Puller", "167856788655", true]
    );

    const result2 = await db.query(
      `INSERT INTO students
       (number, name, time, isloaded)
       VALUES
       ($1, $2, $3, $4)
       RETURNING name, time, isloaded`,
      ["160", "Justice Puller", "167856788656", true]
    );

    await Student.changeLoadedStatusToFalse("265");
    const newResult = await db.query(
      `SELECT *
       FROM students
       WHERE name = $1`,
      ["Justice Puller"]
    );

    expect(newResult.rows.length).toBe(2);
    expect(newResult.rows[0].time).toBeNull();
    expect(newResult.rows[0].isloaded).toBe(false);
    expect(newResult.rows[1].time).toBeNull();
    expect(newResult.rows[1].isloaded).toBe(false);
  });
});

describe("testing combining names", () => {
  it("combines names when there are two students being picked up at the same time", async () => {
    arr = [
      { info: "#1: xyz", time: "167856788654" },
      { info: "#2: abc", time: "167856788654" },
      { info: "#3: def", time: "167856788655" },
    ];

    const result = Student.combineNames(arr);
    console.log("RESULT", result);
    expect(result[0].info).toBe("#1: xyz  #2: abc");
    expect(result[2].info).toBe("#3: def");
  });
});

describe("testing the model to get a student's number using their name as a lookup", () => {
  it("returns a student's number given a name that is in the database", async () => {
    const result = await Student.getStudentByName("Joe");
    expect(result).toBe("#1: Joe");
  });

  it("throws an error if trying to lookup a student who is not in the database", async () => {
    try {
      await Student.getStudentByName("Aaron");
    } catch (error) {
      expect(error.message).toBe("No student matches this query.");
    }
  });
});

describe("testing that when multiple students are added together, a space is inserted between them.", () => {
  it("puts a space between names when multiple students are added", async () => {
    const numbers = ["1", "2", "3"];
    const studentName = await Student.getMultipleStudentsByNumber(
      numbers,
      cache
    );
    expect(studentName).toBe("#1: Joe, #2: Tim, #3: Sarah");
  });
});
