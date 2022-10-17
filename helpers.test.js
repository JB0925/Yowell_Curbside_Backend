const {
  getNumberFromNumberString,
  moreThanOneStudentInData,
  removeStudentWhoIsNotInRegularStudentGroup,
  sendCurrentState,
  moreThanOneStudentIsPresentToBeAdded,
  studentIsNotInRegularStudentGroup,
  studentNameIsPresent,
  studentNotFound,
} = require("./helpers");

describe("testing the helper methods for the Yowell Curbside application", () => {
  it("should return false for a student whose numbers fall within the normal range.", () => {
    const numberString = "3+106+88";
    expect(studentIsNotInRegularStudentGroup(numberString)).toBe(false);
  });

  it("should return true for a student who only has a name or has a number 500 or higher.", () => {
    const numberString = "Von Miller";
    expect(studentIsNotInRegularStudentGroup(numberString)).toBe(true);
  });

  it("should return true for a number that is 500 or higher", () => {
    const numberString = "500+98+17";
    expect(studentIsNotInRegularStudentGroup(numberString)).toBe(true);
  });
  it("should return false for a number that is 500 or higher, but is not the first number", () => {
    const numberString = "101+500+21";
    expect(studentIsNotInRegularStudentGroup(numberString)).toBe(false);
  });

  it("should return true when there is more than one number present in the number string.", () => {
    const numberString = "1+2+3+4";
    expect(moreThanOneStudentInData(numberString)).toBe(true);
  });

  it("should return false when there is only one number present in the number string", () => {
    const numberString = "1";
    expect(moreThanOneStudentInData(numberString)).toBe(false);
  });

  it("should return true when the return message is Student not found.", () => {
    const numberString = "Student not found";
    expect(studentNotFound(numberString)).toBe(true);
  });

  it("should return true when the return is undefined.", () => {
    const numberString = undefined;
    expect(studentNotFound(numberString)).toBe(true);
  });

  it("should return false when the number is an actual string representation of an integer.", () => {
    const numberString = "17";
    expect(studentNotFound(numberString)).toBe(false);
  });

  it("should return false when the number is an actual string representation of more than one integer.", () => {
    const numberString = "17+40+49";
    expect(studentNotFound(numberString)).toBe(false);
  });

  it("should return two numbers when there are two students present that have regular numbers", () => {
    const numberString = "#17: Josh Allen #34: Thurman Thomas";
    expect(getNumberFromNumberString(numberString)).toBe("17+34");
  });

  it("should return true when there is more than one student present", () => {
    const numberString = "23+28";
    const studentName = "";
    expect(
      moreThanOneStudentIsPresentToBeAdded(numberString, studentName)
    ).toBe(true);
  });

  it("should return true when there is more than one student present", () => {
    const numberString = "23+";
    const studentName = "Jerry Hughes";
    expect(
      moreThanOneStudentIsPresentToBeAdded(numberString, studentName)
    ).toBe(true);
  });

  it("should return false when there is only one student present", () => {
    const numberString = "23";
    const studentName = "";
    expect(
      moreThanOneStudentIsPresentToBeAdded(numberString, studentName)
    ).toBeFalsy();
  });

  it("should return false when there is only one student present by name.", () => {
    const numberString = "";
    const studentName = "Devin Singletary";
    expect(
      moreThanOneStudentIsPresentToBeAdded(numberString, studentName)
    ).toBeFalsy();
  });

  it("should return true if the studentName var is present and not empty.", () => {
    const studentName = "Greg Rousseau";
    expect(studentNameIsPresent(studentName)).toBeTruthy();
  });

  it("should return false if the studentName var is empty.", () => {
    const studentName = "";
    expect(studentNameIsPresent(studentName)).toBeFalsy();
  });

  it("should return false if the studentName var is undefined.", () => {
    const studentName = undefined;
    expect(studentNameIsPresent(studentName)).toBeFalsy();
  });
});
