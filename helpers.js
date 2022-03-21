const studentIsNotInRegularStudentGroup = (number) => {
  const pattern = /\d+/g;
  const matches = number.match(pattern);
  return !matches || parseInt(matches[0]) >= 500;
};

module.exports = studentIsNotInRegularStudentGroup;
