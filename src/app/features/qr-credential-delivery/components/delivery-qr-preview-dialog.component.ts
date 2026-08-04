import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { QrCredentialPreviewCardComponent } from '../../credenciales-qr/components/qr-credential-preview-card.component';

export interface DatosPreviewQrAlumno {
  nombreCompleto: string;
  dni?: string;
  imageUrl: string;
}

@Component({
  selector: 'app-delivery-qr-preview-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, QrCredentialPreviewCardComponent],
  template: `
    <div class="dlg">
      <div class="dlg__icon">
        <mat-icon>visibility</mat-icon>
      </div>

      <h2>Previsualizar credencial QR</h2>
      <p class="dlg__sub">{{ data.nombreCompleto }}. DNI: {{ data.dni || '-' }}</p>
      <br/>

      <app-qr-credential-preview-card
        [nombreCompleto]="data.nombreCompleto"
        [mostrarNombre]="false"
        [imageUrl]="data.imageUrl">
      </app-qr-credential-preview-card>

      <mat-dialog-actions class="dlg__actions">
        <button mat-raised-button class="btn-primary" (click)="cerrar()">Cerrar</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dlg {
      color: #0f2f4b;
      max-width: 92vw;
      padding: 8px 4px 4px;
      text-align: center;
      font-family: 'Open Sans', sans-serif;
    }
    .dlg__icon {
      width: 56px;
      height: 56px;
      margin: 0 auto 12px;
      display: grid;
      place-items: center;
      border-radius: 16px;
      background: #eef5fb;
      color: #3c78b4;
      border: 1px solid #d7e6f4;
    }
    .dlg__icon mat-icon {
      font-size: 30px;
      width: 30px;
      height: 30px;
    }
    h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      line-height: 1.2;
      color: #0f2f4b;
    }
    .dlg__sub {
      margin: 10px 0 0;
      color: #4b647a;
      font-size: 13.5px;
      line-height: 1.45;
    }
    .dlg__content {
      padding: 0 !important;
      margin-top: 16px;
      margin-bottom: 14px;
    }
    .dlg__panel {
      padding: 14px;
      border-radius: 14px;
      border: 1px solid #dce8f3;
      background: #f8fbff;
      text-align: left;
    }
    .row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 8px;
      font-size: 13px;
    }
    .row:last-child {
      margin-bottom: 0;
    }
    .row span {
      color: #64748b;
      font-weight: 600;
    }
    .row strong {
      color: #0f2f4b;
      font-weight: 600;
      text-align: right;
    }
    .dlg__actions {
      display: flex;
      justify-content: center;
      gap: 10px;
      margin-top: 18px;
      padding: 0;
    }
    .btn-primary {
      background-color: #3c78b4 !important;
      color: #fff !important;
      border-radius: 12px !important;
      font-weight: 600 !important;
      padding: 10px 18px !important;
    }
    @media (max-width: 560px) {
      h2 { font-size: 19px; }
      .row { flex-direction: column; }
      .dlg__actions button { width: 100%; }
    }
  `]
})
export class DialogoPreviewQrAlumnoComponent {
  constructor(
    private dialogRef: MatDialogRef<DialogoPreviewQrAlumnoComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DatosPreviewQrAlumno
  ) {}

  cerrar(): void {
    this.dialogRef.close();
  }
}
