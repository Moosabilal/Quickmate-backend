import "reflect-metadata";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import dotenv from "dotenv";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { fileURLToPath } from "url";
dotenv.config();
import { rateLimiter } from "./middleware/rateLimiter.js";
import connectDB from "./config/database.js";

import path from "path";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/adminRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import providerRoutes from "./routes/providerRoute.js";
import addressRoutes from "./routes/address.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import walletRoutes from "./routes/walletRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import chatbotRoutes from "./routes/chatBotRoutes.js";
import fs from "fs";
import { CustomError } from "./utils/CustomError.js";
import { errorHandler } from "./middleware/errorHandler.js";
import logger from "./logger/logger.js";
import { chatSocket } from "./utils/socket.js";
import { startScheduleCleanupJob } from "./jobs/cleanupProviderSchedule.js";
import { startBookingExpiryJob } from "./jobs/expireOverdueBookings.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const app = express();
const PORT = process.env.PORT || 5000;

//database
connectDB();

const allowedOrigins = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(",").map((p) => p.trim()) : [];

// Middleware
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("CORS policy violation: Origin not allowed"));
      }
    },
    credentials: true,
  }),
);
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(rateLimiter);

app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/provider", providerRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/address", addressRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/review", reviewRoutes);
app.use("/api/subscriptionPlan", subscriptionRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/chatbot", chatbotRoutes);

app.use((req, res, next) => {
  const error = new CustomError(`Not Found - ${req.originalUrl}`, 404);
  next(error);
});

app.use(errorHandler);

const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("CORS policy violation: Origin not allowed"));
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

chatSocket(io);

startScheduleCleanupJob();
startBookingExpiryJob();

server.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
