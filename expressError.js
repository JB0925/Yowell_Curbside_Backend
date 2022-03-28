class ExpressError extends Error {
  constructor(message, status) {
    super();
    this.message = message;
    this.status = status;
  }
}

class NotFoundError extends ExpressError {
  constructor(message = "Not Found", status = 404) {
    super(message, status);
  }
}

class BadRequestError extends ExpressError {
  constructor(message = "Bad Request", status = 400) {
    super(message, status);
  }
}

module.exports = {
  ExpressError,
  NotFoundError,
  BadRequestError,
};
