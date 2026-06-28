import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { CurrencyPipe } from '@angular/common';
import { ProductsService } from '../../../core/services/products.service';
import { CategoriesService } from '../../../core/services/categories.service';
import { Product, ProductQuery } from '../../../core/models/product.model';
import { Category } from '../../../core/models/category.model';
import { PaginatedResult } from '../../../core/models/api-response.model';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    RouterLink, ReactiveFormsModule, CurrencyPipe,
    MatTableModule, MatPaginatorModule, MatSortModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatCardModule,
    MatSnackBarModule, MatDialogModule, MatChipsModule,
  ],
  template: `
    <div class="page-header">
      <h1>Products</h1>
      <div style="display:flex;gap:8px">
        <button mat-stroked-button routerLink="bulk-upload"><mat-icon>upload_file</mat-icon> Bulk Upload</button>
        <button mat-flat-button color="primary" routerLink="new"><mat-icon>add</mat-icon> Add Product</button>
      </div>
    </div>

    <!-- Filters -->
    <mat-card style="margin-bottom:16px;padding:16px">
      <form [formGroup]="filterForm" style="display:flex;gap:16px;flex-wrap:wrap;align-items:center">
        <mat-form-field appearance="outline" style="flex:1;min-width:200px">
          <mat-label>Search</mat-label>
          <input matInput formControlName="search" placeholder="Name or category…" />
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>
        <mat-form-field appearance="outline" style="min-width:180px">
          <mat-label>Category</mat-label>
          <mat-select formControlName="categoryId">
            <mat-option value="">All</mat-option>
            @for (c of categories(); track c.id) {
              <mat-option [value]="c.id">{{ c.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </form>
    </mat-card>

    <mat-card>
      <table mat-table [dataSource]="result().items" matSort (matSortChange)="onSort($event)" class="full-width">
        <ng-container matColumnDef="uniqueId">
          <th mat-header-cell *matHeaderCellDef>ID</th>
          <td mat-cell *matCellDef="let p"><mat-chip>{{ p.uniqueId }}</mat-chip></td>
        </ng-container>
        <ng-container matColumnDef="image">
          <th mat-header-cell *matHeaderCellDef>Image</th>
          <td mat-cell *matCellDef="let p">
            @if (p.image) {
              <img [src]="'http://localhost:3000' + p.image" height="40" style="border-radius:4px;object-fit:cover;width:40px" />
            } @else {
              <mat-icon style="color:#ccc">image</mat-icon>
            }
          </td>
        </ng-container>
        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef mat-sort-header="name">Name</th>
          <td mat-cell *matCellDef="let p">{{ p.name }}</td>
        </ng-container>
        <ng-container matColumnDef="price">
          <th mat-header-cell *matHeaderCellDef mat-sort-header="price">Price</th>
          <td mat-cell *matCellDef="let p">{{ p.price | currency }}</td>
        </ng-container>
        <ng-container matColumnDef="category">
          <th mat-header-cell *matHeaderCellDef>Category</th>
          <td mat-cell *matCellDef="let p">{{ p.category.name }}</td>
        </ng-container>
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef>Actions</th>
          <td mat-cell *matCellDef="let p">
            <button mat-icon-button [routerLink]="[p.id, 'edit']"><mat-icon>edit</mat-icon></button>
            <button mat-icon-button color="warn" (click)="confirmDelete(p)"><mat-icon>delete</mat-icon></button>
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="cols"></tr>
        <tr mat-row *matRowDef="let row; columns: cols"></tr>
      </table>

      <mat-paginator
        [length]="result().total"
        [pageSize]="query().limit"
        [pageSizeOptions]="[10, 20, 50]"
        (page)="onPage($event)" />
    </mat-card>
  `,
})
export class ProductListComponent implements OnInit {
  private readonly svc = inject(ProductsService);
  private readonly catSvc = inject(CategoriesService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  readonly cols = ['uniqueId', 'image', 'name', 'price', 'category', 'actions'];
  readonly categories = signal<Category[]>([]);
  readonly result = signal<PaginatedResult<Product>>({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 });
  readonly query = signal<ProductQuery>({ page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' });

  readonly filterForm = this.fb.group({ search: [''], categoryId: [''] });

  ngOnInit() {
    this.catSvc.getAll().subscribe((c) => this.categories.set(c));
    this.load();

    this.filterForm.valueChanges.pipe(debounceTime(400), distinctUntilChanged()).subscribe((v) => {
      this.query.update((q) => ({ ...q, page: 1, search: v.search || undefined, categoryId: v.categoryId || undefined }));
      this.load();
    });
  }

  load() {
    this.svc.getAll(this.query()).subscribe((r) => this.result.set(r));
  }

  onPage(e: PageEvent) {
    this.query.update((q) => ({ ...q, page: e.pageIndex + 1, limit: e.pageSize }));
    this.load();
  }

  onSort(s: Sort) {
    if (!s.active || s.direction === '') return;
    this.query.update((q) => ({ ...q, sortBy: s.active, sortOrder: s.direction as 'asc' | 'desc', page: 1 }));
    this.load();
  }

  confirmDelete(product: Product) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete Product', message: `Delete "${product.name}"?` },
    });
    ref.afterClosed().subscribe((ok) => {
      if (ok) {
        this.svc.remove(product.id).subscribe(() => {
          this.snack.open('Product deleted', 'OK', { duration: 3000 });
          this.load();
        });
      }
    });
  }
}
