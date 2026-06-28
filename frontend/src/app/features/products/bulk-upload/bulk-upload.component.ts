import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { JobsService } from '../../../core/services/jobs.service';
import { FileUploadZoneComponent } from '../../../shared/components/file-upload-zone/file-upload-zone.component';
import { JobProgressComponent } from '../../../shared/components/job-progress/job-progress.component';

@Component({
  selector: 'app-bulk-upload',
  standalone: true,
  imports: [
    RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatSnackBarModule,
    FileUploadZoneComponent, JobProgressComponent,
  ],
  template: `
    <div class="page-header">
      <h1>Bulk Product Upload</h1>
      <button mat-button routerLink="/products"><mat-icon>arrow_back</mat-icon> Back to Products</button>
    </div>

    <mat-card style="max-width:600px;margin-bottom:24px">
      <mat-card-header><mat-card-title>Upload CSV / XLSX</mat-card-title></mat-card-header>
      <mat-card-content>
        <p style="color:#666;margin-bottom:16px">
          Required columns: <code>name</code>, <code>price</code>, <code>category_id</code><br/>
          Optional: <code>image_url</code>
        </p>
        <app-file-upload-zone (fileSelected)="onFile($event)" />
        @if (selectedFile()) {
          <div style="margin-top:16px">
            <button mat-flat-button color="primary" (click)="upload()" [disabled]="uploading()">
              <mat-icon>cloud_upload</mat-icon> Start Upload
            </button>
          </div>
        }
      </mat-card-content>
    </mat-card>

    @if (jobId()) {
      <mat-card style="max-width:600px">
        <mat-card-header><mat-card-title>Job Progress</mat-card-title></mat-card-header>
        <mat-card-content>
          <app-job-progress [jobId]="jobId()!" [isBulk]="true" (completed)="onDone($event)" />
        </mat-card-content>
      </mat-card>
    }
  `,
})
export class BulkUploadComponent {
  private readonly jobsSvc = inject(JobsService);
  private readonly snack = inject(MatSnackBar);

  readonly selectedFile = signal<File | null>(null);
  readonly uploading = signal(false);
  readonly jobId = signal<string | null>(null);

  onFile(file: File) { this.selectedFile.set(file); }

  upload() {
    if (!this.selectedFile()) return;
    this.uploading.set(true);
    this.jobsSvc.uploadBulk(this.selectedFile()!).subscribe({
      next: (res) => { this.jobId.set(res.jobId); this.uploading.set(false); },
      error: (err) => {
        this.snack.open(err.error?.message ?? 'Upload failed', 'OK', { duration: 4000 });
        this.uploading.set(false);
      },
    });
  }

  onDone(job: any) {
    if (job.status === 'completed') {
      this.snack.open(`Done! ${job.processed} imported, ${job.failed} failed.`, 'OK', { duration: 6000 });
    } else {
      this.snack.open('Job failed', 'OK', { duration: 4000 });
    }
  }
}
