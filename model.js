const db = require("./db");
const { BadRequestError, ConflictError } = require("./expressError");
const logger = require("./logger");

class Student {
  /**
   * This function is needed because, if a page gets
   * refreshed by the client, we need to send a list of students
   * who have been added for the day. The student list needs:
   * 1). To be correctly ordered by time entered.
   * 2). To be grouped by all students who were entered at the same time.
   * 3). Idempotent in the sense that, if you refresh the page ten times
   *  and nothing else has changed in between, it needs to return the same
   *  results each time.
   *
   * @param {array of objects} arr
   * @returns an array of objects of students who are currently in the
   * queue to be picked up.
   */
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
          // add the student who should be with them and
          // order them by number.
          arr[i].info += ` ${nextStudent.info}`;
          arr[i].info =
            "#" +
            arr[i].info
              .split("#")
              .sort((a, b) => parseInt(a) - parseInt(b))
              .filter((name) => name !== "" && name !== "undefined")
              .join(" #");

          tempUsedNames.push(currentStudent.info);
          tempUsedNames.push(nextStudent.info);
          arr[j] = {};
        }
      }
      newStudentGroupings.push(arr[i]);
    }
    return newStudentGroupings;
  }

  static async getStudentData(number) {
    number = number.toString();

    const result = await db.query(
      `SELECT number, name
       FROM students
       WHERE number = $1`,
      [number]
    );

    if (!result.rows.length) {
      throw new BadRequestError("No students match this query.");
    }

    return true;
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
      throw new BadRequestError("No students match this query", 400);
    }

    let nameArray = result.rows.map((student) => student.name);
    const x = nameArray.filter((n) =>
      n
        .split(" ")
        .some(
          (b) =>
            b.toLowerCase().startsWith(partialName.toLowerCase()) &&
            (b.indexOf(".") === -1 || b.length > 2)
        )
    );
    return x;
  }

  static async getStudentByName(name) {
    const result = await db.query(
      `SELECT number
       FROM students
       WHERE name = $1`,
      [name]
    );

    if (!result.rows.length) {
      throw new BadRequestError("No student matches this query.", 400);
    }

    const { number } = result.rows[0];
    return `#${number}: ${name}`;
  }

  static async addStudent(number, name) {
    if (!number || !name) {
      throw new BadRequestError("You must provide a name and number");
    }

    const duplicateCheck = await db.query(
      `SELECT number, name
       FROM students
       WHERE number = $1`,
      [number]
    );

    if (duplicateCheck.rows.length) {
      throw new ConflictError("A student exists with this number.");
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
    // Get all students in the queue from both the regular
    // database and the temporary, "just for today" database.
    const result = await db.query(
      `SELECT number, name, time
       FROM students
       WHERE isLoaded = $1`,
      [true]
    );

    const temp_students_result = await db.query(
      `SELECT name, time
       FROM temp_students
       WHERE isloaded = $1`,
      [true]
    );

    // If there aren't any students loaded from
    // either the regular DB or the one for students
    // for the day, return an empty array.
    if (!result.rows.length) {
      if (!temp_students_result.rows.length) {
        return [];
      }
    }

    // If there are students in the queue from the temp DB,
    // assign them a random number between 500 - 999. This number
    // does not matter and is only used on the frontend so that a separate
    // case is not created when trying to remove students. The number can
    // and will change, and that is ok.
    if (temp_students_result.rows) {
      const randomNum = (min, max) =>
        Math.floor(Math.random() * (max - min)) + min;
      temp_students_result.rows.forEach(
        (t) => (t.number = randomNum(500, 1000))
      );
    }
    const newArr = result.rows.concat(temp_students_result.rows);

    // Merge the two arrays together, making sure to add the info
    // for those students in the temp DB as well.
    let combinedNamesArray = newArr.map(({ number, name, time }) => ({
      info: `#${number}: ${name}`,
      time,
    }));

    // Take all students who are currently loaded in the queue and place
    // them with the other students they are supposed to go with, if any
    // at all. Finally, sort each of those groups by the time they were
    // entered into the system.
    combinedNamesArray = this.combineNames(combinedNamesArray).filter(
      (n) => n.info !== undefined && n.time !== undefined
    );
    combinedNamesArray.sort((a, b) => parseInt(a.time) - parseInt(b.time));

    // We return all of the used numbers, too, so that on the client side,
    // they can return early if a number has been entered that has already
    // been used for the day.
    const numberArray = result.rows.map(({ number }) => number);

    return [combinedNamesArray, numberArray];
  }

  static async changeLoadedStatusOfMultipleToTrue(numbers) {
    // There is potential for raw names to be included in the "numbers"
    // array, so we query for both names and numbers.
    for (let number of numbers) {
      const query = await db.query(
        `SELECT isloaded
         FROM students
         WHERE number = $1
         OR name = $2`,
        [number, number]
      );

      // If any of the names have already been loaded, throw a ConflictError.
      if (query.rows.length && query.rows[0].isloaded) {
        throw new ConflictError(
          "At least one of these students has already been added today."
        );
      }
    }

    let multipleNumbers = "";
    for (let number of numbers) {
      multipleNumbers += `+${await this.changeLoadedStatusToTrue(number)}`;
    }

    return multipleNumbers;
  }

  static async changeLoadedStatusToTrue(number) {
    if (!number.length) return;
    const studentExists = await db.query(
      `SELECT number, name, isloaded, added
       FROM students
       WHERE number = $1
       OR name = $2`,
      [number, number]
    );

    if (!studentExists.rows.length) {
      throw new BadRequestError("No student exists with this number.");
    }

    if (studentExists.rows[0].added) {
      throw new ConflictError("Student has already been added today.");
    }

    let pickupTime = new Date().toString();
    pickupTime = Date.parse(pickupTime);

    await db.query(
      `UPDATE students
       SET isloaded = $1,
       time = $2
       WHERE number = $3
       OR name = $4`,
      [true, pickupTime, number, number]
    );

    return studentExists.rows[0].number;
  }

  static async changeLoadedStatusToFalse(number) {
    const studentExists = await db.query(
      `SELECT number, name, isloaded
       FROM students
       WHERE number = $1`,
      [number]
    );

    if (!studentExists.rows.length) {
      throw new BadRequestError("No student exists with this number.");
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

  static async addStudentWithNoNumber(name) {
    const checkForStudent = await db.query(
      `SELECT isloaded, added
       FROM temp_students
       WHERE name = $1`,
      [name]
    );

    if (checkForStudent.rows.length) {
      const { isloaded, added } = checkForStudent.rows[0];
      if (isloaded || added) throw new BadRequestError("Student not found");
    }

    let pickupTime = new Date().toString();
    pickupTime = Date.parse(pickupTime);

    const result = await db.query(
      `INSERT INTO temp_students
       (name, isloaded, time)
       VALUES
       ($1, $2, $3)
       RETURNING name, time`,
      [name, true, pickupTime]
    );

    return result.rows[0];
  }

  static async removeStudentWithNoNumber(name) {
    const studentExists = await db.query(
      `SELECT *
       FROM temp_students
       WHERE name = $1`,
      [name]
    );

    if (!studentExists.rows.length) {
      throw new BadRequestError("This student does not exist.");
    }

    await db.query(
      `UPDATE temp_students
       SET isloaded = false,
       time = NULL,
       added = true
       WHERE name = $1`,
      [name]
    );

    return;
  }

  static async resetAll() {
    await db.query(
      `UPDATE students
       SET isloaded = $1,
       time = $2,
       added = $3`,
      [false, null, false]
    );

    await db.query("DELETE FROM temp_students");
  }

  static async getAllNamesAndNumbers() {
    const result = await db.query(
      `SELECT number, name
       FROM students`
    );

    result.rows.sort((a, b) => parseInt(a.number) - parseInt(b.number));
    return result.rows;
  }

  static async updateStudent(studentNumber, studentName) {
    const result = await db.query(
      `UPDATE students
       SET name = $1
       WHERE number = $2
       RETURNING number, name`,
      [studentName, studentNumber]
    );

    if (!result.rows.length) {
      throw new BadRequestError("No student exists with this number.");
    }

    return result.rows[0];
  }
}

module.exports = Student;
