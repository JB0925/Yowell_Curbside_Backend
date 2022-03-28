process.env.NODE_ENV = "test";
const app = require("./index");
const db = require("./db");
const request = require("supertest");
const Student = require("./model");

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

afterAll(async () => {
  await db.end();
});

describe("testing the model to remove students who have no number", () => {
  it("sets isloaded to false for a student with no number from the temporary students table", async () => {
    const result = await db.query(
      `INSERT INTO temp_students
       (name, time, isloaded)
       VALUES
       ($1, $2, $3)
       RETURNING name, time, isloaded`,
      ["joe", "167856788654", true]
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
