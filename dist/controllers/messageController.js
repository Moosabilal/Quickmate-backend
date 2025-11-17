"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageController = void 0;
const inversify_1 = require("inversify");
const HttpStatusCode_1 = require("../enums/HttpStatusCode");
const cloudinaryUpload_1 = require("../utils/cloudinaryUpload");
let MessageController = class MessageController {
    constructor() {
        this.uploadChatFile = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                if (!req.file) {
                    res.status(HttpStatusCode_1.HttpStatusCode.BAD_REQUEST).json({
                        success: false,
                        message: "No file uploaded."
                    });
                    return;
                }
                console.log(`Processing file upload: ${req.file.originalname}, size: ${req.file.size} bytes`);
                const baseUrl = process.env.CLOUDINARY_BASE_URL;
                if (!baseUrl) {
                    console.error('CLOUDINARY_BASE_URL environment variable not set');
                    res.status(HttpStatusCode_1.HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                        success: false,
                        message: "Server configuration error"
                    });
                    return;
                }
                const publicId = yield (0, cloudinaryUpload_1.uploadToCloudinary)(req.file.path);
                const fileUrl = publicId.replace(baseUrl, '');
                console.log(`File uploaded successfully: ${publicId}`);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json({
                    success: true,
                    message: "File uploaded successfully",
                    url: fileUrl
                });
            }
            catch (error) {
                console.error('File upload error in controller:', error.message);
                // Return appropriate error response based on error type
                let statusCode = HttpStatusCode_1.HttpStatusCode.INTERNAL_SERVER_ERROR;
                let errorMessage = "Failed to upload file";
                if ((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes('File size exceeds')) {
                    statusCode = HttpStatusCode_1.HttpStatusCode.BAD_REQUEST;
                    errorMessage = error.message;
                }
                else if ((_b = error.message) === null || _b === void 0 ? void 0 : _b.includes('not supported')) {
                    statusCode = HttpStatusCode_1.HttpStatusCode.BAD_REQUEST;
                    errorMessage = error.message;
                }
                else if ((_c = error.message) === null || _c === void 0 ? void 0 : _c.includes('authentication failed')) {
                    statusCode = HttpStatusCode_1.HttpStatusCode.INTERNAL_SERVER_ERROR;
                    errorMessage = "Server configuration error";
                }
                else if ((_d = error.message) === null || _d === void 0 ? void 0 : _d.includes('Invalid file format')) {
                    statusCode = HttpStatusCode_1.HttpStatusCode.BAD_REQUEST;
                    errorMessage = "Invalid file format";
                }
                res.status(statusCode).json({
                    success: false,
                    message: errorMessage
                });
            }
        });
    }
};
exports.MessageController = MessageController;
exports.MessageController = MessageController = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], MessageController);
