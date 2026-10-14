# Home Rituals API Backend

Production-ready, highly secure Node.js, Express, TypeScript, and Prisma backend with MongoDB database support.

## Core Features

- **Authentication**: JWT authentication with forgot/reset password tokens and role-based permissions (`ADMIN` / `USER`).
- **Standardized API Responses**: All endpoints return uniform JSON envelopes.
- **Inventory Control**: Concurrency-safe stock checks and adjustments inside DB transactions.
- **Razorpay Payment Gateway**: Seamless Sandbox/Test and Live/Production checkout, cryptographic HMAC-SHA256 signature verification, and idempotent webhook handling.
- **Media Storage**: Cloudinary uploader with automated deletion of stale image assets.
- **Email Notifications**: Branded transactional emails powered by Nodemailer.
- **Soft Delete**: Soft deletion support on products, categories, and blogs.
- **Performance**: Pagination on lists and database indexes on core columns.
- **Security**: Helmet headers, CORS filters, request rate limits, and XSS parameter sanitization.
- **Interactive Documentation**: Interactive OpenAPI Swagger dashboard.

---

## Getting Started

### 1. Installation

Install all backend dependencies:

```bash
cd server
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env` and fill in the required keys:

```bash
cp .env.example .env
```

Ensure you configure:
- `DATABASE_URL`: MongoDB connection string (e.g. `mongodb://localhost:27017/homerituals` or MongoDB Atlas URI `mongodb+srv://...`).
- `JWT_SECRET`: Secure token signer key (minimum 32 characters in production).
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`: Administrator credentials seeded on launch.
- `CLOUDINARY_*` keys (Media storage).
- `RAZORPAY_*` keys (Payment gateway credentials).
- `EMAIL_*` SMTP configurations.

### 3. Push Database Schema

Generate Prisma client and push your schema to MongoDB:

```bash
npm run prisma:generate
npm run prisma:push
```

### 4. Seed Database

Seed categories, products, blogs, and create the default administrator:

```bash
npm run seed
```

### 5. Start Server

Start the development server:

```bash
npm run dev
```

The server will spin up on `http://localhost:5000`. You can access:
- Health check: `GET http://localhost:5000/api/health`
- Swagger Docs: `http://localhost:5000/api-docs`

---

## Deployment Guide

This backend is designed with configurations fully environment-driven, enabling seamless deployment to platforms like **Heroku, Render, Railway, VPS, or DigitalOcean**.

### Steps for Deployment

1. **Database Setup**: Set up a managed MongoDB replica set database (e.g. MongoDB Atlas, Railway MongoDB). Copy the connection URI.
2. **Environment Variables**: Set the respective variables in your platform's management console (CORS settings, Cloudinary, SMTP, Razorpay).
3. **Build Script**: Ensure the platform runs:
   ```bash
   npm run build
   ```
   This will run `prisma generate` and compile TypeScript into JavaScript under `dist/`.
4. **Start Command**:
   ```bash
   npm start
   ```
5. **Schema Synchronization**: When updating schema models on MongoDB, run `npx prisma db push` during deployment.

