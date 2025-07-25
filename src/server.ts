import 'reflect-metadata'
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser'
import helmet from 'helmet';
import dotenv from 'dotenv';
dotenv.config();
import authRoutes from './routes/auth';
import { rateLimiter } from './middleware/rateLimiter';
import connectDB from './config/database';
import path from 'path';
import categoryRoutes from './routes/categoryRoutes'
import providerRoutes from './routes/providerRoute'
import addressRoutes from './routes/address'
import fs from 'fs';
import { CustomError } from './utils/CustomError';
import { errorHandler } from './middleware/errorHandler';



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

app.use((req, res, next) => {
  const error = new CustomError(`Not Found - ${req.originalUrl}`, 404)
  next(error)
})

app.use(errorHandler)

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));