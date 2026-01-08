import { createLogger, format, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";

const logDirectory = path.join(process.cwd(), "logs");

const customFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.printf((info) => {
    return `[${info.timestamp}] [${info.level.toUpperCase().padEnd(7)}] - ${info.message}`;
  }),
);

const logger = createLogger({
  format: customFormat,
  transports: [
    new transports.Console({
      level: "silly",
      format: format.combine(format.colorize(), customFormat),
    }),

    new DailyRotateFile({
      dirname: logDirectory,
      filename: "app-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
      level: "info",
    }),
  ],
});

export default logger;
