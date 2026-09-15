import fs from "fs";
import path from "path";
import moment from "moment";
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

const logsDir = path.join(__dirname, "..", "logs");

// winston-daily-rotate-file (via file-stream-rotator) creates missing
// month/year folders itself, but its path-splitting logic is broken on
// Windows when datePattern contains "/". Pre-creating the current month's
// folder avoids that buggy code path (it only runs mkdir when the dir is
// missing). Re-checked hourly so month/year rollovers are covered too.
function ensureCurrentLogDir(): void {
  const now = moment();
  fs.mkdirSync(path.join(logsDir, now.format("YYYY"), now.format("MMMM")), { recursive: true });
}

ensureCurrentLogDir();
setInterval(ensureCurrentLogDir, 60 * 60 * 1000).unref();

const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `[${timestamp}] ${level.toUpperCase()}: ${stack ?? message}`;
  })
);

const dailyRotateTransport = new DailyRotateFile({
  dirname: logsDir,
  filename: "%DATE%.log",
  datePattern: "YYYY/MMMM/DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "90d",
  format: fileFormat,
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? "info",
  format: fileFormat,
  transports: [dailyRotateTransport],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    })
  );
}

export default logger;
