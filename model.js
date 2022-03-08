const db = require("./db");

class Student {
  static combineNames(arr) {
    let tempUsedNames = [];
    let newStudentGroupings = [];
    for (let i = 0; i < arr.length; i++) {
      let currentStudent = arr[i];
      for (let j = i + 1; j < arr.length; j++) {
        let nextStudent = arr[j];
        if (
          currentStudent.time == nextStudent.time &&
          !tempUsedNames.includes(nextStudent.info)
        ) {
          arr[i].info += nextStudent.info;
          tempUsedNames.push(currentStudent.info);
          tempUsedNames.push(nextStudent.info);
          arr[j] = {};
        }
      }
      newStudentGroupings.push(arr[i]);
    }
    return newStudentGroupings;
  }

  static async getStudentByNumber(number) {
    number = number.toString();

    const result = await db.query(
      `SELECT number, name, added
       FROM students
       WHERE number = $1`,
      [number]
    );

    if (!result.rows.length || result.rows[0].added) {
      return "Student not found";
    }

    await db.query(
      `UPDATE students
       SET added = $1
       WHERE number = $2`,
      [true, number]
    );

    const { name } = result.rows[0];
    return `#${number}: ${name}`;
  }

  static async getMultipleStudentsByNumber(numbers) {
    let student = "";
    for (let number of numbers) {
      student += await this.getStudentByNumber(number);
    }

    return student;
  }

  static async getStudentsByPartiallyMatchedName(partialName) {
    const result = await db.query(
      `SELECT name
       FROM students
       WHERE name ILIKE '%' || $1 || '%'`,
      [partialName]
    );

    if (!result.rows.length) {
      throw new Error("No students match this query");
    }

    return result.rows.map((student) => student.name);
  }

  static async getStudentByName(name) {
    const result = await db.query(
      `SELECT number
       FROM students
       WHERE name = $1`,
      [name]
    );

    if (!result.rows.length) {
      throw new Error("No student matches this query.");
    }

    const { number } = result.rows[0];
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

  static async getLoadedStudents() {
    const result = await db.query(
      `SELECT number, name, time
       FROM students
       WHERE isLoaded = $1`,
      [true]
    );

    if (!result.rows.length) return [];

    let combinedNamesArray = result.rows.map(({ number, name, time }) => ({
      info: `#${number}: ${name}`,
      time,
    }));

    combinedNamesArray = this.combineNames(combinedNamesArray).filter(
      (n) => n.info !== undefined && n.time !== undefined
    );
    combinedNamesArray.sort((a, b) => parseInt(a.time) - parseInt(b.time));

    const numberArray = result.rows.map(({ number }) => number);

    return [combinedNamesArray, numberArray];
  }

  static async changeLoadedStatusOfMultipleToTrue(numbers) {
    for (let number of numbers) {
      await this.changeLoadedStatusToTrue(number);
    }
  }

  static async changeLoadedStatusToTrue(number) {
    const studentExists = await db.query(
      `SELECT number, name, isloaded, added
       FROM students
       WHERE number = $1`,
      [number]
    );

    if (!studentExists.rows.length) {
      throw new Error("No student exists with this number.");
    }

    if (studentExists.rows[0].added) {
      throw new Error("Student has already been added today.");
    }

    let pickupTime = new Date().toString();
    pickupTime = Date.parse(pickupTime);

    await db.query(
      `UPDATE students
       SET isloaded = $1,
       time = $2
       WHERE number = $3`,
      [true, pickupTime, number]
    );

    return "Student's loaded status updated";
  }

  static async changeLoadedStatusToFalse(number) {
    const studentExists = await db.query(
      `SELECT number, name, isloaded
       FROM students
       WHERE number = $1`,
      [number]
    );

    if (!studentExists.rows.length) {
      throw new Error("No student exists with this number.");
    }

    await db.query(
      `UPDATE students
       SET isloaded = $1,
       time = $2
       WHERE number = $3`,
      [false, null, number]
    );

    return "Student's loaded status updated";
  }

  static async changeLoadedStatusOfMultipleToFalse(numbers) {
    for (let number of numbers) {
      await this.changeLoadedStatusToFalse(number);
    }
  }

  static async resetAll() {
    await db.query(
      `UPDATE students
       SET isloaded = $1,
       time = $2,
       added = $3`,
      [false, null, false]
    );
  }
}

module.exports = Student;
