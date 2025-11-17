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
exports.deleteFromCloudinary = exports.uploadToCloudinary = void 0;
const cloudinary_1 = require("cloudinary");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Validate Cloudinary configuration
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;
if (!cloudName || !apiKey || !apiSecret) {
    console.error('Cloudinary configuration missing. Please check environment variables.');
    throw new Error('Cloudinary configuration incomplete');
}
cloudinary_1.v2.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
    timeout: 60000,
});
// Validate file before upload
const validateFile = (filePath) => {
    if (!fs_1.default.existsSync(filePath)) {
        throw new Error('File does not exist');
    }
    const stats = fs_1.default.statSync(filePath);
    const fileSizeMB = stats.size / (1024 * 1024);
    // Check file size (max 10MB for free tier)
    if (fileSizeMB > 10) {
        throw new Error('File size exceeds 10MB limit');
    }
    // Check file extension
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff'];
    const ext = path_1.default.extname(filePath).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
        throw new Error(`File type ${ext} not supported. Allowed: ${allowedExtensions.join(', ')}`);
    }
};
const uploadToCloudinary = (filePath_1, ...args_1) => __awaiter(void 0, [filePath_1, ...args_1], void 0, function* (filePath, retryCount = 0) {
    var _a, _b, _c, _d;
    const maxRetries = 3;
    try {
        // Validate file before attempting upload
        validateFile(filePath);
        console.log(`Attempting to upload file: ${filePath} (attempt ${retryCount + 1}/${maxRetries + 1})`);
        const result = yield cloudinary_1.v2.uploader.upload(filePath, {
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
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
            console.log(`Cleaned up local file: ${filePath}`);
        }
        return result.public_id;
    }
    catch (error) {
        // Enhanced error logging
        console.error('Cloudinary upload error details:', {
            message: error.message,
            http_code: error.http_code,
            error_code: ((_a = error.error) === null || _a === void 0 ? void 0 : _a.code) || error.code,
            name: error.name,
            stack: (_b = error.stack) === null || _b === void 0 ? void 0 : _b.substring(0, 500), // Limit stack trace length
            filePath,
            retryCount
        });
        // Clean up local file on error
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
            console.log(`Cleaned up local file after error: ${filePath}`);
        }
        // Retry logic for transient errors
        const isRetryableError = (error.http_code === 500 || // Internal server error
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
            yield new Promise(resolve => setTimeout(resolve, delay));
            return (0, exports.uploadToCloudinary)(filePath, retryCount + 1);
        }
        // Provide more specific error messages
        if ((_c = error.message) === null || _c === void 0 ? void 0 : _c.includes('File size')) {
            throw new Error('File is too large. Maximum size is 10MB.');
        }
        else if ((_d = error.message) === null || _d === void 0 ? void 0 : _d.includes('not supported')) {
            throw new Error(error.message);
        }
        else if (error.http_code === 401) {
            throw new Error('Cloudinary authentication failed. Please check credentials.');
        }
        else if (error.http_code === 400) {
            throw new Error('Invalid file format or corrupted file.');
        }
        else if (error.http_code === 413) {
            throw new Error('File is too large for Cloudinary to process.');
        }
        else if (error.http_code === 415) {
            throw new Error('Unsupported file format.');
        }
        else if (error.code === 'ETIMEDOUT') {
            throw new Error('Upload timed out. Please try again.');
        }
        else if (error.code === 'ENOTFOUND') {
            throw new Error('Network error. Please check your internet connection.');
        }
        else {
            const errorMsg = error.message || 'Unknown error occurred during upload';
            throw new Error(`Failed to upload image to Cloudinary: ${errorMsg}`);
        }
    }
});
exports.uploadToCloudinary = uploadToCloudinary;
const deleteFromCloudinary = (publicId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield cloudinary_1.v2.uploader.destroy(publicId);
        return result;
    }
    catch (error) {
        console.error('Cloudinary deletion error:', error);
        throw new Error('Failed to delete image from Cloudinary.');
    }
});
exports.deleteFromCloudinary = deleteFromCloudinary;
