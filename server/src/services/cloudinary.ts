import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { logger } from '../utils/logger';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer in-memory storage
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  },
});

/**
 * Upload buffer to Cloudinary
 */
export async function uploadImage(fileBuffer: Buffer, folder = 'home-rituals'): Promise<{ secure_url: string; public_id: string }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error || !result) {
          logger.error('Cloudinary upload error:', error);
          return reject(error || new Error('Upload failed'));
        }
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
        });
      }
    );
    uploadStream.end(fileBuffer);
  });
}

/**
 * Delete image from Cloudinary
 */
export async function deleteImage(publicId: string): Promise<void> {
  if (!publicId) return;
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    logger.info(`Cloudinary image deleted: ${publicId}. Result: ${JSON.stringify(result)}`);
  } catch (error) {
    logger.error(`Failed to delete Cloudinary image: ${publicId}`, error);
  }
}

/**
 * Utility to extract publicId from a Cloudinary secure_url
 */
export function getPublicIdFromUrl(url: string): string | null {
  try {
    if (!url || !url.includes('cloudinary.com')) return null;
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return null;
    
    // Joint the parts after the folder config (which comes after '/upload/vXXXXXX/')
    const pathParts = parts.slice(uploadIndex + 2); // skips 'upload' and version segment
    const filenameWithExtension = pathParts.join('/');
    const dotIndex = filenameWithExtension.lastIndexOf('.');
    
    if (dotIndex === -1) return filenameWithExtension;
    return filenameWithExtension.substring(0, dotIndex);
  } catch (error) {
    logger.error('Failed to parse Cloudinary URL:', error);
    return null;
  }
}
