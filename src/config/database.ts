import mongoose from 'mongoose';
import config from '.'; 
import logger from '../logger/logger';

const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(config.MONGO_URI);
    logger.info('MongoDB Connected...');
  } catch (err: unknown) {
    if (err instanceof Error) {
      logger.error('MongoDB connection error:', err.message);
    } else {
      logger.error('MongoDB connection error:', String(err));
    }
    process.exit(1); 
  }
};

export default connectDB;
