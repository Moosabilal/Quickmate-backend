"use strict";
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
exports.chatSocket = chatSocket;
const container_1 = require("../di/container");
const type_1 = __importDefault(require("../di/type"));
const logger_1 = __importDefault(require("../logger/logger"));
function chatSocket(io) {
    const bookingService = container_1.container.get(type_1.default.BookingService);
    io.on("connection", (socket) => {
        socket.on("joinBookingRoom", (joiningId) => {
            if (!joiningId || typeof joiningId !== 'string' || joiningId.trim() === '') {
                logger_1.default.warn("Invalid joiningId received:", joiningId);
                return;
            }
            socket.join(joiningId);
            logger_1.default.info(`Socket ${socket.id} joined booking room: ${joiningId}`);
            socket.to(joiningId).emit("user:joined", {
                socketId: socket.id,
                joiningId,
            });
        });
        socket.on("sendBookingMessage", (messageData) => __awaiter(this, void 0, void 0, function* () {
            if (!messageData || !messageData.joiningId || !messageData.senderId) {
                logger_1.default.warn("Invalid message data received:", messageData);
                socket.emit("chat:error", { message: "Invalid message data" });
                return;
            }
            try {
                yield bookingService.saveAndEmitMessage(io, messageData);
            }
            catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                logger_1.default.error("Error in sendBookingMessage:", errorMessage);
                socket.emit("chat:error", { message: "Failed to send message" });
            }
        }));
        const forwardEventHandler = (eventName) => {
            socket.on(eventName, (payload) => {
                if (!payload || !payload.joiningId || !payload.fromUserId) {
                    logger_1.default.warn(`Invalid payload for ${eventName}:`, payload);
                    return;
                }
                if (eventName === "webrtc:offer" && !("offer" in payload && payload.offer)) {
                    logger_1.default.warn(`Missing offer in ${eventName}:`, payload);
                    return;
                }
                if (eventName === "webrtc:answer" && !("answer" in payload && payload.answer)) {
                    logger_1.default.warn(`Missing answer in ${eventName}:`, payload);
                    return;
                }
                if (eventName === "webrtc:ice-candidate" && !("candidate" in payload && payload.candidate)) {
                    logger_1.default.warn(`Missing candidate in ${eventName}:`, payload);
                    return;
                }
                logger_1.default.info(`Forwarding ${eventName} from ${payload.fromUserId} to room ${payload.joiningId}`);
                socket.to(payload.joiningId).emit(eventName, payload);
            });
        };
        forwardEventHandler("webrtc:offer");
        forwardEventHandler("webrtc:answer");
        forwardEventHandler("webrtc:ice-candidate");
        forwardEventHandler("webrtc:hangup");
        forwardEventHandler("webrtc:call-rejected");
        socket.on("disconnect", () => {
            logger_1.default.info(`Client disconnected: ${socket.id}`);
        });
    });
}
