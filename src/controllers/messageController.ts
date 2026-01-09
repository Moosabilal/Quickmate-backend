import { injectable } from "inversify";
import { type Response } from "express";
import { type AuthRequest } from "../middleware/authMiddleware.js";
import { HttpStatusCode } from "../enums/HttpStatusCode.js";
import { uploadToCloudinary } from "../utils/cloudinaryUpload.js";
import logger from "../logger/logger.js";
import { CustomError } from "../utils/CustomError.js";

@injectable()
export class MessageController {
  constructor() {}

  public uploadChatFile = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        throw new CustomError("No file uploaded.", HttpStatusCode.BAD_REQUEST);
      }
      const fileUrl = await uploadToCloudinary(req.file.path);

      res.status(HttpStatusCode.OK).json({
        success: true,
        message: "File uploaded successfully",
        url: fileUrl,
      });
    } catch (error: unknown) {
      logger.error("File upload error in controller:", error);

      let statusCode = HttpStatusCode.INTERNAL_SERVER_ERROR;
      let errorMessage = "Failed to upload file";

      if (error instanceof Error) {
        const msg = error.message;

        if (msg?.includes("File size exceeds")) {
          statusCode = HttpStatusCode.BAD_REQUEST;
          errorMessage = msg;
        } else if (msg?.includes("not supported")) {
          statusCode = HttpStatusCode.BAD_REQUEST;
          errorMessage = msg;
        } else if (msg?.includes("authentication failed")) {
          statusCode = HttpStatusCode.INTERNAL_SERVER_ERROR;
          errorMessage = "Server configuration error";
        } else if (msg?.includes("Invalid file format")) {
          statusCode = HttpStatusCode.BAD_REQUEST;
          errorMessage = "Invalid file format";
        }
      }

      res.status(statusCode).json({
        success: false,
        message: errorMessage,
      });
    }
  };
}
