const winston = require("winston");

const consoleTransport = new winston.transports.Console();
const infoTransport = new winston.transports.File({
  filename: "info.log",
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "MMM-DD-YYYY HH:mm:ss" }),
    winston.format.align(),
    winston.format.printf(
      (info) => `${info.level}: ${[info.timestamp]}: ${info.message}`
    )
  ),
});
const warnTransport = new winston.transports.File({
  filename: "warn.log",
  level: "warn",
  format: winston.format.combine(
    winston.format.timestamp({ format: "MMM-DD-YYYY HH:mm:ss" }),
    winston.format.align(),
    winston.format.printf(
      (info) => `${info.level}: ${[info.timestamp]}: ${info.message}`
    )
  ),
});
const errorTransport = new winston.transports.File({
  filename: "error.log",
  level: "error",
  format: winston.format.combine(
    winston.format.timestamp({ format: "MMM-DD-YYYY HH:mm:ss" }),
    winston.format.align(),
    winston.format.printf(
      (info) => `${info.level}: ${[info.timestamp]}: ${info.message}`
    )
  ),
});
const debugTransport = new winston.transports.File({
  filename: "debug.log",
  level: "debug",
  format: winston.format.combine(
    winston.format.timestamp({ format: "MMM-DD-YYYY HH:mm:ss" }),
    winston.format.align(),
    winston.format.printf(
      (info) => `${info.level}: ${[info.timestamp]}: ${info.message}`
    )
  ),
});
const myWinstonOptions = {
  transports: [
    consoleTransport,
    infoTransport,
    warnTransport,
    errorTransport,
    debugTransport,
  ],
};
const logger = winston.createLogger(myWinstonOptions);
module.exports = logger;
