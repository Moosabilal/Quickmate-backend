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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatbotController = void 0;
const inversify_1 = require("inversify");
const type_1 = __importDefault(require("../di/type"));
const HttpStatusCode_1 = require("../enums/HttpStatusCode");
const CustomError_1 = require("../utils/CustomError");
let ChatbotController = class ChatbotController {
    constructor(chatbotService) {
        this.startSession = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.body.userId;
                const session = yield this._chatbotService.startSession(userId);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json({ success: true, sessionId: session.sessionId });
            }
            catch (error) {
                next(error);
            }
        });
        this.getHistory = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { sessionId } = req.params;
                const history = yield this._chatbotService.getHistory(sessionId);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json({ success: true, history });
            }
            catch (error) {
                next(error);
            }
        });
        this.postMessage = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { sessionId } = req.params;
                const { text } = req.body;
                if (!text) {
                    throw new CustomError_1.CustomError("Message text is required", HttpStatusCode_1.HttpStatusCode.BAD_REQUEST);
                }
                const response = yield this._chatbotService.sendMessage(sessionId, text);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json({ success: true, response });
            }
            catch (error) {
                next(error);
            }
        });
        this.createRazorpayOrder = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const orderData = req.body;
                const order = yield this._chatbotService.createRazorpayOrder(userId, orderData);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json({ success: true, order });
            }
            catch (error) {
                next(error);
            }
        });
        this.verifyRazorpayPayment = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const paymentData = req.body;
                const booking = yield this._chatbotService.verifyRazorpayPayment(userId, paymentData);
                res.status(HttpStatusCode_1.HttpStatusCode.OK).json({ success: true, booking });
            }
            catch (error) {
                next(error);
            }
        });
        this._chatbotService = chatbotService;
    }
};
exports.ChatbotController = ChatbotController;
exports.ChatbotController = ChatbotController = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(type_1.default.ChatbotService)),
    __metadata("design:paramtypes", [Object])
], ChatbotController);
