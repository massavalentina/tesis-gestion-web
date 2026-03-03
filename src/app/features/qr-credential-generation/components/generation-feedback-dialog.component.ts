import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export interface DatosFeedbackGeneracionQr {
  titulo: string;
  mensaje: string;
  modo: 'loading' | 'error';
  textoBoton?: string;
}

@Component({
  selector: 'app-generation-feedback-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="dlg">
      <div class="dlg__icon" [class.dlg__icon--error]="data.modo === 'error'">
        <mat-spinner *ngIf="data.modo === 'loading'" diameter="40"></mat-spinner>
        <mat-icon *ngIf="data.modo === 'error'">error</mat-icon>
      </div>

      <h2>{{ data.titulo }}</h2>
      <p>{{ data.mensaje }}</p>

      <mat-dialog-actions class="dlg__actions" *ngIf="data.modo === 'error'">
        <button mat-raised-button class="btn-primary" (click)="cerrar()">
          {{ data.textoBoton || 'Entendido' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dlg {
      text-align: center;
      color: #0f2f4b;
      max-width: 92vw;
      padding: 8px 4px 4px;
    }

    .dlg__icon {
      width: 72px;
      height: 72px;
      border-radius: 22px;
      background: #eef5fb;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 14px;
    }

    .dlg__icon--error {
      background: #fff1f0;
      color: #c0382b;
    }

    .dlg__icon mat-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
    }

    h2 {
      margin: 0 0 8px;
      font-size: 23px;
      font-weight: 900;
      line-height: 1.15;
    }

    p {
      margin: 0;
      color: rgba(15, 47, 75, 0.76);
      line-height: 1.45;
      font-size: 14px;
    }

    .dlg__actions {
      display: flex;
      justify-content: center;
      margin-top: 20px;
      padding: 0;
    }

    .btn-primary {
      background-color: #86b8ea !important;
      color: #fff !important;
      border-radius: 12px !important;
      font-weight: 900 !important;
      padding: 10px 18px !important;
    }
  `]
})
export class DialogoFeedbackGeneracionQrComponent {
  constructor(
    private dialogRef: MatDialogRef<DialogoFeedbackGeneracionQrComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DatosFeedbackGeneracionQr
  ) {}

  cerrar(): void {
    this.dialogRef.close();
  }
}
