# Backend — NestJS 11 Context

## Architecture
Every feature lives in `src/modules/<name>/` with the same four-file structure:
`<name>.module.ts`, `<name>.controller.ts`, `<name>.service.ts`, `dto/`.

## Response Shape
`TransformInterceptor` wraps all successful responses:
```json
{ "data": <payload>, "statusCode": 200, "timestamp": "..." }
```
Error responses from `HttpExceptionFilter`:
```json
{ "statusCode": 400, "message": "...", "error": "BadRequestException", "timestamp": "..." }
```

## Auth
- Global `JwtAuthGuard` is registered via `APP_GUARD` in `AppModule`
- Mark public endpoints with `@Public()` decorator (from `src/common/decorators/public.decorator.ts`)
- JWT strategy reads `Authorization: Bearer <token>` header

## Database Access
- Use `PrismaService` exclusively — no raw SQL unless Prisma can't express the query
- `PrismaService` is provided globally via `PrismaModule`
- Prisma schema: `prisma/schema.prisma`
- Run migrations: `npx prisma migrate dev --name <description>`
- Reseed: `npx prisma db seed`

## File Storage
- Product images → `uploads/images/<uuid><ext>` (served at `/static/images/<filename>`)
- Bulk upload files → `uploads/bulk/<uuid>-<original>`
- Generated reports → `generated-reports/<jobId>.<csv|xlsx>`

## Job Queues (BullMQ)
- Queue names: `bulk-upload` and `reports`
- Root BullMQ config in `AppModule` via `BullModule.forRootAsync()`
- Processors extend `WorkerHost` from `@nestjs/bullmq`
- Job status tracked in `BulkUploadJob` and `ReportJob` Prisma models

## UniqueID Generation
```typescript
// In service constructor
private generateUniqueId(prefix: 'CAT' | 'PRD'): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const suffix = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${prefix}-${suffix}`;
}
```
Retry on DB unique constraint violation.

## Validation
- `ValidationPipe` applied globally with `{ whitelist: true, transform: true }`
- DTOs use `class-validator` decorators
- `UpdateProductDto extends PartialType(CreateProductDto)` pattern everywhere

## Bulk Upload CSV/XLSX Format
Required columns: `name`, `price`, `category_id`
Optional: `image_url` (if omitted, image is blank)

## Module Import Checklist
When adding a new module that uses Prisma: import `PrismaModule`.
When adding a new module that uses queues: import `BullModule.registerQueue({ name: '...' })`.
When adding a new module that needs auth context: JwtAuthGuard is already global.
