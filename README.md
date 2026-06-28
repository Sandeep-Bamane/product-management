# Product Management Platform

A full-stack product management system with user authentication, category and product CRUD, bulk CSV/XLSX import, and downloadable reports. Long-running operations (bulk upload, report generation) are offloaded to background workers via BullMQ so HTTP requests never time out.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Bulk Upload Format](#bulk-upload-format)
- [Running Tests](#running-tests)
- [Postman Collection](#postman-collection)
- [Key Design Decisions](#key-design-decisions)

---

## Tech Stack

| Layer       | Technology          | Version |
|-------------|---------------------|---------|
| Frontend    | Angular (Standalone + Signals) | 19.x |
| UI Library  | Angular Material    | 19.x    |
| Backend     | NestJS              | 11.x    |
| Language    | TypeScript          | 5.x     |
| ORM         | Prisma              | 6.x     |
| Database    | PostgreSQL          | 16.x    |
| Job Queue   | BullMQ              | 5.x     |
| Queue Store | Redis               | 7.x     |
| Runtime     | Node.js LTS         | 22.x    |

---

## Architecture Overview

```
Browser (Angular SPA)
        │  HTTP + JWT Bearer
        ▼
NestJS REST API  ──── Prisma ────▶  PostgreSQL
        │
      BullMQ ──── ioredis ────▶  Redis
        │
 Background Workers
   ├── BulkUploadProcessor   (parses CSV/XLSX, inserts products in batches)
   └── ReportsProcessor      (streams products → CSV/XLSX file, cursor-paged)
```

**Auth flow:** Every route is protected by a global `JwtAuthGuard`. Only `POST /api/auth/login` is marked `@Public()`. The guard attaches the decoded user to `req.user`; controllers pull `user.id` via `@CurrentUser('id')` for audit tracking.

**Async jobs:** Bulk upload and report generation return a `jobId` immediately (< 200 ms). The frontend polls the status endpoint every 2 seconds and shows a live progress bar.

---

## Project Structure

```
product-management/
├── docker-compose.yml          # PostgreSQL + Redis
├── .env.example                # Environment variable template
├── Product-Management-API.postman_collection.json
├── newman-test-collection.json # Automated test suite (55 assertions)
├── test-bulk-upload.csv        # Sample bulk upload file
│
├── backend/                    # NestJS 11 API
│   ├── prisma/
│   │   ├── schema.prisma       # Single source of truth for DB models
│   │   ├── migrations/
│   │   └── seed.ts             # Creates default admin user
│   └── src/
│       ├── modules/
│       │   ├── auth/           # Login, JWT strategy
│       │   ├── users/          # User CRUD
│       │   ├── categories/     # Category CRUD
│       │   ├── products/       # Product CRUD + paginated list
│       │   ├── bulk-upload/    # File upload + background processor
│       │   └── reports/        # Report request + background processor
│       ├── common/
│       │   ├── decorators/     # @Public(), @CurrentUser()
│       │   ├── guards/         # JwtAuthGuard
│       │   ├── interceptors/   # Response envelope wrapper
│       │   └── filters/        # Global HTTP exception filter
│       └── prisma/             # PrismaService (global module)
│
└── frontend/                   # Angular 19 SPA
    └── src/app/
        ├── core/               # Auth service, guards, interceptors, models
        ├── features/
        │   ├── auth/           # Login page
        │   ├── dashboard/      # Home page
        │   ├── users/          # User management
        │   ├── categories/     # Category management
        │   ├── products/       # Product list + forms
        │   └── reports/        # Report request + download
        └── shared/
            └── components/
                └── job-progress/  # Live polling progress bar + download
```

---

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for PostgreSQL + Redis)
- Node.js 22.x
- npm 10.x

### 1. Clone and configure

```bash
cd product-management
cp .env.example backend/.env
```

### 2. Start infrastructure

```bash
docker compose up -d
```

This starts PostgreSQL on port **5432** and Redis on port **6379**.

### 3. Start the backend

```bash
cd backend
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

Backend runs at **http://localhost:3000**

The seed creates a default admin account:

| Field    | Value               |
|----------|---------------------|
| Email    | admin@example.com   |
| Password | admin123            |

### 4. Start the frontend

```bash
cd frontend
npm install
ng serve
```

Frontend runs at **http://localhost:4200**

---

## Environment Variables

Copy `.env.example` to `backend/.env` and adjust as needed.

| Variable        | Default                                              | Description                      |
|-----------------|------------------------------------------------------|----------------------------------|
| `DATABASE_URL`  | `postgresql://admin:secret@localhost:5432/product_mgmt` | Prisma connection string      |
| `JWT_SECRET`    | *(set to a long random string)*                      | Signs JWT access tokens          |
| `JWT_EXPIRES_IN`| `7d`                                                 | Token lifetime                   |
| `REDIS_HOST`    | `localhost`                                          | BullMQ Redis host                |
| `REDIS_PORT`    | `6379`                                               | BullMQ Redis port                |
| `PORT`          | `3000`                                               | HTTP server port                 |
| `NODE_ENV`      | `development`                                        | Environment flag                 |

---

## API Reference

Base URL: `http://localhost:3000/api`

All responses are wrapped in an envelope:
```json
{ "data": <payload>, "statusCode": 200, "timestamp": "2026-06-28T..." }
```

All endpoints require `Authorization: Bearer <token>` except **Login**.

### Authentication

| Method | Path            | Description        |
|--------|-----------------|--------------------|
| POST   | `/auth/login`   | Login, returns JWT |

**Request body:**
```json
{ "email": "admin@example.com", "password": "admin123" }
```

**Response:**
```json
{ "data": { "accessToken": "eyJ..." } }
```

---

### Users

| Method | Path          | Description        |
|--------|---------------|--------------------|
| GET    | `/users`      | List all users     |
| POST   | `/users`      | Create a user      |
| GET    | `/users/:id`  | Get user by ID     |
| PUT    | `/users/:id`  | Update user        |
| DELETE | `/users/:id`  | Delete user        |

Passwords are never returned in responses.

---

### Categories

| Method | Path               | Description         |
|--------|--------------------|---------------------|
| GET    | `/categories`      | List all categories |
| POST   | `/categories`      | Create a category   |
| GET    | `/categories/:id`  | Get category by ID  |
| PUT    | `/categories/:id`  | Update category     |
| DELETE | `/categories/:id`  | Delete category     |

Each category has a human-readable `uniqueId` (e.g. `CAT-X7F3K2`) auto-generated on create. Deletion is blocked when the category has products.

---

### Products

| Method | Path              | Description                    |
|--------|-------------------|--------------------------------|
| GET    | `/products`       | Paginated + filterable list    |
| POST   | `/products`       | Create product (multipart/form-data) |
| GET    | `/products/:id`   | Get product by ID              |
| PUT    | `/products/:id`   | Update product (multipart/form-data) |
| DELETE | `/products/:id`   | Delete product                 |

**Query parameters for `GET /products`:**

| Parameter   | Type   | Default    | Description                          |
|-------------|--------|------------|--------------------------------------|
| `page`      | number | `1`        | Page number                          |
| `limit`     | number | `10`       | Items per page                       |
| `sortBy`    | string | `createdAt`| `name`, `price`, or `createdAt`      |
| `sortOrder` | string | `desc`     | `asc` or `desc`                      |
| `search`    | string | —          | Searches product name + category name|
| `categoryId`| string | —          | Filter by category UUID              |

**Paginated response:**
```json
{
  "data": {
    "items": [...],
    "total": 42,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

Product image upload: send `multipart/form-data` with field `file` (JPEG/PNG). Served at `/static/images/<filename>`.

---

### Bulk Upload

| Method | Path                     | Description                    |
|--------|--------------------------|--------------------------------|
| POST   | `/bulk-upload/products`  | Upload CSV or XLSX file        |
| GET    | `/bulk-upload/:jobId`    | Poll job status                |

See [Bulk Upload Format](#bulk-upload-format) below.

**Response:**
```json
{ "data": { "jobId": "abc-123", "status": "queued", "createdBy": { "id": "...", "email": "..." } } }
```

**Status polling response:**
```json
{
  "data": {
    "id": "abc-123",
    "status": "completed",
    "total": 100,
    "processed": 98,
    "failed": 2,
    "errors": [{ "row": 5, "error": "Category not found: CAT-XXXXX" }]
  }
}
```

Job status values: `queued` → `processing` → `completed` / `failed`

---

### Reports

| Method | Path                        | Description                  |
|--------|-----------------------------|------------------------------|
| POST   | `/reports/products`         | Request a product report     |
| GET    | `/reports/:jobId`           | Poll report job status       |
| GET    | `/reports/:jobId/download`  | Download the generated file  |

**Request body:**
```json
{ "format": "csv" }
```
Supported formats: `csv`, `xlsx`

The download endpoint streams the file with `Content-Disposition: attachment`. The Angular frontend uses `HttpClient` with `responseType: 'blob'` to trigger the browser save dialog (preserving the Bearer token in the request).

---

## Bulk Upload Format

Upload a **CSV** or **XLSX** file to `POST /bulk-upload/products`. Maximum file size: **50 MB**.

### Required columns

| Column        | Type   | Description                                      |
|---------------|--------|--------------------------------------------------|
| `name`        | string | Product name                                     |
| `price`       | number | Decimal price (e.g. `29.99`)                     |
| `category_id` | string | Category **uniqueId** (e.g. `CAT-X7F3K2`) — not the UUID |

### Optional columns

| Column      | Type   | Description                        |
|-------------|--------|------------------------------------|
| `image_url` | string | Full URL or path to product image  |

### Example CSV

```csv
name,price,category_id,image_url
Laptop Pro,1299.99,CAT-X7F3K2,
Wireless Mouse,29.99,CAT-X7F3K2,
USB-C Hub,49.99,CAT-X7F3K2,
```

> Use `CAT-XXXXXX` format for `category_id` — this is the `uniqueId` shown in the UI and API responses, **not** the internal UUID.

---

## Running Tests

Unit tests use Jest with mocked PrismaService. No database connection is required.

```bash
cd backend

# Run all tests once
npm test

# Watch mode (re-runs on file save)
npm run test:watch

# With coverage report
npm run test:cov
```

**Test suites (55 tests total):**

| Suite                        | Tests | What's covered                                                  |
|------------------------------|-------|-----------------------------------------------------------------|
| `auth.service.spec.ts`       | 4     | Login success/failure, credential error message consistency     |
| `users.service.spec.ts`      | 11    | CRUD, duplicate email guard, password hashing, not-found        |
| `categories.service.spec.ts` | 11    | CRUD, CAT-XXXXXX generation, uniqueId collision retry, audit fields, delete guard |
| `products.service.spec.ts`   | 16    | CRUD, PRD-XXXXXX generation, pagination math, search/filter, image upload, audit fields |
| `bulk-upload.service.spec.ts`| 13    | Job creation, BullMQ enqueue, status polling, audit tracking    |

---

## Postman Collection

Two collections are included in `product-management/`:

| File                                          | Purpose                                 |
|-----------------------------------------------|-----------------------------------------|
| `Product-Management-API.postman_collection.json` | Full API collection for manual testing in Postman |
| `newman-test-collection.json`                 | Automated test run via Newman CLI       |

### Import into Postman

1. Open Postman → **Import**
2. Select `Product-Management-API.postman_collection.json`
3. The collection auto-saves the JWT token after login and chains `categoryId` → `productId` → `bulkJobId` → `reportJobId` through subsequent requests

### Run automated tests with Newman

```bash
# Install Newman globally
npm install -g newman

# Run the automated suite (requires backend running on localhost:3000)
cd product-management
newman run newman-test-collection.json --delay-request 1500
```

**Expected output:** 52 assertions across 22 requests, 0 failures.

---

## Key Design Decisions

**Default-deny auth:** A global `JwtAuthGuard` is registered via `APP_GUARD` — every route is protected unless explicitly decorated with `@Public()`. Forgetting to add a guard to a new controller results in a 401, not an accidental public endpoint.

**Dual IDs:** Every category and product has two identifiers — an internal UUID (`id`) used for foreign keys, and a human-readable `uniqueId` (`CAT-XXXXXX` / `PRD-XXXXXX`) shown in the UI. This separates internal referential integrity from external readability.

**Nullable audit relations:** `createdById` and `updatedById` are nullable foreign keys on products and categories. Existing records and bulk-uploaded products (no HTTP user context) remain valid with `null` — no backfill migration needed.

**Parallel DB queries:** The paginated product list runs `findMany` and `count` in `Promise.all` — cutting one full DB round-trip on every list request.

**Cursor-based report streaming:** Reports page through products using cursor pagination (by `id`) rather than offset. At 100k rows, cursor paging is O(1) per page; offset paging is O(n). Combined with `ExcelJS WorkbookWriter` (rows written to disk immediately), memory stays constant regardless of dataset size.

**Blob download for reports:** The frontend uses `HttpClient` with `responseType: 'blob'` instead of `<a href>`. This routes through Angular's `HttpInterceptor`, which attaches the Bearer token — a plain `<a href>` link would bypass the interceptor and receive a 401.

**Pinned overrides for three packages:** `@nestjs/core`, `@nestjs/bullmq`, and `exceljs` are pinned in `overrides` because `npm audit fix --force` repeatedly downgraded them to incompatible versions during development. See `backend/package.json` for the exact pins.
