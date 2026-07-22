import { Request, Response, NextFunction } from 'express';
import { uploadImage } from '../services/cloudinary';
import { sendSuccess, BadRequestError } from '../utils/response';

/**
 * Handles image upload requests from client
 */
export async function uploadImageController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      throw new BadRequestError('No file uploaded or file format is invalid');
    }
    
    // Default to 'home-rituals' folder if not specified
    const folder = req.body.folder || 'home-rituals';
    
    const result = await uploadImage(req.file.buffer, folder);
    
    return sendSuccess(
      res,
      {
        url: result.secure_url,
        publicId: result.public_id,
      },
      200,
      'Image uploaded successfully'
    );
  } catch (error) {
    next(error);
  }
}
