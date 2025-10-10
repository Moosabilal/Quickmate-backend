import { BookingService } from "../services/implementation/bookingService";
import { container } from "../di/container";
import TYPES from "../di/type";
import logger from "../logger/logger";

export function chatSocket(io: any) {
  const bookingService = container.get<BookingService>(TYPES.BookingService);

  io.on("connection", (socket: any) => {

    socket.on("joinBookingRoom", (joiningId: string) => {
      socket.join(joiningId);
      logger.info(`Socket ${socket.id} joined booking room: ${joiningId}`);

      socket.to(joiningId).emit("user:joined", {
        socketId: socket.id,
        joiningId,
      });
    });

    socket.on(
      "sendBookingMessage",
      async ({ joiningId, senderId, text }) => {
        try {
          await bookingService.saveAndEmitMessage(io, joiningId, senderId, text);
        } catch (err) {
          socket.emit("chat:error", { message: "Failed to send message" });
        }
      }
    );

    const forwardEventHandler = (eventName: string) => {
      socket.on(eventName, (payload: { joiningId: string; fromUserId: string }) => {
        if (!payload || !payload.joiningId) {
          logger.warn(`Invalid payload for ${eventName}:`, payload);
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
