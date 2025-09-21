import { BookingService } from "../services/implementation/bookingService";
import { container } from "../di/container";
import TYPES from "../di/type";
import logger from "../logger/logger";

export function chatSocket(io: any) {
  const bookingService = container.get<BookingService>(TYPES.BookingService);

  io.on("connection", (socket: any) => {
    logger.info("New client connected:", socket.id);

    socket.on("joinBookingRoom", (joiningId: string) => {
      socket.join(joiningId);
      logger.info(`Socket ${socket.id} joined booking room: ${joiningId}`);
      
      socket.to(joiningId).emit("user:joined", { 
        socketId: socket.id, 
        joiningId 
      });
    });

    socket.on(
      "sendBookingMessage",
      async ({ joiningId, senderId, text }) => {
        console.log('the daat of joining', joiningId, senderId, text)
        try {
          await bookingService.saveAndEmitMessage(
            io,
            joiningId,
            senderId,
            text
          );
        } catch (err) {
          console.error("Failed to save message:", err);
          socket.emit("chat:error", { message: "Failed to send message" });
        }
      }
    );

    socket.on("webrtc:offer", (payload: { joiningId: string; offer: RTCSessionDescriptionInit; fromUserId: string; }) => {
      const { joiningId, fromUserId } = payload || {};
      if (!joiningId) {
        logger.info("Invalid offer payload - missing joiningId");
        return;
      }
      
      logger.info(`Forwarding offer from ${fromUserId} to room ${joiningId}`);
      socket.to(joiningId).emit("webrtc:offer", payload);
    });

    socket.on("webrtc:answer", (payload: { joiningId: string; answer: RTCSessionDescriptionInit; fromUserId: string; }) => {
      const { joiningId, fromUserId } = payload || {};
      if (!joiningId) {
        logger.info("Invalid answer payload - missing joiningId");
        return;
      }
      
      logger.info(`Forwarding answer from ${fromUserId} to room ${joiningId}`);
      socket.to(joiningId).emit("webrtc:answer", payload);
    });

    socket.on("webrtc:ice-candidate", (payload: { joiningId: string; candidate: RTCIceCandidateInit; fromUserId: string; }) => {
      const { joiningId, fromUserId } = payload || {};
      if (!joiningId) {
        logger.info("Invalid ICE candidate payload - missing joiningId");
        return;
      }
      
      logger.info(`Forwarding ICE candidate from ${fromUserId} to room ${joiningId}`);
      socket.to(joiningId).emit("webrtc:ice-candidate", payload);
    });

    socket.on("webrtc:hangup", (payload: { joiningId: string; fromUserId: string }) => {
      const { joiningId, fromUserId } = payload || {};
      if (!joiningId) {
        logger.info("Invalid hangup payload - missing joiningId");
        return;
      }
      
      logger.info(`Forwarding hangup from ${fromUserId} to room ${joiningId}`);
      socket.to(joiningId).emit("webrtc:hangup", payload);
    });

    socket.on("webrtc:call-rejected", (payload: { joiningId: string, fromUserId: string; toUserId: string }) => {
      const { joiningId, fromUserId } = payload || {};
      if (!joiningId) {
        logger.info("Invalid call rejection payload - missing joiningId");
        return;
      }
      
      logger.info(`Call rejected by ${fromUserId} in room ${joiningId}`);
      socket.to(joiningId).emit("webrtc:call-rejected", payload);
    });

    socket.on("disconnect", () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });
}