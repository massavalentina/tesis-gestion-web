import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

export interface ScanErrorData {
  title: string;
  message: string;
}

@Component({
  selector: 'app-scan-error-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatIconModule,
    MatButtonModule
  ],
  template: `
    <div class="error-dialog">
      <button class="close-btn" (click)="close()">✕</button>

      <div class="icon">
        <mat-icon>error</mat-icon>
      </div>

      <h2>{{ data.title }}</h2>

      <p [innerHTML]="data.message"></p>
    </div>
  `,
  styles: [`
    .error-dialog {
      position: relative;
      background: white;
      border-radius: 24px;
      padding: 24px 20px 28px;
      text-align: center;
      max-width: 320px;
    }

    .icon mat-icon {
      font-size: 48px;
      color: #f9a825;
    }

    h2 {
      color: #d32f2f;
      margin: 12px 0;
    }

    p {
      color: #d32f2f;
      font-weight: 500;
    }

    .close-btn {
      position: absolute;
      top: 8px;
      right: 12px;
      border: none;
      background: transparent;
      font-size: 20px;
      cursor: pointer;
    }
  `]
})
export class ScanErrorDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<ScanErrorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ScanErrorData
  ) {}

  close() {
    this.dialogRef.close();
  }
}
