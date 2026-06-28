import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-file-upload-zone',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div
      class="drop-zone"
      [class.dragging]="isDragging()"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave()"
      (drop)="onDrop($event)"
      (click)="fileInput.click()">
      <mat-icon>cloud_upload</mat-icon>
      <p>{{ selectedFile() ? selectedFile()!.name : 'Drag & drop or click to select' }}</p>
      <p class="hint">Accepted: {{ accept }}</p>
    </div>
    <input #fileInput type="file" [accept]="accept" style="display:none" (change)="onFileChange($event)" />
  `,
  styles: [`
    .drop-zone {
      border: 2px dashed #bbb;
      border-radius: 8px;
      padding: 32px;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.2s, background 0.2s;
    }
    .drop-zone:hover, .drop-zone.dragging {
      border-color: #3f51b5;
      background: #f0f3ff;
    }
    mat-icon { font-size: 48px; height: 48px; width: 48px; color: #bbb; }
    .hint { font-size: 12px; color: #999; margin: 0; }
  `],
})
export class FileUploadZoneComponent {
  @Input() accept = '.csv,.xlsx';
  @Output() fileSelected = new EventEmitter<File>();

  readonly isDragging = signal(false);
  readonly selectedFile = signal<File | null>(null);

  onDragOver(e: DragEvent) {
    e.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave() {
    this.isDragging.set(false);
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.isDragging.set(false);
    const file = e.dataTransfer?.files[0];
    if (file) this.emitFile(file);
  }

  onFileChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.emitFile(file);
  }

  private emitFile(file: File) {
    this.selectedFile.set(file);
    this.fileSelected.emit(file);
  }
}
