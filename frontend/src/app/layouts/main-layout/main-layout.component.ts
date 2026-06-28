import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../core/services/auth.service';

interface NavItem { label: string; icon: string; route: string; }

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatSidenavModule, MatToolbarModule, MatListModule,
    MatIconModule, MatButtonModule,
  ],
  template: `
    <mat-sidenav-container class="sidenav-container">
      <mat-sidenav mode="side" opened class="sidenav">
        <div class="brand">Product Mgmt</div>
        <mat-nav-list>
          @for (item of navItems; track item.route) {
            <a mat-list-item [routerLink]="item.route" routerLinkActive="active-link">
              <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
              <span matListItemTitle>{{ item.label }}</span>
            </a>
          }
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content>
        <mat-toolbar color="primary" class="toolbar">
          <span class="spacer"></span>
          <button mat-icon-button (click)="auth.logout()" title="Logout">
            <mat-icon>logout</mat-icon>
          </button>
        </mat-toolbar>
        <div class="content">
          <router-outlet />
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .sidenav-container { height: 100vh; }
    .sidenav { width: 220px; background: #3f51b5; color: #fff; }
    .brand { padding: 20px 16px; font-size: 18px; font-weight: 600; border-bottom: 1px solid rgba(255,255,255,0.2); }
    mat-nav-list a { color: rgba(255,255,255,0.85) !important; }
    mat-nav-list a.active-link { background: rgba(255,255,255,0.15) !important; color: #fff !important; }
    .toolbar { position: sticky; top: 0; z-index: 100; }
    .content { padding: 24px; }
  `],
})
export class MainLayoutComponent {
  readonly auth = inject(AuthService);

  readonly navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'Users', icon: 'people', route: '/users' },
    { label: 'Categories', icon: 'category', route: '/categories' },
    { label: 'Products', icon: 'inventory_2', route: '/products' },
    { label: 'Bulk Upload', icon: 'upload_file', route: '/products/bulk-upload' },
    { label: 'Reports', icon: 'assessment', route: '/reports' },
  ];
}
