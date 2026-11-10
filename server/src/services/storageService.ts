import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v2 as cloudinary } from 'cloudinary';
import { logger } from '../utils/logger';

// Configure Cloudinary if credentials provided
const isCloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  logger.info('[Storage] Cloudinary storage configured successfully.');
} else {
  logger.info('[Storage] Cloudinary credentials not provided. Persistent local disk storage enabled in /uploads.');
}

export interface StoredFileResult {
  url: string;
  storageType: 'CLOUDINARY' | 'LOCAL_DISK';
  filename: string;
}

/**
 * Persistently stores an uploaded image file buffer.
 * If Cloudinary is available, uploads to cloud storage.
 * If Cloudinary is not configured or fails, saves to persistent disk storage under /uploads/returns.
 */
export async function storeImageFile(
  fileBuffer: Buffer,
  originalFilename: string,
  subFolder = 'returns'
): Promise<StoredFileResult> {
  // If Cloudinary is configured, attempt Cloudinary upload first
  if (isCloudinaryConfigured) {
    try {
      const result = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: `home-rituals/${subFolder}` },
          (error, res) => {
            if (error || !res) return reject(error || new Error('Cloudinary upload returned null'));
            resolve(res);
          }
        );
        uploadStream.end(fileBuffer);
      });

      logger.info(`[Storage] File uploaded to Cloudinary: ${result.secure_url}`);
      return {
        url: result.secure_url,
        storageType: 'CLOUDINARY',
        filename: result.public_id,
      };
    } catch (cloudErr) {
      logger.warn('[Storage] Cloudinary upload failed, falling back to persistent local disk storage:', cloudErr);
    }
  }

  // Persistent Local Disk Storage
  const uploadDir = path.join(process.cwd(), 'uploads', subFolder);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const ext = path.extname(originalFilename).toLowerCase() || '.jpg';
  const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
  const randomSuffix = crypto.randomBytes(8).toString('hex');
  const filename = `return-${Date.now()}-${randomSuffix}${safeExt}`;
  const filePath = path.join(uploadDir, filename);

  await fs.promises.writeFile(filePath, fileBuffer);
  logger.info(`[Storage] File persistently saved to local disk: ${filePath}`);

  // Return publicly accessible path served via express.static
  const publicUrl = `/uploads/${subFolder}/${filename}`;
  return {
    url: publicUrl,
    storageType: 'LOCAL_DISK',
    filename,
  };
}

