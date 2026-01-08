var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { injectable } from "inversify";
import { HttpStatusCode } from "../enums/HttpStatusCode";
import { uploadToCloudinary } from "../utils/cloudinaryUpload";
import logger from "../logger/logger";
import { CustomError } from "../utils/CustomError";
let MessageController = class MessageController {
    constructor() { }
    uploadChatFile = async (req, res) => {
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
        }
        catch (error) {
            logger.error("File upload error in controller:", error);
            let statusCode = HttpStatusCode.INTERNAL_SERVER_ERROR;
            let errorMessage = "Failed to upload file";
            if (error instanceof Error) {
                const msg = error.message;
                if (msg?.includes("File size exceeds")) {
                    statusCode = HttpStatusCode.BAD_REQUEST;
                    errorMessage = msg;
                }
                else if (msg?.includes("not supported")) {
                    statusCode = HttpStatusCode.BAD_REQUEST;
                    errorMessage = msg;
                }
                else if (msg?.includes("authentication failed")) {
                    statusCode = HttpStatusCode.INTERNAL_SERVER_ERROR;
                    errorMessage = "Server configuration error";
                }
                else if (msg?.includes("Invalid file format")) {
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
};
MessageController = __decorate([
    injectable(),
    __metadata("design:paramtypes", [])
], MessageController);
export { MessageController };
