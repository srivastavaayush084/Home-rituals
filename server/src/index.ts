import dotenv from 'dotenv';
// Load environment variables first
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';

import { logger } from './utils/logger';
import { connectDB } from './utils/db';
import { errorHandler } from './middleware/errorHandler';
import { authenticateToken } from './middleware/auth';
import { xssSanitizer } from './middleware/validator';

// Import Routes
import authRoutes from './routes/authRoutes';
import categoryRoutes from './routes/categoryRoutes';
import productRoutes from './routes/productRoutes';
import cartRoutes from './routes/cartRoutes';
import wishlistRoutes from './routes/wishlistRoutes';
import addressRoutes from './routes/addressRoutes';
import orderRoutes from './routes/orderRoutes';
import paymentRoutes from './routes/paymentRoutes';
import reviewRoutes from './routes/reviewRoutes';
import blogRoutes from './routes/blogRoutes';
import contactRoutes from './routes/contactRoutes';
import newsletterRoutes from './routes/newsletterRoutes';
import adminRoutes from './routes/adminRoutes';
import bannerRoutes from './routes/bannerRoutes';

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// Security HTTP headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Global Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many requests from this IP, please try again after a few minutes',
      code: 'TOO_MANY_REQUESTS',
    },
  },
});

// Apply rate limiting to all requests
app.use('/api', apiLimiter);

// Parse JSON and urlencoded requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom XSS Sanitizer middleware
app.use(xssSanitizer);

// Request Logger (morgan)
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => logger.http(message.trim()),
    },
  })
);

// Mount Authenticate Token middleware globally
app.use(authenticateToken);

// Load Swagger JSON if it exists
let swaggerDocument;
const swaggerPath = path.join(__dirname, 'docs/swagger.json');
try {
  if (fs.existsSync(swaggerPath)) {
    swaggerDocument = JSON.parse(fs.readFileSync(swaggerPath, 'utf8'));
  }
} catch (error) {
  logger.warn('Failed to load Swagger documentation file:', error);
}

if (swaggerDocument) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  logger.info(`Swagger API docs available at http://localhost:${PORT}/api-docs`);
}

// Basic Health Check
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    status: 'UP',
    uptime: process.uptime(),
    timestamp: new Date(),
  });
});

// API Routes mounting
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/banners', bannerRoutes);

// Fallback Route for Undefined Envelopes
app.use('*', (_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'API route not found',
      code: 'API_ROUTE_NOT_FOUND',
    },
  });
});

// Centralized error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
export default app;
