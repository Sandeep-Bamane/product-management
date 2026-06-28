import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { JobsService } from '../../../core/services/jobs.service';
import { CategoriesService } from '../../../core/services/categories.service';
import { Category } from '../../../core/models/category.model';
import { JobProgressComponent } from '../../../shared/components/job-progress/job-progress.component';

@Component({
  selector: 'app-report-request',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatCardModule, MatFormFieldModule,
    MatSelectModule, MatInputModule, MatButtonModule, MatIconModule,
    MatSnackBarModule, JobProgressComponent,
  ],
  template: `
    <div class="page-header"><h1>Product Reports</h1></div>

    <mat-card style="max-width:540px;margin-bottom:24px">
      <mat-card-header><mat-card-title>Generate Report</mat-card-title></mat-card-header>
      <mat-card-content>
        <form [formGroup]="form" (ngSubmit)="generate()" style="display:flex;flex-direction:column;gap:12px">
          <mat-form-field appearance="outline">
            <mat-label>Format</mat-label>
            <mat-select formControlName="format">
              <mat-option value="csv">CSV</mat-option>
              <mat-option value="xlsx">Excel (XLSX)</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Filter by Category (optional)</mat-label>
            <mat-select formControlName="categoryId">
              <mat-option value="">All Categories</mat-option>
              @for (c of categories(); track c.id) {
                <mat-option [value]="c.id">{{ c.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Search (optional)</mat-label>
            <input matInput formControlName="search" placeholder="Filter by name…" />
          </mat-form-field>
          <button mat-flat-button color="primary" type="submit" [disabled]="generating()">
            <mat-icon>assessment</mat-icon> Generate Report
          </button>
        </form>
      </mat-card-content>
    </mat-card>

    @if (jobId()) {
      <mat-card style="max-width:540px">
        <mat-card-header><mat-card-title>Report Status</mat-card-title></mat-card-header>
        <mat-card-content>
          <app-job-progress
            [jobId]="jobId()!"
            [isBulk]="false"
            [downloadUrl]="downloadUrl()"
            (completed)="onDone($event)" />
        </mat-card-content>
      </mat-card>
    }
  `,
})
export class ReportRequestComponent implements OnInit {
  private readonly jobsSvc = inject(JobsService);
  private readonly catSvc = inject(CategoriesService);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  readonly categories = signal<Category[]>([]);
  readonly jobId = signal<string | null>(null);
  readonly downloadUrl = signal<string | undefined>(undefined);
  readonly generating = signal(false);

  readonly form = this.fb.group({ format: ['csv'], categoryId: [''], search: [''] });

  ngOnInit() { this.catSvc.getAll().subscribe((c) => this.categories.set(c)); }

  generate() {
    this.generating.set(true);
    const { format, categoryId, search } = this.form.value;
    const filters: Record<string, string> = {};
    if (categoryId) filters['categoryId'] = categoryId;
    if (search) filters['search'] = search;

    this.jobsSvc.requestReport(format as 'csv' | 'xlsx', filters).subscribe({
      next: (res) => { this.jobId.set(res.jobId); this.generating.set(false); },
      error: (err) => { this.snack.open(err.error?.message ?? 'Error', 'OK', { duration: 4000 }); this.generating.set(false); },
    });
  }

  onDone(job: any) {
    if (job.status === 'completed') {
      this.downloadUrl.set(this.jobsSvc.getReportDownloadUrl(job.id));
      this.snack.open('Report ready!', 'OK', { duration: 3000 });
    } else {
      this.snack.open('Report generation failed', 'OK', { duration: 4000 });
    }
  }
}
