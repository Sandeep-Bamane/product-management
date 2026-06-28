# Product Management Platform — Project Context

## Purpose
Full-stack product management system with user/category/product CRUD, bulk CSV/XLSX upload,
and downloadable reports. All infrastructure runs locally via Docker Compose.

## Stack
| Layer        | Tech             | Version |
|--------------|------------------|---------|
| Frontend     | Angular          | 19.x    |
| UI Library   | Angular Material | 19.x    |
| Backend      | NestJS           | 11.x    |
| Runtime      | Node.js LTS      | 22.x    |
| Language     | TypeScript       | 5.x     |
| ORM          | Prisma           | 6.x     |
| Database     | PostgreSQL       | 16.x    |
| Job Queue    | BullMQ           | 5.x     |
| Queue Store  | Redis            | 7.x     |

## Local Ports
- Backend API:  http://localhost:3000
- Frontend SPA: http://localhost:4200
- PostgreSQL:   localhost:5432
- Redis:        localhost:6379

## Start Infrastructure
```bash
docker compose up -d
```

## Start Backend
```bash
cd backend
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

## Start Frontend
```bash
cd frontend
npm install
ng serve
```

## Key Conventions
- All passwords hashed with bcrypt (rounds: 12)
- UniqueIDs: `CAT-XXXXXX` (categories), `PRD-XXXXXX` (products) — 6 random alphanumeric chars
- JWT Bearer token required on all API routes except `POST /api/auth/login`
- Bulk upload and report generation use async jobs (BullMQ) to avoid HTTP 504 timeouts
- Images stored at `backend/uploads/images/` and served as `/static/images/<filename>`

## Project Structure
```
product-management/
├── docker-compose.yml
├── .env.example
├── backend/         NestJS 11 API server
└── frontend/        Angular 19 SPA
```
