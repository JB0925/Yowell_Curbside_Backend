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

  static async getMultipleStudents(numbers) {
    let student = "";
    for (let number of numbers) {
      student += await this.getStudent(number);
    }

    return student;
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

  static async changeLoadedStatusOfMultiple(numbers) {
    for (let number of numbers) {
      await this.changeLoadedStatus(number);
    }
  }

  static async changeLoadedStatus(number) {
    const studentExists = await db.query(
      `SELECT number, name, isloaded
       FROM students
       WHERE number = $1`,
      [number]
    );

    if (!studentExists.rows.length) {
      throw new Error("No student exists with this number.");
    }

    const currentLoadedStatus = studentExists.rows[0].isloaded;
    let pickupTime;

    if (!currentLoadedStatus) {
      pickupTime = new Date().toString();
      pickupTime = Date.parse(pickupTime);
    } else {
      pickupTime = null;
    }

    await db.query(
      `UPDATE students
       SET isloaded = $1,
       time = $2
       WHERE number = $3`,
      [!currentLoadedStatus, pickupTime, number]
    );

    return "Student's loaded status updated";
  }
}

module.exports = Student;
