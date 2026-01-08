var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { inject, injectable } from "inversify";
import TYPES from "../di/type";
import { HttpStatusCode } from "../enums/HttpStatusCode";
import { CustomError } from "../utils/CustomError";
let ChatbotController = class ChatbotController {
    _chatbotService;
    constructor(chatbotService) {
        this._chatbotService = chatbotService;
    }
    startSession = async (req, res, next) => {
        try {
            const userId = req.body.userId;
            const session = await this._chatbotService.startSession(userId);
            res.status(HttpStatusCode.OK).json({
                success: true,
                sessionId: session.sessionId,
                message: "Chat session started successfully",
            });
        }
        catch (error) {
            next(error);
        }
    };
    getHistory = async (req, res, next) => {
        try {
            const { sessionId } = req.params;
            const history = await this._chatbotService.getHistory(sessionId);
            res.status(HttpStatusCode.OK).json({
                success: true,
                history,
                count: history.length,
            });
        }
        catch (error) {
            next(error);
        }
    };
    postMessage = async (req, res, next) => {
        try {
            const { sessionId } = req.params;
            const { text } = req.body;
            if (!text || text.trim() === "") {
                throw new CustomError("Message text is required", HttpStatusCode.BAD_REQUEST);
            }
            const response = await this._chatbotService.sendMessage(sessionId, text);
            res.status(HttpStatusCode.OK).json({
                success: true,
                response,
            });
        }
        catch (error) {
            next(error);
        }
    };
    verifyRazorpayPayment = async (req, res, next) => {
        try {
            const { sessionId } = req.params;
            if (!sessionId) {
                throw new CustomError("Session ID is required", HttpStatusCode.BAD_REQUEST);
            }
            const paymentData = req.body;
            const booking = await this._chatbotService.verifyRazorpayPayment(sessionId, paymentData);
            res.status(HttpStatusCode.OK).json({
                success: true,
                booking,
                message: "Payment verified and booking confirmed successfully",
            });
        }
        catch (error) {
            next(error);
        }
    };
};
ChatbotController = __decorate([
    injectable(),
    __param(0, inject(TYPES.ChatbotService)),
    __metadata("design:paramtypes", [Object])
], ChatbotController);
export { ChatbotController };
