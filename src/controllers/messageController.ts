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
                res.status(HttpStatusCode.BAD_REQUEST).json({ message: "No file uploaded." });
            }

            const baseUrl = process.env.CLOUDINARY_BASE_URL;
            const fileUrl = (await uploadToCloudinary(req.file.path)).replace(baseUrl, '');
            
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: "File uploaded successfully",
                url: fileUrl
            });
        } catch (error) {
            next(error);
        }
    }
}