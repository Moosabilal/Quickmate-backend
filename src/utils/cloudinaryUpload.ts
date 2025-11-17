import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

// Validate Cloudinary configuration
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  console.error('Cloudinary configuration missing. Please check environment variables.');
  throw new Error('Cloudinary configuration incomplete');
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
  timeout: 60000,
});

// Validate file before upload
const validateFile = (filePath: string): void => {
  if (!fs.existsSync(filePath)) {
    throw new Error('File does not exist');
  }

  const stats = fs.statSync(filePath);
  const fileSizeMB = stats.size / (1024 * 1024);

  // Check file size (max 10MB for free tier)
  if (fileSizeMB > 10) {
    throw new Error('File size exceeds 10MB limit');
  }

  // Check file extension
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff'];
  const ext = path.extname(filePath).toLowerCase();

  if (!allowedExtensions.includes(ext)) {
    throw new Error(`File type ${ext} not supported. Allowed: ${allowedExtensions.join(', ')}`);
  }
};

export const uploadToCloudinary = async (filePath: string, retryCount = 0): Promise<string> => {
  const maxRetries = 3;

  try {
    // Validate file before attempting upload
    validateFile(filePath);

    console.log(`Attempting to upload file: ${filePath} (attempt ${retryCount + 1}/${maxRetries + 1})`);

    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'quickmate_images',
      resource_type: 'auto',
      timeout: 60000,
      // Add transformation for optimization
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' },
        { quality: 'auto' }
      ]
    });

    console.log(`Successfully uploaded to Cloudinary: ${result.public_id}`);

    // Clean up local file after successful upload
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Cleaned up local file: ${filePath}`);
    }

    return result.public_id;
  } catch (error: any) {
    // Enhanced error logging
    console.error('Cloudinary upload error details:', {
      message: error.message,
      http_code: error.http_code,
      error_code: error.error?.code || error.code,
      name: error.name,
      stack: error.stack?.substring(0, 500), // Limit stack trace length
      filePath,
      retryCount
    });

    // Clean up local file on error
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Cleaned up local file after error: ${filePath}`);
    }

    // Retry logic for transient errors
    const isRetryableError = (
      error.http_code === 500 || // Internal server error
      error.http_code === 502 || // Bad gateway
      error.http_code === 503 || // Service unavailable
      error.http_code === 504 || // Gateway timeout
      error.code === 'ETIMEDOUT' ||
      error.code === 'ECONNRESET' ||
      error.code === 'ENOTFOUND' ||
      !error.http_code // Network or unknown errors
    );

    if (isRetryableError && retryCount < maxRetries) {
      const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
      console.log(`Retrying upload in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return uploadToCloudinary(filePath, retryCount + 1);
    }

    // Provide more specific error messages
    if (error.message?.includes('File size')) {
      throw new Error('File is too large. Maximum size is 10MB.');
    } else if (error.message?.includes('not supported')) {
      throw new Error(error.message);
    } else if (error.http_code === 401) {
      throw new Error('Cloudinary authentication failed. Please check credentials.');
    } else if (error.http_code === 400) {
      throw new Error('Invalid file format or corrupted file.');
    } else if (error.http_code === 413) {
      throw new Error('File is too large for Cloudinary to process.');
    } else if (error.http_code === 415) {
      throw new Error('Unsupported file format.');
    } else if (error.code === 'ETIMEDOUT') {
      throw new Error('Upload timed out. Please try again.');
    } else if (error.code === 'ENOTFOUND') {
      throw new Error('Network error. Please check your internet connection.');
    } else {
      const errorMsg = error.message || 'Unknown error occurred during upload';
      throw new Error(`Failed to upload image to Cloudinary: ${errorMsg}`);
    }
  }
};


export const deleteFromCloudinary = async (publicId: string): Promise<any> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary deletion error:', error);
    throw new Error('Failed to delete image from Cloudinary.');
  }
};
