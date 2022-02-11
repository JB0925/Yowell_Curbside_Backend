const db = require("./db");

class Student {
  static async getStudent(number) {
    number = number.toString();
    const result = await db.query(
      `SELECT number, name
       FROM students
       WHERE number = $1`,
      [number]
    );

    if (!result.rows.length) {
      return "Student not found";
    }

    const { name } = result.rows[0];
    return `#${number}: ${name}`;
  }

  static async addStudent(number, name) {
    if (!number || !name) {
      throw new Error("You must provide a name and number");
    }

    const duplicateCheck = await db.query(
      `SELECT number, name
       FROM students
       WHERE number = $1`,
      [number]
    );

    if (duplicateCheck.rows.length) {
      throw new Error("A student exists with this number.");
    }

    const result = await db.query(
      `INSERT INTO students
       (number, name)
       VALUES
       ($1, $2)
       RETURNING number, name`,
      [number, name]
    );

    return result.rows[0];
  }
}

module.exports = Student;
