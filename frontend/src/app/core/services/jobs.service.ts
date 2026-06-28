import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { BulkUploadJob, ReportJob } from '../models/job.model';

@Injectable({ providedIn: 'root' })
export class JobsService {
  private readonly http = inject(HttpClient);

  uploadBulk(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    return this.http
      .post<ApiResponse<{ jobId: string; status: string }>>(
        `${environment.apiUrl}/bulk-upload/products`,
        fd,
      )
      .pipe(map((r) => r.data));
  }

  getBulkStatus(jobId: string) {
    return this.http
      .get<ApiResponse<BulkUploadJob>>(`${environment.apiUrl}/bulk-upload/${jobId}`)
      .pipe(map((r) => r.data));
  }

  requestReport(format: 'csv' | 'xlsx', filters: Record<string, string> = {}) {
    return this.http
      .post<ApiResponse<{ jobId: string; status: string }>>(
        `${environment.apiUrl}/reports/products`,
        { format, ...filters },
      )
      .pipe(map((r) => r.data));
  }

  getReportStatus(jobId: string) {
    return this.http
      .get<ApiResponse<ReportJob>>(`${environment.apiUrl}/reports/${jobId}`)
      .pipe(map((r) => r.data));
  }

  getReportDownloadUrl(jobId: string): string {
    return `${environment.apiUrl}/reports/${jobId}/download`;
  }
}
