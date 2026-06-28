import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { UsersService } from '../../../core/services/users.service';
import { User } from '../../../core/models/user.model';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    RouterLink, DatePipe, MatTableModule, MatButtonModule, MatIconModule,
    MatSnackBarModule, MatDialogModule, MatCardModule,
  ],
  template: `
    <div class="page-header">
      <h1>Users</h1>
      <button mat-flat-button color="primary" routerLink="new">
        <mat-icon>add</mat-icon> Add User
      </button>
    </div>
    <mat-card>
      <table mat-table [dataSource]="users()" class="full-width">
        <ng-container matColumnDef="email">
          <th mat-header-cell *matHeaderCellDef>Email</th>
          <td mat-cell *matCellDef="let u">{{ u.email }}</td>
        </ng-container>
        <ng-container matColumnDef="createdAt">
          <th mat-header-cell *matHeaderCellDef>Created</th>
          <td mat-cell *matCellDef="let u">{{ u.createdAt | date:'mediumDate' }}</td>
        </ng-container>
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef>Actions</th>
          <td mat-cell *matCellDef="let u">
            <button mat-icon-button [routerLink]="[u.id, 'edit']"><mat-icon>edit</mat-icon></button>
            <button mat-icon-button color="warn" (click)="confirmDelete(u)"><mat-icon>delete</mat-icon></button>
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="cols"></tr>
        <tr mat-row *matRowDef="let row; columns: cols"></tr>
      </table>
    </mat-card>
  `,
})
export class UserListComponent implements OnInit {
  private readonly svc = inject(UsersService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  readonly users = signal<User[]>([]);
  readonly cols = ['email', 'createdAt', 'actions'];

  ngOnInit() { this.load(); }

  load() { this.svc.getAll().subscribe((u) => this.users.set(u)); }

  confirmDelete(user: User) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete User', message: `Delete ${user.email}?` },
    });
    ref.afterClosed().subscribe((ok) => {
      if (ok) {
        this.svc.remove(user.id).subscribe(() => {
          this.snack.open('User deleted', 'OK', { duration: 3000 });
          this.load();
        });
      }
    });
  }
}
