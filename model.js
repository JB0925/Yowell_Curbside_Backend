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

  static async getAllStudentsForCache() {
    try {
      // Get all students from the database
      const query = await db.query(
        `SELECT number, name, added
         FROM students`
      );

      // Store them in an object for fast lookup, to be placed
      // in the cache.
      let all = {};
      for (let student of query.rows) {
        all[student.number] = student;
      }

      return all;
    } catch (err) {
      logger.error(
        "Student::getAllStudentsForCache - error in getting students for cache",
        err
      );
      return {};
    }
  }

  static async getSingleStudent(number, cache) {
    // Try to get the student from the cache first
    // if it's not there, then query the database.
    const result =
      cache.get("allStudents")?.[number] ||
      (await db.query(
        `SELECT number, name, added
         FROM students
         WHERE number = $1`,
        [number.toString()]
      ));

    logger.debug("RESULT::getSingleStudent", result);

    // If the result is undefined, then the student doesn't exist.
    if (!result) {
      logger.info(
        `Student::getSingleStudent - no result from cache or db for ${number}. Result: `,
        result
      );
      return null;
    }

    // A result from the database will have a rows property,
    // which is an array of objects. If the result is from the cache,
    // it will not have a rows property and we can just return it.
    if (!result.hasOwnProperty("rows")) {
      logger.info("Student::getSingleStudent - result from cache: ", result);
      return result;
    } else {
      if (!result.rows.length) {
        logger.info(
          "Student::getSingleStudent - found no matches in cache and no results in db: ",
          result.rows
        );
        return null;
      }
    }

    logger.info("Student::getSingleStudent - result from db: ", result.rows[0]);
    return result.rows[0].added ? "Student not found" : result.rows[0];
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

  static async getStudentByNumber(number, cache) {
    // const result = await db.query(
    //   `SELECT number, name, added
    //    FROM students
    //    WHERE number = $1`,
    //   [number]
    // );
    const result = await this.getSingleStudent(number.toString(), cache);
    logger.debug("RESULT::getStudentByNumber - result of lookup: ", result);
    if (!result || result.added) {
      return "Student not found";
    }

    // if (!result.rows.length || result.rows[0].added) {
    //   return "Student not found";
    // }

    await db.query(
      `UPDATE students
       SET added = $1
       WHERE number = $2`,
      [true, result.number]
    );

    // const { name } = result.rows[0];
    return `#${result.number}: ${result.name}`;
  }

  static async getMultipleStudentsByNumber(numbers, cache) {
    // let student = "";
    // for (let number of numbers) {
    //   student = student + ", " + (await this.getStudentByNumber(number, cache));
    // }
    let studentArray = [];
    for (let number of numbers) {
      studentArray.push(await this.getStudentByNumber(number, cache));
    }

    return studentArray.join(", ").trim(" ");
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
    const lowercasePartialName = partialName.toLowerCase();
    let x = nameArray.filter((n) =>
      n
        .split(" ")
        .some(
          (b) =>
            b.toLowerCase().startsWith(lowercasePartialName) &&
            (b.indexOf(".") === -1 || b.length > 2)
        )
    );
    x = Array.from(new Set(x));
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

    const threshold = 499;
    number = number.trim();

    if (parseInt(number) > threshold) {
      throw new BadRequestError(
        "The number you provide must be less than 500."
      );
    }

    const duplicateCheck = await db.query(
      `SELECT number, name
       FROM students
       WHERE number = $1
       OR LOWER(name) = $2`,
      [number, name.toLowerCase().trim()]
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
    // const result = await db.query(
    //   `WITH students_cte AS (
    //       SELECT "time",
    //       STRING_AGG('#' || "number" || ': ' || "name", ', ') AS info
    //       FROM students
    //       WHERE isloaded = $1
    //       GROUP BY "time"
    //       ORDER BY "time"
    // ),

    //   temp_students_cte AS (
    //       SELECT "time",
    //       STRING_AGG('#' || floor(random() * (999-500+1) + 500)::int || ': ' || "name", ', ') AS info
    //       FROM temp_students
    //       WHERE isloaded = $1
    //       GROUP BY "time"
    //       ORDER BY "time"
    //   )

    //   SELECT * FROM students_cte
    //   UNION ALL
    //   SELECT * FROM temp_students_cte
    //   ORDER BY "time"`,
    //   [true]
    // );
    const result = await db.query(
      `WITH students_cte AS (
          SELECT "time",
          STRING_AGG('#' || "number" || ': ' || "name", ', ') AS info
          FROM students
          WHERE isloaded = $1
          GROUP BY "time"
          ORDER BY "time"
    ),

      temp_students_cte AS (
          SELECT "time",
          STRING_AGG('#' || "number" || ': ' || "name", ', ') AS info
          FROM temp_students
          WHERE isloaded = $1
          GROUP BY "time"
          ORDER BY "time"
      )

      SELECT * FROM students_cte
      UNION ALL
      SELECT * FROM temp_students_cte
      ORDER BY "time"`,
      [true]
    );

    if (!result.rows.length) {
      return [];
    }

    // We return all of the used numbers, too, so that on the client side,
    // they can return early if a number has been entered that has already
    // been used for the day.
    let numberArray = [];
    for (let st of result.rows) {
      const matches = st.info.match(/\d+(\.\d+)?/g);
      for (let match of matches) {
        numberArray.push(match);
      }
    }

    return [result.rows, numberArray];
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

    if (studentExists.rows.some((st) => st.added)) {
      throw new ConflictError(
        `Student ${studentExists.rows[0].name} has already been added today.`
      );
    }

    if (studentExists.rows.length > 1) {
      const nums = studentExists.rows.map((n) => n.number);
      await this.changeLoadedStatusOfMultipleToTrue(nums);
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

    if (studentExists.rows[0].name === "Justice Puller") {
      await db.query(
        `UPDATE students
         SET isloaded = $1,
         time = $2
         WHERE number IN ($3, $4)`,
        [false, null, "265", "160"]
      );
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
      [name.split(": ")[1]]
    );

    if (checkForStudent.rows.length) {
      const { isloaded, added } = checkForStudent.rows[0];
      if (isloaded || added) throw new BadRequestError("Student not found");
    }

    let pickupTime = new Date().toString();
    pickupTime = Date.parse(pickupTime);

    // const number = Math.floor(Math.random() * (999 - 500 + 1) + 500);
    const number = name.split(": ")[0].split("#")[1].trim("");
    const newName = name.split(": ")[1].trim("");

    const result = await db.query(
      `INSERT INTO temp_students
       (name, number, isloaded, time)
       VALUES
       ($1, $2, $3, $4)
       RETURNING name, time`,
      [newName, number, true, pickupTime]
    );

    return result.rows[0];
  }

  static async removeStudentWithNoNumber(name) {
    if (name.includes("#")) {
      name = name.split(":")[1].trim("");
    }

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

  static async resetAll(cache) {
    await db.query(
      `UPDATE students
       SET isloaded = $1,
       time = $2,
       added = $3`,
      [false, null, false]
    );

    await db.query("DELETE FROM temp_students");

    cache.set("allStudents", await this.getAllStudentsForCache());
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
    studentName = studentName.trim();
    studentNumber = studentNumber.trim();
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
