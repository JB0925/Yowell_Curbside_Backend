const Student = require("./model");

const studentIsNotInRegularStudentGroup = (number) => {
  const pattern = /\d+/g;
  const matches = number.match(pattern);
  return !matches || parseInt(matches[0]) >= 500;
};

const removeStudentWhoIsNotInRegularStudentGroup = async (number) => {
  const name = number.split(": ").pop();
  await Student.removeStudentWithNoNumber(name);
};

const sendCurrentState = (websocket, dataToSend) => {
  websocket.clients.forEach((client) =>
    client.send(JSON.stringify(dataToSend))
  );
};

const moreThanOneStudentInData = (number) => {
  return number.split("+").length > 1;
};

const studentNotFound = (number) => {
  return number === "Student not found" || number === undefined;
};

const getNumberFromNumberString = (number) => {
  const pattern = /\d+/g;
  return number.match(pattern).join("+");
};

const moreThanOneStudentIsPresentToBeAdded = (number, studentName) => {
  return number.split("+").length > 1 || (number.length && studentName.length);
};

const studentNameIsPresent = (studentName) => {
  return studentName !== undefined && studentName.length;
};

module.exports = {
  getNumberFromNumberString,
  moreThanOneStudentInData,
  removeStudentWhoIsNotInRegularStudentGroup,
  sendCurrentState,
  moreThanOneStudentIsPresentToBeAdded,
  studentIsNotInRegularStudentGroup,
  studentNameIsPresent,
  studentNotFound,
};
