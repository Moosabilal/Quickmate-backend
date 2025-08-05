import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs'; 


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: String(process.env.CLOUDINARY_API_KEY),
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
  timeout: 60000, 
});


export const uploadToCloudinary = async (filePath: string): Promise<string> => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'quickmate_images', 
      resource_type: 'auto',
      // timeout: 60000,
    });

    fs.unlinkSync(filePath);

    return result.secure_url; 
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    throw new Error('Failed to upload image to Cloudinary.');
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