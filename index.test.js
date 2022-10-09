process.env.NODE_ENV = "test";
const app = require("./index");
const db = require("./db");
const request = require("supertest");
const Student = require("./model");
const { response } = require("express");

beforeEach(async () => {
  await db.query(
    `INSERT INTO students
     (number, name)
     VALUES
     ('1', 'Joe'),
     ('2', 'Tim'),
     ('3', 'Sarah'),
     ('4', 'Mary'),
     ('5', 'Mark'),
     ('41', 'Joe')`
  );
});

afterEach(async () => {
  await db.query("DELETE FROM students");
  await db.query("DELETE from temp_students");
});

describe("testing HTTP requests to get a student by number", () => {
  it("gets a student's data given a number that exists in the database", async () => {
    const response = await request(app).get("/3");
    expect(response.statusCode).toBe(200);
    expect(response.body.name).toEqual("#3: Sarah");
  });

  it("returns a 'student not found' message for a student number that is not in the database", async () => {
    const response = await request(app).get("/6");
    expect(response.statusCode).toBe(200);
    expect(response.body.name).toEqual("Student not found");
  });
});

describe("testing HTTP requests to add a student to the database", () => {
  it("adds a new student to the database, provided the correct information is given", async () => {
    const newStudent = { number: "6", name: "Julio" };
    const response = await request(app).post("/").send(newStudent);
    expect(response.statusCode).toBe(201);
    expect(response.body.student.number).toBe("6");
    expect(response.body.student.name).toBe("Julio");
  });

  it("throws an error when trying to add a student with a number that has already been used", async () => {
    const newStudent = { number: "3", name: "Lainey" };
    const response = await request(app).post("/").send(newStudent);
    expect(response.statusCode).toBe(409);
    expect(response.body.error.message).toEqual(
      "A student exists with this number."
    );
  });

  it("throws an error when trying to add a student whose name is already in the database", async () => {
    const newStudent = { number: "6", name: "tim" };
    const response = await request(app).post("/").send(newStudent);
    expect(response.statusCode).toBe(409);
  });

  it("throws an error when a name is not provided", async () => {
    const newStudent = { number: "17" };
    const response = await request(app).post("/").send(newStudent);
    expect(response.statusCode).toBe(400);
    expect(response.body.error.message).toEqual(
      "You must provide a name and number"
    );
  });

  it("throws an error when a number is not provided", async () => {
    const newStudent = { name: "Carl" };
    const response = await request(app).post("/").send(newStudent);
    expect(response.statusCode).toBe(400);
    expect(response.body.error.message).toEqual(
      "You must provide a name and number"
    );
  });
});

describe("testing HTTP request to get all students who have been loaded", () => {
  it("gets an array of names and an array of numbers for students who have been loaded into the app", async () => {
    await db.query(
      `UPDATE students
       SET isloaded = true,
       time = '16678956432',
       added = true
       WHERE number IN ($1, $2)`,
      ["1", "3"]
    );

    await db.query(
      `INSERT INTO temp_students
       (name, isloaded, time)
       VALUES
       ($1, $2, $3)`,
      ["Arthur", true, "156785456744"]
    );

    const response = await request(app).get("/students/status");
    expect(response.statusCode).toBe(200);
    expect(response.body.loadedStudents.length).toBe(2);
    expect(response.body.loadedStudents[1]).toContain("3");
    expect(response.body.loadedStudents[0][0].info).toEqual(
      "#1: Joe  #3: Sarah"
    );
    expect(response.body.loadedStudents[1].length).toBe(2);
  });
});

describe("testing HTTP request to get names of students who match a partial query", () => {
  it("gets an array of full names of students whose names match a partial query", async () => {
    const partialNameToMatch = "Ma";
    const response = await request(app).get(
      `/students/partialNames/${partialNameToMatch}`
    );

    expect(response.statusCode).toBe(200);
    expect(response.body.nameMatches).toEqual(["Mary", "Mark"]);
    expect(response.body.nameMatches).toHaveLength(2);
    expect(response.body.nameMatches).toContain("Mark");
    expect(response.body.nameMatches).toContain("Mary");
  });

  it("throws an error if no matches are found for the partial name query", async () => {
    const partialNameToMatch = "ddd";
    const response = await request(app).get(
      `/students/partialNames/${partialNameToMatch}`
    );

    expect(response.statusCode).toBe(400);
    expect(response.body.error.message).toBe("No students match this query");
  });
});

describe("testing HTTP request to get student data by student name", () => {
  it("gets data for a student when given a name found in the DB", async () => {
    const nameGetter = jest
      .spyOn(Student, "getStudentByName")
      .mockReturnValueOnce("#1: Joe");
    const response = await request(app).get(`/students/fullName/Joe`);

    expect(response.statusCode).toBe(200);
    expect(response.body.name).toBe("#1: Joe");
    expect(nameGetter).toHaveBeenCalled();
  });

  it("throws an error when given a name not found in the DB", async () => {
    const response = await request(app).get("/students/fullName/Alex");

    expect(response.statusCode).toBe(400);
    expect(response.body.error.message).toBe("No student matches this query.");
  });
});

describe("testing HTTP route to reset all students in the database to their original state", () => {
  it("resets all of the data in the database to its initial state", async () => {
    await db.query(
      `UPDATE students
       SET isloaded = true,
       time = '16678956432',
       added = true
       WHERE number IN ($1, $2)`,
      ["1", "3"]
    );

    const firstResponse = await request(app).get("/students/status");
    expect(firstResponse.body.loadedStudents[1]).not.toBeNull();
    expect(firstResponse.body.loadedStudents[1]).toHaveLength(2);

    const resettingResponse = await request(app).get("/students/resetAll");
    expect(resettingResponse.body.message).toBe(
      "All students have been reset."
    );

    const afterClearing = await request(app).get("/students/status");
    expect(afterClearing.body.loadedStudents[1]).toBeUndefined();
  });
});

describe("testing HTTP route to add students to the list of students waiting to be picked up", () => {
  it("adds students to the list of student names that the GET '/students/status endpoint returns", async () => {
    const numbersToSend = { number: "1+3+4" };
    const response = await request(app)
      .patch("/students/add/1+3+4")
      .send(numbersToSend);
    expect(response.statusCode).toBe(200);

    const loadedStudents = await request(app).get("/students/status");
    expect(loadedStudents.body.loadedStudents[1]).toHaveLength(3);

    const resetResponse = await request(app).get("/students/resetAll");
  });

  it("adds students by both name AND number", async () => {
    const numbersToSend = { number: "2+5", studentName: "Joe" };
    const response = await request(app)
      .patch("/students/add/2+5")
      .send(numbersToSend);
    expect(response.statusCode).toBe(200);

    const loadedStudents = await request(app).get("/students/status");
    expect(loadedStudents.body.loadedStudents[1]).toHaveLength(3);
    expect(loadedStudents.body.loadedStudents[1]).toContain("1");
    expect(loadedStudents.body.loadedStudents[1]).toContain("5");

    const resetResponse = await request(app).get("/students/resetAll");
  });

  it("does not add students when trying to add a student more than once", async () => {
    const numbersToSend = { number: "2+5", studentName: "Joe" };
    const response = await request(app)
      .patch("/students/add/2+5")
      .send(numbersToSend);
    expect(response.statusCode).toBe(200);

    const duplicateResponse = await request(app)
      .patch("/students/add/2")
      .send({ number: "2", studentName: "Joe" });
    expect(duplicateResponse.statusCode).toBe(409);

    const studentCheck = await request(app).get("/students/status");
    expect(studentCheck.body.loadedStudents[1]).toHaveLength(3);
    expect(studentCheck.body.loadedStudents[1]).toContain("5");
  });

  it("doesn't add a student for whom a number does not exist", async () => {
    const response = await request(app).patch("/students/add/395").send("395");
    expect(response.statusCode).toBe(500);
  });
});

describe("testing HTTP route to remove students", () => {
  it("removes students who were added from the main list", async () => {
    const numbersToSend = { number: "2+5+1" };
    const response = await request(app)
      .patch("/students/add/2+5")
      .send(numbersToSend);
    expect(response.statusCode).toBe(200);

    const numbersToRemove = { number: "2+5+1" };
    const removedStudents = await request(app)
      .patch("/students/remove/2+5+1")
      .send(numbersToRemove);
    expect(removedStudents.statusCode).toBe(200);

    const getStudents = await request(app).get("/students/status");
    expect(getStudents.body.loadedStudents).toHaveLength(0);
  });

  it("throws an error if the student is not in the main list of students", async () => {
    const numberToRemove = { number: "17" };
    const response = await request(app)
      .patch("/students/remove/17")
      .send(numberToRemove);
    expect(response.statusCode).toBe(400);
  });
});

describe("testing the 'getMultipleStudentsByNumber' function", () => {
  it("gets multiple students by number", async () => {
    const numbers = "2+5+1";
    const result = await Student.getMultipleStudentsByNumber(numbers);
    expect(result).toContain("#2: Tim");
  });
});

describe("testing the routes to add students who have no number", () => {
  it("adds a student with no number to the temp_students table", async () => {
    const studentName = "tim";
    const body = { studentToAdd: studentName };
    const response = await request(app)
      .post("/students/add/noNumber")
      .send(body);

    expect(response.statusCode).toBe(201);
    expect(response.body.student.name).toBe("tim");
    expect(response.body.student.time).not.toBe(null);
    expect(response.body.student.time).toHaveLength(13);
  });

  it("does not allow a student to be entered twice", async () => {
    const studentName = "tim";
    const body = { studentToAdd: studentName };
    const response = await request(app)
      .post("/students/add/noNumber")
      .send(body);

    expect(response.statusCode).toBe(201);
    expect(response.body.student.name).toBe("tim");
    expect(response.body.student.time).not.toBe(null);
    expect(response.body.student.time).toHaveLength(13);

    const response2 = await request(app)
      .post("/students/add/noNumber")
      .send(body);

    expect(response2.statusCode).toBe(400);
    expect(response2.body.error.message).toBe("Student not found");
  });
});

describe("testing HTTP request to get all students in student database ordered and loaded into an array.", () => {
  it("loads all students in the table into an array and orders them by number.", async () => {
    const result = await db.query(
      `SELECT * FROM students
       WHERE number IN
       ('1', '2', '3', '4', '5')`
    );
    expect(result.rows.length).toBe(5);
    const response = await request(app).get("/students/studentList");
    expect(response.body.studentList.length).toBe(6);
    const [joe, tim, sarah, mary, mark] = response.body.studentList;
    const studentNumbers = response.body.studentList.map((student) =>
      parseInt(student.number)
    );
    expect([1, 2, 3, 4, 5, 41]).toEqual(studentNumbers);
    expect(joe.name).toBe("Joe");
    expect(mark.name).toBe("Mark");
  });
});

describe("testing HTTP request to update an existing student in the student database", () => {
  it("updates a student who exists in the student database.", async () => {
    const result = await db.query(
      `SELECT * FROM students
       WHERE number = $1`,
      ["1"]
    );
    expect(result.rows.length).toBe(1);

    const [joe] = result.rows;
    expect(joe.name).toBe("Joe");

    const body = {
      number: joe.number,
      name: "Joe Smith",
    };
    const response = await request(app)
      .patch("/students/updateStudent")
      .send(body);

    expect(response.statusCode).toBe(200);
    expect(response.body.number).toBe("1");
    expect(response.body.name).toBe("Joe Smith");

    const newResult = await db.query(
      `SELECT * FROM students
       WHERE number = $1`,
      ["1"]
    );

    expect(newResult.rows.length).toBe(1);
    expect(newResult.rows[0].name).toBe("Joe Smith");
  });

  it("throws an error when trying to update a student that does not exist in the database.", async () => {
    const result = await db.query(
      `SELECT * FROM students
       WHERE number = $1`,
      ["10"]
    );

    // result should be empty
    expect(result.rows.length).toBe(0);

    const body = {
      number: "10",
      name: "Jason",
    };

    const response = await request(app)
      .patch("/students/updateStudent")
      .send(body);

    expect(response.statusCode).toBe(400);
    expect(response.body.error.message).toBe("No students match this query.");
  });
});

/** MODEL TESTING */
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

  it("throws an error when looking for a student that does not exist in the temp student table", async () => {
    try {
      await Student.removeStudentWithNoNumber("Aaron");
    } catch (error) {
      expect(error.message).toBe("This student does not exist.");
    }
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

describe("testing that the model to add a student by number throws an error if the number is not found", () => {
  it("throws an error when passed a number that is not in the database", async () => {
    try {
      await Student.changeLoadedStatusToTrue("3956");
    } catch (error) {
      expect(error.message).toBe("No student exists with this number.");
    }
  });

  it("alerts that the student's number has already been called today if trying to add them more than once", async () => {
    await db.query(
      `UPDATE students
       SET added = $1
       WHERE number = $2`,
      [true, "1"]
    );
    try {
      await Student.changeLoadedStatusToTrue("1");
    } catch (error) {
      expect(error.message).toBe("Student has already been added today.");
    }
  });
});

describe("testing that an empty array is returned when there are no loaded students", () => {
  it("returns an empty array when there are no loaded students", async () => {
    await db.query("DELETE FROM students");
    const result = await Student.getLoadedStudents();
    expect(result).toEqual([]);
  });
});
