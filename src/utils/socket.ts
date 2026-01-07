import { type BookingService } from "../services/implementation/bookingService";
import { container } from "../di/container";
import TYPES from "../di/type";
import logger from "../logger/logger";
import { type ISocketMessage } from "../interface/message";
import { type Server, type Socket } from "socket.io";
import { type WebRTCPayload } from "../interface/socket";

export function chatSocket(io: Server) {
  const bookingService = container.get<BookingService>(TYPES.BookingService);

  io.on("connection", (socket: Socket) => {
    socket.on("joinBookingRoom", (joiningId: string) => {
      if (!joiningId || typeof joiningId !== "string" || joiningId.trim() === "") {
        logger.warn("Invalid joiningId received:", joiningId);
        return;
      }
      socket.join(joiningId);
      logger.info(`Socket ${socket.id} joined booking room: ${joiningId}`);

      socket.to(joiningId).emit("user:joined", {
        socketId: socket.id,
        joiningId,
      });
    });

    socket.on("sendBookingMessage", async (messageData: ISocketMessage) => {
      if (!messageData || !messageData.joiningId || !messageData.senderId) {
        logger.warn("Invalid message data received:", messageData);
        socket.emit("chat:error", { message: "Invalid message data" });
        return;
      }
      try {
        await bookingService.saveAndEmitMessage(io, messageData);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        logger.error("Error in sendBookingMessage:", errorMessage);
        socket.emit("chat:error", { message: "Failed to send message" });
      }
    });

    const forwardEventHandler = (eventName: string) => {
      socket.on(eventName, (payload: WebRTCPayload) => {
        if (!payload || !payload.joiningId || !payload.fromUserId) {
          logger.warn(`Invalid payload for ${eventName}:`, payload);
          return;
        }
        if (eventName === "webrtc:offer" && !("offer" in payload && payload.offer)) {
          logger.warn(`Missing offer in ${eventName}:`, payload);
          return;
        }
        if (eventName === "webrtc:answer" && !("answer" in payload && payload.answer)) {
          logger.warn(`Missing answer in ${eventName}:`, payload);
          return;
        }
        if (eventName === "webrtc:ice-candidate" && !("candidate" in payload && payload.candidate)) {
          logger.warn(`Missing candidate in ${eventName}:`, payload);
          return;
        }
        logger.info(`Forwarding ${eventName} from ${payload.fromUserId} to room ${payload.joiningId}`);
        socket.to(payload.joiningId).emit(eventName, payload);
      });
    };

    forwardEventHandler("webrtc:offer");
    forwardEventHandler("webrtc:answer");
    forwardEventHandler("webrtc:ice-candidate");
    forwardEventHandler("webrtc:hangup");
    forwardEventHandler("webrtc:call-rejected");

    socket.on("disconnect", () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });
}
