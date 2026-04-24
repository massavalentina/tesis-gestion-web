import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export interface QrCredentialPreviewMetaItem {
  label: string;
  value: string;
}

@Component({
  selector: 'app-qr-credential-preview-card',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="preview-student">{{ nombreCompleto }}</div>

    <div class="preview-loading" *ngIf="loading">
      <mat-spinner diameter="34"></mat-spinner>
    </div>

    <div class="preview-content" *ngIf="!loading">
      <div class="preview-error" *ngIf="error">
        <mat-icon>error_outline</mat-icon>
        <span>{{ error }}</span>
      </div>

      <div class="preview-image-wrap" *ngIf="imageUrl; else noImageTpl">
        <img [src]="imageUrl" alt="QR del estudiante" />
      </div>

      <ng-template #noImageTpl>
        <div class="preview-empty">
          <mat-icon>qr_code_2</mat-icon>
          <span>{{ emptyMessage }}</span>
        </div>
      </ng-template>

      <div class="preview-meta" *ngIf="metaItems.length > 0">
        <div class="preview-meta-row" *ngFor="let meta of metaItems">
          <span class="meta-label">{{ meta.label }}</span>
          <span class="meta-value">{{ meta.value }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .preview-student {
      font-size: 0.86rem;
      font-weight: 700;
      color: #1a1a2e;
      margin-bottom: 12px;
      text-align: center;
    }

    .preview-loading {
      display: flex;
      justify-content: center;
      padding: 14px 0 8px;
    }

    .preview-content {
      display: grid;
      gap: 10px;
    }

    .preview-image-wrap {
      border-radius: 12px;
      border: 1px solid #dce8f3;
      background: #fff;
      padding: 12px;
      display: flex;
      justify-content: center;
    }

    .preview-image-wrap img {
      width: min(100%, 240px);
      height: auto;
      border-radius: 8px;
      border: 1px solid #dce8f3;
      background: #fff;
      padding: 6px;
    }

    .preview-empty {
      border-radius: 12px;
      border: 1px dashed #c9d8e6;
      background: #f8fbff;
      padding: 14px 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      color: #56718e;
      font-size: 0.8rem;
      text-align: center;
      line-height: 1.4;
    }

    .preview-empty mat-icon {
      font-size: 1.2rem;
      width: 1.2rem;
      height: 1.2rem;
      color: #3c78b4;
    }

    .preview-meta {
      border: 1px solid #e3ecf5;
      background: #f8fbff;
      border-radius: 12px;
      padding: 10px 12px;
      display: grid;
      gap: 6px;
    }

    .preview-meta-row {
      display: flex;
      justify-content: space-between;
      gap: 10px;
    }

    .meta-label {
      font-size: 0.73rem;
      font-weight: 700;
      color: #6a8198;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .meta-value {
      font-size: 0.82rem;
      font-weight: 600;
      color: #1a1a2e;
    }

    .preview-error {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 8px 10px;
      border-radius: 9px;
      border: 1px solid #ffcdd2;
      background: #ffebee;
      color: #c62828;
      font-size: 0.78rem;
      line-height: 1.35;
    }

    .preview-error mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
    }
  `]
})
export class QrCredentialPreviewCardComponent {
  @Input({ required: true }) nombreCompleto = '';
  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() imageUrl: string | null = null;
  @Input() emptyMessage = 'No hay una credencial QR activa para previsualizar.';
  @Input() metaItems: readonly QrCredentialPreviewMetaItem[] = [];
}
