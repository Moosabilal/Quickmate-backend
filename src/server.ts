import 'reflect-metadata'
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser'
import helmet from 'helmet';
import dotenv from 'dotenv';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
dotenv.config();
import authRoutes from './routes/auth';
import { rateLimiter } from './middleware/rateLimiter';
import connectDB from './config/database';

import path from 'path';
import categoryRoutes from './routes/categoryRoutes'
import providerRoutes from './routes/providerRoute'
import addressRoutes from './routes/address'
import bookingRoutes from './routes/bookingRoutes'
import serviceRoutes from './routes/serviceRoutes'
import walletRoutes from './routes/walletRoutes'
import reviewRoutes from './routes/reviewRoutes'
import fs from 'fs';
import { CustomError } from './utils/CustomError';
import { errorHandler } from './middleware/errorHandler';
import logger from './logger/logger';
import { chatSocket } from './utils/socket';


const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}



const app = express();
const PORT = process.env.PORT || 5000;

//database
connectDB()

// Middleware
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));
app.use(helmet()); 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()) 
// app.use(rateLimiter);


app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));


app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/provider', providerRoutes);
app.use('/api/address', addressRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/services', serviceRoutes)
app.use('/api/wallet', walletRoutes)
app.use('/api/review', reviewRoutes)

app.use((req, res, next) => {
  const error = new CustomError(`Not Found - ${req.originalUrl}`, 404)
  next(error)
})

app.use(errorHandler)

const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

chatSocket(io)



server.listen(PORT, () => logger.info(`Server running on port ${PORT}`));