import { Routes } from '@angular/router';

export const REPORTS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./report-request/report-request.component').then((m) => m.ReportRequestComponent) },
];
