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
    const studentName = await Student.getStudent(number);
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
