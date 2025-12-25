import { inject, injectable } from "inversify";
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from "../middleware/authMiddleware";
import { HttpStatusCode } from "../enums/HttpStatusCode";
import { uploadToCloudinary } from "../utils/cloudinaryUpload";

@injectable()
export class MessageController {
    constructor() { }

    public uploadChatFile = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.file) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: "No file uploaded."
                });
                return;
            }

            console.log(`Processing file upload: ${req.file.originalname}, size: ${req.file.size} bytes`);

            const fileUrl = await uploadToCloudinary(req.file.path);

            console.log(`File uploaded successfully: ${fileUrl}`);

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: "File uploaded successfully",
                url: fileUrl
            });
        } catch (error: unknown) {
            console.error('File upload error in controller:', error);

            let statusCode = HttpStatusCode.INTERNAL_SERVER_ERROR;
            let errorMessage = "Failed to upload file";

            if (error instanceof Error) {
                const msg = error.message;

                if (msg?.includes('File size exceeds')) {
                    statusCode = HttpStatusCode.BAD_REQUEST;
                    errorMessage = msg;
                } else if (msg?.includes('not supported')) {
                    statusCode = HttpStatusCode.BAD_REQUEST;
                    errorMessage = msg;
                } else if (msg?.includes('authentication failed')) {
                    statusCode = HttpStatusCode.INTERNAL_SERVER_ERROR;
                    errorMessage = "Server configuration error";
                } else if (msg?.includes('Invalid file format')) {
                    statusCode = HttpStatusCode.BAD_REQUEST;
                    errorMessage = "Invalid file format";
                }
            }

            res.status(statusCode).json({
                success: false,
                message: errorMessage
            });
        }
    }
}
