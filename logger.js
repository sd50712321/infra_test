const winston = require("winston");

const logMessageFormat = winston.format.printf((info) => {
  const { timestamp, level, status, method, url, message, ...rest } = info;
  const instance = process.env.NODE_APP_INSTANCE || 0;

  const stringify = (value) => {
    return typeof value === "object" ? JSON.stringify(value, null, 2) : value;
  };

  const messageParts = [message];
  for (const key in rest) {
    messageParts.push(stringify(rest[key]));
  }

  const logContent = messageParts.join(" ");

  if (status && method && url) {
    // `/metrics` 엔드포인트에 대한 로그를 건너뛰기 위한 조건 추가
    if (url === "/metrics") {
      return false;
    }
    return `${timestamp} [Instance ${instance}] ${level}: ${method} ${url} ${status} - ${logContent}`;
  }
  return `${timestamp} [Instance ${instance}] ${level}: ${logContent}`;
});

const consoleLogFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format((info, opts) => {
    const args = info[Symbol.for("splat")];
    if (args) {
      args.forEach((arg) => {
        if (typeof arg === "object") {
          info.message += " " + JSON.stringify(arg, null, 2);
        } else {
          info.message += " " + arg;
        }
      });
    }

    if (info.message && typeof info.message === "object") {
      info.message = JSON.stringify(info.message, null, 2);
    }
    return info;
  })(),
  logMessageFormat
);

const fileLogFormat = winston.format.combine(
  winston.format.timestamp({
    format: "YYYY-MM-DD HH:mm:ss",
    offset: 9 * 60 * 60 * 1000,
  }),
  winston.format.errors({ stack: true }),
  winston.format((info, opts) => {
    const args = info[Symbol.for("splat")];
    if (args) {
      args.forEach((arg) => {
        if (typeof arg === "object") {
          info.message += " " + JSON.stringify(arg, null, 2);
        } else {
          info.message += " " + arg;
        }
      });
    }

    if (info.message && typeof info.message === "object") {
      info.message = JSON.stringify(info.message, null, 2);
    }
    return info;
  })(),
  logMessageFormat
);

// const error500Filter = winston.format((info) => {
//   return info.level === "error" && info.status >= 500 ? info : false;
// });

const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "silly",
  transports: [
    new winston.transports.Console({
      format: consoleLogFormat,
    }),
    new winston.transports.File({
      filename: `logs/combined.log`,
      format: fileLogFormat,
      maxsize: 3 * 1024 * 1024 * 1024, // 3GB
      maxFiles: 1,
    }),
  ],
});

// if (process.env.NODE_ENV !== "production") {
//   logger.add(
//     new winston.transports.Console({
//       format: winston.format.simple(),
//     })
//   );
// }

module.exports = logger;
