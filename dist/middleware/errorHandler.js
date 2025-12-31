"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const logger_1 = __importDefault(require("../logger/logger"));
const CustomError_1 = require("../utils/CustomError");
const errorHandler = (err, req, res, next) => {
    let statusCode = 500;
    let message = 'Internal server error';
    if (err instanceof CustomError_1.CustomError) {
        statusCode = err.statusCode;
        message = err.message;
    }
    else {
        message = err.message || message;
    }
    logger_1.default.error(`${req.method} ${req.url} ${statusCode} ${message} ->`, err);
    res.status(statusCode).json({
        success: false,
        message,
    });
};
exports.errorHandler = errorHandler;
