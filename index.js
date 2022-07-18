const express = require("express");
const cors = require("cors");
const app = express();
const Student = require("./model");
const Bree = require("bree");
const Graceful = require("@ladjs/graceful");
const LRU = require("lru-cache");

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

app.use(express.json());
app.use(
  cors({
    origin: "*",
  })
);

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
    return next(error);
  }
});

app.get("/students/fullName/:name", async (req, res, next) => {
  try {
    const { name } = req.params;
    const studentName = await Student.getStudentByName(name);
    return res.status(200).json({ name: studentName });
  } catch (error) {
    return next(error);
  }
});

app.get("/students/resetAll", async (req, res, next) => {
  try {
    await Student.resetAll();
    return res.status(200).json({ message: "All students have been reset." });
  } catch (error) {
    return next(error);
  }
});

app.patch("/students/add/:number", async (req, res, next) => {
  let studentNumber;
  let { number, studentName } = req.body;

  try {
    if (number.split("+").length > 1 || (number.length && studentName.length)) {
      const numbers = number.split("+");
      if (studentName !== undefined && studentName.length) {
        numbers.push(studentName);
      }
      studentNumber = await Student.changeLoadedStatusOfMultipleToTrue(numbers);
    } else {
      studentNumber = await Student.changeLoadedStatusToTrue(
        number || studentName
      );
    }
    return res.status(200).json({ status: `${studentNumber}` });
  } catch (error) {
    return next(error);
  }
});

app.patch("/students/remove/:number", async (req, res, next) => {
  const { number } = req.body;
  let updatedStudentStatus;

  try {
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
    return next(error);
  }
});

app.post("/students/add/noNumber", async (req, res, next) => {
  try {
    const { studentToAdd } = req.body;
    const newStudent = await Student.addStudentWithNoNumber(studentToAdd);
    return res.status(201).json({ student: newStudent });
  } catch (error) {
    return next(error);
  }
});

app.patch("/students/remove/noNumber", async (req, res, next) => {
  try {
    const { studentToRemove } = req.body;
    await Student.removeStudentWithNoNumber(studentToRemove);
    return res.status(200).json({
      message: `Student ${studentToRemove} successfully removed`,
    });
  } catch (error) {
    return next(error);
  }
});

app.get("/students/studentList", async (req, res, next) => {
  try {
    const studentList = await Student.getAllNamesAndNumbers();
    return res.status(200).json({ studentList });
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
