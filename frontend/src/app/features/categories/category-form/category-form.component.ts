import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CategoriesService } from '../../../core/services/categories.service';

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [
    RouterLink, ReactiveFormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatSnackBarModule,
  ],
  template: `
    <div class="page-header">
      <h1>{{ isEdit() ? 'Edit Category' : 'New Category' }}</h1>
    </div>
    <mat-card style="max-width:480px">
      <mat-card-content>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Category Name</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>
          @if (error()) { <p class="error-message">{{ error() }}</p> }
          <div style="display:flex;gap:8px;margin-top:8px">
            <button mat-flat-button color="primary" type="submit">Save</button>
            <button mat-button type="button" routerLink="/categories">Cancel</button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
  `,
})
export class CategoryFormComponent implements OnInit {
  private readonly svc = inject(CategoriesService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly snack = inject(MatSnackBar);

  readonly isEdit = signal(false);
  readonly error = signal('');
  private catId = '';

  readonly form = this.fb.group({ name: ['', Validators.required] });

  ngOnInit() {
    this.catId = this.route.snapshot.params['id'];
    if (this.catId) {
      this.isEdit.set(true);
      this.svc.getOne(this.catId).subscribe((c) => this.form.patchValue({ name: c.name }));
    }
  }

  submit() {
    if (this.form.invalid) return;
    const { name } = this.form.value;
    const action = this.isEdit()
      ? this.svc.update(this.catId, { name: name! })
      : this.svc.create({ name: name! });

    action.subscribe({
      next: () => { this.snack.open('Category saved', 'OK', { duration: 3000 }); this.router.navigate(['/categories']); },
      error: (err) => this.error.set(err.error?.message ?? 'Error saving category'),
    });
  }
}
