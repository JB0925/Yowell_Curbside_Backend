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
});

afterAll(async () => {
  await db.end();
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
    expect(response.statusCode).toBe(500);
    expect(response.body.error.message).toEqual(
      "A student exists with this number."
    );
  });

  it("throws an error when a name is not provided", async () => {
    const newStudent = { number: "17" };
    const response = await request(app).post("/").send(newStudent);
    expect(response.statusCode).toBe(500);
    expect(response.body.error.message).toEqual(
      "You must provide a name and number"
    );
  });

  it("throws an error when a number is not provided", async () => {
    const newStudent = { name: "Carl" };
    const response = await request(app).post("/").send(newStudent);
    expect(response.statusCode).toBe(500);
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

    const response = await request(app).get("/students/status");
    expect(response.statusCode).toBe(200);
    expect(response.body.loadedStudents.length).toBe(2);
    expect(response.body.loadedStudents[1]).toContain("3");
    expect(response.body.loadedStudents[0][0].info).toEqual("#1: Joe#3: Sarah");
    expect(response.body.loadedStudents[1].length).toBe(2);
  });
});

describe("testing HTTP request to get names of students who match a partial query", () => {
  it("gets an array of full names of students whose names match a partial query", async () => {
    const nameGetter = jest
      .spyOn(Student, "getStudentsByPartiallyMatchedName")
      .mockReturnValueOnce(["Sarah", "Mark", "Mary"]);
    const partialNameToMatch = "ar";
    const response = await request(app).get(
      `/students/partialNames/${partialNameToMatch}`
    );

    expect(response.statusCode).toBe(200);
    expect(response.body.nameMatches).toHaveLength(3);
    expect(response.body.nameMatches).toContain("Sarah");
    expect(response.body.nameMatches).toContain("Mark");
    expect(response.body.nameMatches).toContain("Mary");
    expect(nameGetter).toHaveBeenCalled();
  });

  it("throws an error if no matches are found for the partial name query", async () => {
    const partialNameToMatch = "ddd";
    const response = await request(app).get(
      `/students/partialNames/${partialNameToMatch}`
    );

    expect(response.statusCode).toBe(500);
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

    expect(response.statusCode).toBe(500);
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
      .send({ number: "2" });
    expect(duplicateResponse.statusCode).toBe(200);

    const studentCheck = await request(app).get("/students/status");
    expect(studentCheck.body.loadedStudents[1]).toHaveLength(3);
    expect(studentCheck.body.loadedStudents[1]).toContain("5");
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
    expect(response.statusCode).toBe(500);
  });
});
