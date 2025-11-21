import { inject, injectable } from "inversify";
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from "../middleware/authMiddleware";
import { HttpStatusCode } from "../enums/HttpStatusCode";
import { uploadToCloudinary } from "../utils/cloudinaryUpload";

@injectable()
export class MessageController {
    constructor() {}

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

            const baseUrl = process.env.CLOUDINARY_BASE_URL;
            if (!baseUrl) {
                console.error('CLOUDINARY_BASE_URL environment variable not set');
                res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                    success: false,
                    message: "Server configuration error"
                });
                return;
            }

            const publicId = await uploadToCloudinary(req.file.path);
            const fileUrl = publicId.replace(baseUrl, '');

            console.log(`File uploaded successfully: ${publicId}`);

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: "File uploaded successfully",
                url: fileUrl
            });
        } catch (error: any) {
            console.error('File upload error in controller:', error.message);

            let statusCode = HttpStatusCode.INTERNAL_SERVER_ERROR;
            let errorMessage = "Failed to upload file";

            if (error.message?.includes('File size exceeds')) {
                statusCode = HttpStatusCode.BAD_REQUEST;
                errorMessage = error.message;
            } else if (error.message?.includes('not supported')) {
                statusCode = HttpStatusCode.BAD_REQUEST;
                errorMessage = error.message;
            } else if (error.message?.includes('authentication failed')) {
                statusCode = HttpStatusCode.INTERNAL_SERVER_ERROR;
                errorMessage = "Server configuration error";
            } else if (error.message?.includes('Invalid file format')) {
                statusCode = HttpStatusCode.BAD_REQUEST;
                errorMessage = "Invalid file format";
            }

            res.status(statusCode).json({
                success: false,
                message: errorMessage
            });
        }
    }
}
