import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { UsersService } from '../../core/services/users.service';
import { CategoriesService } from '../../core/services/categories.service';
import { ProductsService } from '../../core/services/products.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, MatCardModule, MatIconModule, MatButtonModule],
  template: `
    <div class="page-header"><h1>Dashboard</h1></div>
    <div class="stats-grid">
      @for (stat of stats(); track stat.label) {
        <mat-card class="stat-card">
          <mat-card-content>
            <mat-icon>{{ stat.icon }}</mat-icon>
            <div class="stat-value">{{ stat.value }}</div>
            <div class="stat-label">{{ stat.label }}</div>
            <a mat-button color="primary" [routerLink]="stat.route">View All</a>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .stats-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:16px; }
    .stat-card mat-card-content { text-align:center; padding:24px 16px; }
    .stat-card mat-icon { font-size:48px;height:48px;width:48px;color:#3f51b5; }
    .stat-value { font-size:36px; font-weight:700; margin:8px 0 4px; }
    .stat-label { color:#666; margin-bottom:12px; }
  `],
})
export class DashboardComponent implements OnInit {
  private readonly users = inject(UsersService);
  private readonly categories = inject(CategoriesService);
  private readonly products = inject(ProductsService);

  readonly stats = signal<{ label: string; icon: string; value: number | string; route: string }[]>([
    { label: 'Users', icon: 'people', value: '…', route: '/users' },
    { label: 'Categories', icon: 'category', value: '…', route: '/categories' },
    { label: 'Products', icon: 'inventory_2', value: '…', route: '/products' },
  ]);

  ngOnInit() {
    this.users.getAll().subscribe((u) => this.patchStat('Users', u.length));
    this.categories.getAll().subscribe((c) => this.patchStat('Categories', c.length));
    this.products.getAll({ limit: 1 }).subscribe((p) => this.patchStat('Products', p.total));
  }

  private patchStat(label: string, value: number) {
    this.stats.update((s) => s.map((item) => (item.label === label ? { ...item, value } : item)));
  }
}
