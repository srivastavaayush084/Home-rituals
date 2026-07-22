# Home Rituals API Backend

Production-ready, highly secure Node.js, Express, TypeScript, and Prisma backend with PostgreSQL database support.

## Core Features

- **Authentication**: JWT authentication with forgot/reset password tokens and role-based permissions (`ADMIN` / `USER`).
- **Standardized API Responses**: All endpoints return uniform JSON envelopes.
- **Inventory Control**: Concurrency-safe stock checks and adjustments inside DB transactions.
- **Razorpay Integration**: Native checkout order creation, client signature verification, and webhook handlers.
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
- `DATABASE_URL`: PostgreSQL connection string.
- `JWT_SECRET`: Secure token signer key.
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`: Default credentials seeded on launch.
- `CLOUDINARY_*` keys (Media storage).
- `RAZORPAY_*` keys (Payment gateways).
- `EMAIL_*` SMTP configurations.

### 3. Run Database Migrations

Generate your local PostgreSQL schema and build the client client:

```bash
npx prisma generate
npx prisma migrate dev --name init
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

This backend is designed with configurations fully environment-driven, enabling seamless deployment to platforms like **Heroku, Render, Railway, or Fly.io**.

### Steps for Deployment

1. **Database Setup**: Set up a managed PostgreSQL database (e.g. Supabase, AWS RDS, Neon, or Railway PG). Copy the connection URL.
2. **Environment Variables**: Set the respective variables in your platform's management console (CORS settings, Cloudinary, SMTP, Razorpay).
3. **Build Script**: Ensure the platform runs:
   ```bash
   npm run build
   ```
   This will compile TS into JS under `dist/`.
4. **Start Command**:
   ```bash
   npm start
   ```
5. **Post-deployment Migrations**: Configure the platform to trigger database updates automatically by running `npx prisma migrate deploy` before launching the server.
