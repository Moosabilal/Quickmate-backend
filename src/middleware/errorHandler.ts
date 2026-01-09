import { type NextFunction, type Request, type Response } from "express";
import logger from "../logger/logger.js";
import { CustomError } from "../utils/CustomError.js";

export const errorHandler = (err: Error | CustomError, req: Request, res: Response, _next: NextFunction) => {
  let statusCode = 500;
  let message = "Internal server error";

  if (err instanceof CustomError) {
    statusCode = err.statusCode;
    message = err.message;
  } else {
    message = err.message || message;
  }

  logger.error(`${req.method} ${req.url} ${statusCode} ${message} ->`, err);

  res.status(statusCode).json({
    success: false,
    message,
  });
};
