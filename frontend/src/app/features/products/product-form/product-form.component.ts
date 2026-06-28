import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ProductsService } from '../../../core/services/products.service';
import { CategoriesService } from '../../../core/services/categories.service';
import { Category } from '../../../core/models/category.model';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [
    RouterLink, ReactiveFormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, MatSnackBarModule,
  ],
  template: `
    <div class="page-header">
      <h1>{{ isEdit() ? 'Edit Product' : 'New Product' }}</h1>
    </div>
    <mat-card style="max-width:560px">
      <mat-card-content>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Product Name</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Price</mat-label>
            <input matInput formControlName="price" type="number" step="0.01" min="0" />
            <span matTextPrefix>$&nbsp;</span>
          </mat-form-field>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Category</mat-label>
            <mat-select formControlName="categoryId">
              @for (c of categories(); track c.id) {
                <mat-option [value]="c.id">{{ c.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <div style="margin-bottom:16px">
            <label>Product Image</label>
            <div style="display:flex;align-items:center;gap:12px;margin-top:8px">
              @if (previewUrl()) {
                <img [src]="previewUrl()!" height="80" style="border-radius:4px;object-fit:cover" />
              }
              <button mat-stroked-button type="button" (click)="imgInput.click()">
                <mat-icon>upload</mat-icon> Choose Image
              </button>
              <input #imgInput type="file" accept="image/*" style="display:none" (change)="onImage($event)" />
              @if (imageFile()) { <span>{{ imageFile()!.name }}</span> }
            </div>
          </div>

          @if (error()) { <p class="error-message">{{ error() }}</p> }
          <div style="display:flex;gap:8px">
            <button mat-flat-button color="primary" type="submit">Save</button>
            <button mat-button type="button" routerLink="/products">Cancel</button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
  `,
})
export class ProductFormComponent implements OnInit {
  private readonly svc = inject(ProductsService);
  private readonly catSvc = inject(CategoriesService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly snack = inject(MatSnackBar);

  readonly isEdit = signal(false);
  readonly error = signal('');
  readonly categories = signal<Category[]>([]);
  readonly imageFile = signal<File | null>(null);
  readonly previewUrl = signal<string | null>(null);
  private productId = '';

  readonly form = this.fb.group({
    name: ['', Validators.required],
    price: [null as number | null, [Validators.required, Validators.min(0)]],
    categoryId: ['', Validators.required],
  });

  ngOnInit() {
    this.catSvc.getAll().subscribe((c) => this.categories.set(c));
    this.productId = this.route.snapshot.params['id'];
    if (this.productId) {
      this.isEdit.set(true);
      this.svc.getOne(this.productId).subscribe((p) => {
        this.form.patchValue({ name: p.name, price: p.price, categoryId: p.categoryId });
        if (p.image) this.previewUrl.set(`http://localhost:3000${p.image}`);
      });
    }
  }

  onImage(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.imageFile.set(file);
    const reader = new FileReader();
    reader.onload = () => this.previewUrl.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  submit() {
    if (this.form.invalid) return;
    const { name, price, categoryId } = this.form.value;
    const action = this.isEdit()
      ? this.svc.update(this.productId, { name: name!, price: price!, categoryId: categoryId! }, this.imageFile() ?? undefined)
      : this.svc.create({ name: name!, price: price!, categoryId: categoryId! }, this.imageFile() ?? undefined);

    action.subscribe({
      next: () => { this.snack.open('Product saved', 'OK', { duration: 3000 }); this.router.navigate(['/products']); },
      error: (err) => this.error.set(err.error?.message ?? 'Error saving product'),
    });
  }
}
