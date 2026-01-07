import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import logger from "../logger/logger";
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;
if (!cloudName || !apiKey || !apiSecret) {
    console.error("Cloudinary configuration missing. Please check environment variables.");
    throw new Error("Cloudinary configuration incomplete");
}
cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
    timeout: 100000,
});
const validateFile = (filePath) => {
    if (!fs.existsSync(filePath)) {
        throw new Error("File does not exist");
    }
    const stats = fs.statSync(filePath);
    const fileSizeMB = stats.size / (1024 * 1024);
    if (fileSizeMB > 10) {
        throw new Error("File size exceeds 10MB limit");
    }
    const allowedExtensions = [
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".webp",
        ".bmp",
        ".tiff",
        ".txt",
        ".pdf",
        ".doc",
        ".docx",
        ".xls",
    ];
    const ext = path.extname(filePath).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
        throw new Error(`File type ${ext} not supported. Allowed: ${allowedExtensions.join(", ")}`);
    }
};
export const uploadToCloudinary = async (filePath, retryCount = 0) => {
    const maxRetries = 3;
    try {
        validateFile(filePath);
        const result = await cloudinary.uploader.upload(filePath, {
            folder: "quickmate_images",
            resource_type: "auto",
            type: "authenticated",
            timeout: 60000,
            transformation: [{ width: 1200, height: 1200, crop: "limit" }, { quality: "auto" }],
        });
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        return result.public_id;
    }
    catch (rawError) {
        const error = rawError;
        logger.error("Cloudinary upload error details:", {
            message: error.message,
            http_code: error.http_code,
            error_code: error.error?.code || error.code,
            name: error.name,
            stack: error.stack?.substring(0, 500),
            filePath,
            retryCount,
        });
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            logger.info(`Cleaned up local file after error: ${filePath}`);
        }
        const isRetryableError = error.http_code === 500 ||
            error.http_code === 502 ||
            error.http_code === 503 ||
            error.http_code === 504 ||
            error.code === "ETIMEDOUT" ||
            error.code === "ECONNRESET" ||
            error.code === "ENOTFOUND" ||
            !error.http_code;
        if (isRetryableError && retryCount < maxRetries) {
            const delay = Math.pow(2, retryCount) * 1000;
            logger.info(`Retrying upload in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            return uploadToCloudinary(filePath, retryCount + 1);
        }
        if (error.message?.includes("File size")) {
            throw new Error("File is too large. Maximum size is 10MB.");
        }
        else if (error.message?.includes("not supported")) {
            throw new Error(error.message);
        }
        else if (error.http_code === 401) {
            throw new Error("Cloudinary authentication failed. Please check credentials.");
        }
        else if (error.http_code === 400) {
            throw new Error("Invalid file format or corrupted file.");
        }
        else if (error.http_code === 413) {
            throw new Error("File is too large for Cloudinary to process.");
        }
        else if (error.http_code === 415) {
            throw new Error("Unsupported file format.");
        }
        else if (error.code === "ETIMEDOUT") {
            throw new Error("Upload timed out. Please try again.");
        }
        else if (error.code === "ENOTFOUND") {
            throw new Error("Network error. Please check your internet connection.");
        }
        else {
            const errorMsg = error.message || "Unknown error occurred during upload";
            throw new Error(`Failed to upload image to Cloudinary: ${errorMsg}`);
        }
    }
};
// export const getSignedUrl = (publicId: string): string => {
//   if (!publicId) return "";
//   return cloudinary.url(publicId, {
//     type: "authenticated",
//     secure: true,
//     sign_url: true,
//   });
// };
export const getSignedUrl = (publicId) => {
    if (!publicId)
        return "";
    const extension = publicId.split(".").pop()?.toLowerCase();
    let resourceType = "image";
    const videoExtensions = ["mp4", "webm", "mov", "avi", "mkv"];
    const rawExtensions = ["pdf", "doc", "docx", "txt", "zip", "rar", "xls", "xlsx", "csv", "ppt", "pptx"];
    if (videoExtensions.includes(extension || "")) {
        resourceType = "video";
    }
    else if (rawExtensions.includes(extension || "")) {
        resourceType = "raw";
    }
    return cloudinary.url(publicId, {
        type: "authenticated",
        secure: true,
        sign_url: true,
        resource_type: resourceType,
    });
};
export const deleteFromCloudinary = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    }
    catch (error) {
        logger.error("Cloudinary deletion error:", error);
        throw new Error("Failed to delete image from Cloudinary.");
    }
};
