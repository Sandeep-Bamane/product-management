import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { CategoriesService } from '../../../core/services/categories.service';
import { Category } from '../../../core/models/category.model';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [
    RouterLink, DatePipe, MatTableModule, MatButtonModule, MatIconModule,
    MatSnackBarModule, MatDialogModule, MatCardModule, MatChipsModule,
  ],
  template: `
    <div class="page-header">
      <h1>Categories</h1>
      <button mat-flat-button color="primary" routerLink="new">
        <mat-icon>add</mat-icon> Add Category
      </button>
    </div>
    <mat-card>
      <table mat-table [dataSource]="categories()" class="full-width">
        <ng-container matColumnDef="uniqueId">
          <th mat-header-cell *matHeaderCellDef>ID</th>
          <td mat-cell *matCellDef="let c">
            <mat-chip>{{ c.uniqueId }}</mat-chip>
          </td>
        </ng-container>
        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef>Name</th>
          <td mat-cell *matCellDef="let c">{{ c.name }}</td>
        </ng-container>
        <ng-container matColumnDef="createdAt">
          <th mat-header-cell *matHeaderCellDef>Created</th>
          <td mat-cell *matCellDef="let c">{{ c.createdAt | date:'mediumDate' }}</td>
        </ng-container>
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef>Actions</th>
          <td mat-cell *matCellDef="let c">
            <button mat-icon-button [routerLink]="[c.id, 'edit']"><mat-icon>edit</mat-icon></button>
            <button mat-icon-button color="warn" (click)="confirmDelete(c)"><mat-icon>delete</mat-icon></button>
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="cols"></tr>
        <tr mat-row *matRowDef="let row; columns: cols"></tr>
      </table>
    </mat-card>
  `,
})
export class CategoryListComponent implements OnInit {
  private readonly svc = inject(CategoriesService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  readonly categories = signal<Category[]>([]);
  readonly cols = ['uniqueId', 'name', 'createdAt', 'actions'];

  ngOnInit() { this.load(); }
  load() { this.svc.getAll().subscribe((c) => this.categories.set(c)); }

  confirmDelete(cat: Category) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete Category', message: `Delete "${cat.name}"?` },
    });
    ref.afterClosed().subscribe((ok) => {
      if (ok) {
        this.svc.remove(cat.id).subscribe({
          next: () => { this.snack.open('Category deleted', 'OK', { duration: 3000 }); this.load(); },
          error: (err) => this.snack.open(err.error?.message ?? 'Error', 'OK', { duration: 4000 }),
        });
      }
    });
  }
}
