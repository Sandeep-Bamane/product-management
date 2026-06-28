import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { UsersService } from '../../../core/services/users.service';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatSnackBarModule,
  ],
  template: `
    <div class="page-header">
      <h1>{{ isEdit() ? 'Edit User' : 'New User' }}</h1>
    </div>
    <mat-card style="max-width:480px">
      <mat-card-content>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Email</mat-label>
            <input matInput formControlName="email" type="email" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ isEdit() ? 'New Password (leave blank to keep)' : 'Password' }}</mat-label>
            <input matInput formControlName="password" type="password" />
          </mat-form-field>
          @if (error()) { <p class="error-message">{{ error() }}</p> }
          <div style="display:flex;gap:8px;margin-top:8px">
            <button mat-flat-button color="primary" type="submit">Save</button>
            <button mat-button type="button" routerLink="/users">Cancel</button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
  `,
})
export class UserFormComponent implements OnInit {
  private readonly svc = inject(UsersService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly snack = inject(MatSnackBar);

  readonly isEdit = signal(false);
  readonly error = signal('');
  private userId = '';

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: [''],
  });

  ngOnInit() {
    this.userId = this.route.snapshot.params['id'];
    if (this.userId) {
      this.isEdit.set(true);
      this.svc.getOne(this.userId).subscribe((u) => {
        this.form.patchValue({ email: u.email });
      });
    } else {
      this.form.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    }
  }

  submit() {
    if (this.form.invalid) return;
    const { email, password } = this.form.value;
    const action = this.isEdit()
      ? this.svc.update(this.userId, { email: email!, password: password || undefined })
      : this.svc.create({ email: email!, password: password! });

    action.subscribe({
      next: () => {
        this.snack.open('User saved', 'OK', { duration: 3000 });
        this.router.navigate(['/users']);
      },
      error: (err) => this.error.set(err.error?.message ?? 'Error saving user'),
    });
  }
}
