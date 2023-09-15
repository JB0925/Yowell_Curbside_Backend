const express = require("express");
const cors = require("cors");
const app = express();
const Student = require("./model");
const Bree = require("bree");
const Graceful = require("@ladjs/graceful");
const LRU = require("lru-cache");
const logger = require("./logger");
const compression = require("compression");
const helmet = require("helmet");
const {
  studentNameIsPresent,
  moreThanOneStudentIsPresentToBeAdded,
} = require("./helpers");

const cache = new LRU({
  max: 20,
});

const bree = new Bree({
  jobs: [
    {
      name: "resetDB",
      cron: "0 17 * * 1-5",
      cronValidate: {
        useBlankDay: true,
      },
    },
  ],
});

const graceful = new Graceful({ brees: [bree] });
graceful.listen();
bree.start();

app.use(
  compression({
    level: 6,
  })
);
app.use(express.json());
app.use(helmet());
app.use(
  cors({
    origin: "*",
  })
);
app.use((req, res, next) => {
  if (
    req.headers.referer !== "https://nameless-wave-46063.herokuapp.com/" &&
    process.env.NODE_ENV === "production"
  ) {
    logger.warn(req.headers.referer);
    return res.status(403).json({
      message: "This content may not be accessed via this method.",
      status: 403,
    });
  }
  next();
});

app.get("/:number", async (req, res, next) => {
  const { number } = req.params;
  try {
    const studentName = await Student.getStudentByNumber(number);
    return res.status(200).json({ name: studentName });
  } catch (error) {
    return next(error);
  }
});

app.post("/", async (req, res, next) => {
  const { number, name } = req.body;
  try {
    const newStudent = await Student.addStudent(number, name);
    logger.info(`Adding a new student to the database: ${newStudent}`);
    cache.set("studentList", await Student.getAllNamesAndNumbers());
    return res.status(201).json({ student: newStudent });
  } catch (error) {
    return next(error);
  }
});

app.get("/students/status", async (req, res, next) => {
  try {
    const loadedStudents = await Student.getLoadedStudents();
    return res.status(200).json({ loadedStudents });
  } catch (error) {
    logger.error("/students/status - GET all students", error);
    return next(error);
  }
});

app.get("/students/partialNames/:partialMatch", async (req, res, next) => {
  try {
    const { partialMatch } = req.params;
    const nameMatches =
      cache.get(partialMatch) ||
      (await Student.getStudentsByPartiallyMatchedName(partialMatch));
    cache.set(partialMatch, nameMatches);
    return res.status(200).json({ nameMatches });
  } catch (error) {
    logger.error(
      `An error occurred while getting partial name matches: ${error}`
    );
    return next(error);
  }
});

app.get("/students/fullName/:name", async (req, res, next) => {
  try {
    const { name } = req.params;
    const studentName = await Student.getStudentByName(name);
    return res.status(200).json({ name: studentName });
  } catch (error) {
    logger.error(
      "An error occurred while getting a student by full name: ",
      error
    );
    return next(error);
  }
});

app.get("/students/resetAll", async (req, res, next) => {
  try {
    await Student.resetAll();
    return res.status(200).json({ message: "All students have been reset." });
  } catch (error) {
    logger.error(
      "An error occurred while resetting the status of students in the DB: ",
      error
    );
    return next(error);
  }
});

app.patch("/students/add/:number", async (req, res, next) => {
  let studentNumber;
  let { number, studentName } = req.body;

  try {
    // check to see if more than one student is coming from the client,
    // which can mean several numbers, a number and a name, etc.
    if (moreThanOneStudentIsPresentToBeAdded(number, studentName)) {
      const numbers = number.split("+");
      if (studentNameIsPresent(studentName)) {
        numbers.push(studentName);
      }
      studentNumber = await Student.changeLoadedStatusOfMultipleToTrue(numbers);
    } else {
      // otherwise, we only have one student to add, and it will either
      // be a student name or student number.
      studentNumber = await Student.changeLoadedStatusToTrue(
        number || studentName
      );
    }
    logger.info(`Students added: ${studentNumber}`);
    return res.status(200).json({ status: `${studentNumber}` });
  } catch (error) {
    logger.error("/students/add/number", error);
    return next(error);
  }
});

app.patch("/students/remove/:number", async (req, res, next) => {
  const { number } = req.body;
  let updatedStudentStatus;

  try {
    if (!number) {
      const { studentToRemove } = req.body;
      await Student.removeStudentWithNoNumber(studentToRemove);
      return res
        .status(200)
        .json({ message: `Student ${studentToRemove} successfully removed` });
    }

    if (number.split("+").length > 1) {
      const numbers = number.split("+");
      updatedStudentStatus = await Student.changeLoadedStatusOfMultipleToFalse(
        numbers
      );
    } else {
      updatedStudentStatus = await Student.changeLoadedStatusToFalse(number);
    }

    return res.status(200).json({ status: updatedStudentStatus });
  } catch (error) {
    logger.error(
      "An error occurred while changing loaded status to false: ",
      error
    );
    return next(error);
  }
});

app.post("/students/add/noNumber", async (req, res, next) => {
  try {
    const { studentToAdd } = req.body;
    const newStudent = await Student.addStudentWithNoNumber(studentToAdd);
    return res.status(201).json({ student: newStudent });
  } catch (error) {
    logger.error(
      "An error occurred while adding a student with no number: ",
      error
    );
    return next(error);
  }
});

app.patch("/students/remove/noNumber", async (req, res, next) => {
  try {
    const { studentToRemove } = req.body;
    console.log(req.body);
    await Student.removeStudentWithNoNumber(studentToRemove);
    return res.status(200).json({
      message: `Student ${studentToRemove} successfully removed`,
    });
  } catch (error) {
    logger.error(
      "An error occurred while removing a student with no number: ",
      error
    );
    return next(error);
  }
});

app.get("/students/studentList", async (req, res, next) => {
  try {
    const studentList =
      cache.get("studentList") || (await Student.getAllNamesAndNumbers());

    cache.set("studentList", studentList);
    return res.status(200).json({ studentList });
  } catch (error) {
    return next(error);
  }
});

app.patch("/students/updateStudent", async (req, res, next) => {
  try {
    await Student.getStudentData(req.body.number);
    const { number, name } = await Student.updateStudent(
      req.body.number,
      req.body.name
    );
    cache.set("studentList", await Student.getAllNamesAndNumbers());
    return res.status(200).json({ number, name });
  } catch (error) {
    return next(error);
  }
});

app.use((req, res, next) => {
  return res.status(404).json({ message: "Not Found" });
});

app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message;

  return res.status(status).json({
    error: { message, status },
  });
});

module.exports = app;
