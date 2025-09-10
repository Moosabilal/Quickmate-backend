import { BookingService } from "../services/implementation/bookingService";
import { container } from "../di/container";
import TYPES from "../di/type";
import logger from "../logger/logger";

export function chatSocket(io: any) {
  const bookingService = container.get<BookingService>(TYPES.BookingService);

  io.on("connection", (socket: any) => {
    logger.info("New client connected:", socket.id);

    socket.on("joinBookingRoom", (bookingId: string) => {
      socket.join(bookingId);
      logger.info(`Socket ${socket.id} joined booking room: ${bookingId}`);
      
      socket.to(bookingId).emit("user:joined", { 
        socketId: socket.id, 
        bookingId 
      });
    });

    socket.on(
      "sendBookingMessage",
      async ({ bookingId, senderId, text }) => {
        try {
          await bookingService.saveAndEmitMessage(
            io,
            bookingId,
            senderId,
            text
          );
        } catch (err) {
          console.error("Failed to save message:", err);
          socket.emit("chat:error", { message: "Failed to send message" });
        }
      }
    );

    socket.on("webrtc:offer", (payload: { bookingId: string; offer: RTCSessionDescriptionInit; fromUserId: string; }) => {
      const { bookingId, fromUserId } = payload || {};
      if (!bookingId) {
        logger.info("Invalid offer payload - missing bookingId");
        return;
      }
      
      logger.info(`Forwarding offer from ${fromUserId} to room ${bookingId}`);
      socket.to(bookingId).emit("webrtc:offer", payload);
    });

    socket.on("webrtc:answer", (payload: { bookingId: string; answer: RTCSessionDescriptionInit; fromUserId: string; }) => {
      const { bookingId, fromUserId } = payload || {};
      if (!bookingId) {
        logger.info("Invalid answer payload - missing bookingId");
        return;
      }
      
      logger.info(`Forwarding answer from ${fromUserId} to room ${bookingId}`);
      socket.to(bookingId).emit("webrtc:answer", payload);
    });

    socket.on("webrtc:ice-candidate", (payload: { bookingId: string; candidate: RTCIceCandidateInit; fromUserId: string; }) => {
      const { bookingId, fromUserId } = payload || {};
      if (!bookingId) {
        logger.info("Invalid ICE candidate payload - missing bookingId");
        return;
      }
      
      logger.info(`Forwarding ICE candidate from ${fromUserId} to room ${bookingId}`);
      socket.to(bookingId).emit("webrtc:ice-candidate", payload);
    });

    socket.on("webrtc:hangup", (payload: { bookingId: string; fromUserId: string }) => {
      const { bookingId, fromUserId } = payload || {};
      if (!bookingId) {
        logger.info("Invalid hangup payload - missing bookingId");
        return;
      }
      
      logger.info(`Forwarding hangup from ${fromUserId} to room ${bookingId}`);
      socket.to(bookingId).emit("webrtc:hangup", payload);
    });

    socket.on("webrtc:call-rejected", (payload: { bookingId: string; fromUserId: string; toUserId: string }) => {
      const { bookingId, fromUserId } = payload || {};
      if (!bookingId) {
        logger.info("Invalid call rejection payload - missing bookingId");
        return;
      }
      
      logger.info(`Call rejected by ${fromUserId} in room ${bookingId}`);
      socket.to(bookingId).emit("webrtc:call-rejected", payload);
    });

    socket.on("disconnect", () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });
}