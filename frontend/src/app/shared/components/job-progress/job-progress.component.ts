import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  EventEmitter,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Subject, interval } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { BulkUploadJob, JobStatus } from '../../../core/models/job.model';
import { JobsService } from '../../../core/services/jobs.service';

@Component({
  selector: 'app-job-progress',
  standalone: true,
  imports: [CommonModule, MatProgressBarModule, MatButtonModule, MatIconModule],
  template: `
    @if (job()) {
      <div class="job-progress">
        <div class="status-row">
          <mat-icon [class]="'status-icon ' + job()!.status">
            {{ statusIcon() }}
          </mat-icon>
          <span>{{ statusLabel() }}</span>
        </div>

        @if (job()!.status === 'processing' || job()!.status === 'queued') {
          <mat-progress-bar mode="indeterminate" />
        }

        @if (isBulk && job()!.status === 'completed') {
          <p class="summary">
            Processed: <strong>{{ asBulk(job()!).processed }}</strong> &nbsp;
            Failed: <strong class="warn">{{ asBulk(job()!).failed }}</strong>
            of <strong>{{ asBulk(job()!).total }}</strong>
          </p>
        }

        @if (job()!.status === 'completed' && downloadUrl) {
          <button mat-flat-button color="primary" (click)="triggerDownload()" [disabled]="downloading()">
            <mat-icon>download</mat-icon>
            {{ downloading() ? 'Downloading…' : 'Download Report' }}
          </button>
        }
      </div>
    }
  `,
  styles: [`
    .job-progress { padding: 16px 0; }
    .status-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .status-icon.completed { color: #4caf50; }
    .status-icon.failed { color: #f44336; }
    .status-icon.processing, .status-icon.queued { color: #ff9800; }
    .warn { color: #f44336; }
    .summary { margin: 8px 0; }
  `],
})
export class JobProgressComponent implements OnChanges, OnDestroy {
  @Input() jobId!: string;
  @Input() isBulk = true;
  @Input() downloadUrl?: string;
  @Output() completed = new EventEmitter<any>();

  private readonly jobsService = inject(JobsService);
  private readonly http = inject(HttpClient);
  private readonly destroy$ = new Subject<void>();

  readonly job = signal<any>(null);
  readonly downloading = signal(false);

  ngOnChanges() {
    if (!this.jobId) return;
    this.destroy$.next();
    this.startPolling();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  triggerDownload() {
    if (!this.downloadUrl) return;
    this.downloading.set(true);

    this.http.get(this.downloadUrl, { responseType: 'blob', observe: 'response' }).subscribe({
      next: (response) => {
        const blob = response.body!;
        const contentDisposition = response.headers.get('content-disposition') ?? '';
        const nameMatch = contentDisposition.match(/filename[^;=\n]*=["']?([^"';\n]+)/i);
        const filename = nameMatch ? nameMatch[1].trim() : `report-${this.jobId}`;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        this.downloading.set(false);
      },
      error: () => this.downloading.set(false),
    });
  }

  statusLabel() {
    const map: Record<JobStatus, string> = {
      queued: 'Queued — waiting to start',
      processing: 'Processing…',
      completed: 'Completed',
      failed: 'Failed',
    };
    return map[this.job()?.status as JobStatus] ?? '';
  }

  statusIcon() {
    const map: Record<JobStatus, string> = {
      queued: 'schedule',
      processing: 'sync',
      completed: 'check_circle',
      failed: 'error',
    };
    return map[this.job()?.status as JobStatus] ?? 'info';
  }

  asBulk(j: any): BulkUploadJob {
    return j as BulkUploadJob;
  }

  private startPolling() {
    const poll$ = this.isBulk
      ? (id: string) => this.jobsService.getBulkStatus(id)
      : (id: string) => this.jobsService.getReportStatus(id);

    interval(2000)
      .pipe(
        switchMap(() => poll$(this.jobId)),
        takeUntil(this.destroy$),
      )
      .subscribe((j) => {
        this.job.set(j);
        if (j.status === 'completed' || j.status === 'failed') {
          this.destroy$.next();
          this.completed.emit(j);
        }
      });
  }
}
