# Frontend — Angular 19 Context

## Architecture
- **Standalone components only** — no NgModules anywhere
- Feature modules lazy-loaded via `app.routes.ts`
- All state via Angular Signals; avoid BehaviorSubject for simple state
- `inject()` function used inside constructors instead of constructor injection params for services

## Bootstrap
`src/main.ts` → `bootstrapApplication(AppComponent, appConfig)`
`src/app/app.config.ts` → `provideRouter`, `provideHttpClient`, `provideAnimationsAsync`

## Routing
```
/auth/login              Public (no auth)
/dashboard               Protected (MainLayoutComponent shell)
/users                   Protected
/categories              Protected
/products                Protected
/products/bulk-upload    Protected
/reports                 Protected
```
`authGuard` is a functional guard (`CanActivateFn`) that checks `AuthService.isAuthenticated()`.

## HTTP
- `AuthInterceptor` attaches `Authorization: Bearer <token>` from `localStorage`
- `ErrorInterceptor` catches 401 and redirects to `/auth/login`
- API base URL: `environment.apiUrl` = `http://localhost:3000/api`

## Key Shared Components
| Component | Usage |
|-----------|-------|
| `DataTableComponent` | Reusable paginated + sortable table; emits `(pageChange)` and `(sortChange)` |
| `ConfirmDialogComponent` | Delete confirmation modal |
| `FileUploadZoneComponent` | Drag-drop file picker; emits `(fileSelected)` |
| `JobProgressComponent` | Polls job status every 2s; shows progress bar + completion actions |

## Polling Pattern (jobs)
```typescript
interval(2000).pipe(
  switchMap(() => this.jobService.getStatus(jobId)),
  takeUntil(this.destroy$),
  filter(job => job.status === 'completed' || job.status === 'failed')
).subscribe(job => { /* handle completion */ });
```

## Angular Material
- All UI components from `@angular/material`
- Theme applied in `src/styles.scss`
- Import individual mat-* components in each standalone component's `imports` array

## Models (src/app/core/models/)
- `user.model.ts` — User, CreateUserDto, UpdateUserDto
- `category.model.ts` — Category, CreateCategoryDto
- `product.model.ts` — Product, ProductQuery, PaginatedResult
- `job.model.ts` — BulkUploadJob, ReportJob, JobStatus enum
- `api-response.model.ts` — ApiResponse<T> wrapper

## Auth Storage
`AuthService` stores JWT in `localStorage` under key `pm_token`.
`isAuthenticated()` returns a computed signal derived from the token.
