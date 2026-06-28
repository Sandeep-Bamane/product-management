export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface BulkUploadJob {
  id: string;
  status: JobStatus;
  filePath: string;
  total: number;
  processed: number;
  failed: number;
  errors: { row: number; reason: string }[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReportJob {
  id: string;
  status: JobStatus;
  filePath: string | null;
  format: 'csv' | 'xlsx';
  filters: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}
