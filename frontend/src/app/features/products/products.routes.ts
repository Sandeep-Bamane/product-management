import { Routes } from '@angular/router';

export const PRODUCTS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./product-list/product-list.component').then((m) => m.ProductListComponent) },
  { path: 'new', loadComponent: () => import('./product-form/product-form.component').then((m) => m.ProductFormComponent) },
  { path: 'bulk-upload', loadComponent: () => import('./bulk-upload/bulk-upload.component').then((m) => m.BulkUploadComponent) },
  { path: ':id/edit', loadComponent: () => import('./product-form/product-form.component').then((m) => m.ProductFormComponent) },
];
