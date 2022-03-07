const express = require("express");
const cors = require("cors");
const app = express();
const Student = require("./model");

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
    const nameMatches = await Student.getStudentsByPartiallyMatchedName(
      partialMatch
    );
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
  const { number, studentName } = req.body;
  let updatedStudentStatus;
  try {
    if (number.split("+").length > 1) {
      const numbers = number.split("+");
      updatedStudentStatus = await Student.changeLoadedStatusOfMultipleToTrue(
        numbers
      );
    } else {
      updatedStudentStatus = await Student.changeLoadedStatusToTrue(number);
    }

    if (studentName !== undefined && studentName.length) {
      let studentToAdd = await Student.getStudentByName(studentName);
      const pattern = /\d+/g;
      const studentNumber = studentToAdd.match(pattern).join("");
      await Student.changeLoadedStatusToTrue(studentNumber);
    }
    return res.status(200).json({ status: updatedStudentStatus });
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
