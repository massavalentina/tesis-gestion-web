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
      <button class="close-btn" type="button" aria-label="Cerrar" (click)="cerrar()">
        <mat-icon>close</mat-icon>
      </button>

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
    </div>
  `,
  styles: [`
    .dlg {
      position: relative;
      color: #0f2f4b;
      max-width: 92vw;
      padding: 6px 2px 2px;
      text-align: center;
      font-family: 'Open Sans', sans-serif;
    }

    .close-btn {
      position: absolute;
      top: -8px;
      right: -8px;
      width: 34px;
      height: 34px;
      border: 1px solid #d6e4f1;
      border-radius: 12px;
      background: #f2f7fc;
      color: #47698b;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background .16s, border-color .16s, color .16s;
    }

    .close-btn:hover {
      background: #e7f1fb;
      border-color: #bdd6ec;
      color: #1e4f83;
    }

    .close-btn mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .dlg__icon {
      width: 50px;
      height: 50px;
      margin: 0 auto 10px;
      display: grid;
      place-items: center;
      border-radius: 15px;
      background: #eef5fb;
      color: #3c78b4;
      border: 1px solid #d7e6f4;
    }
    .dlg__icon mat-icon {
      font-size: 27px;
      width: 27px;
      height: 27px;
    }
    h2 {
      margin: 0;
      font-size: 19px;
      font-weight: 700;
      line-height: 1.2;
      color: #0f2f4b;
    }
    .dlg__sub {
      margin: 8px 0 0;
      color: #4b647a;
      font-size: 13.5px;
      line-height: 1.45;
    }

    br {
      display: none;
    }

    app-qr-credential-preview-card {
      display: block;
      margin-top: 16px;
    }

    :host ::ng-deep app-qr-credential-preview-card .preview-image-wrap {
      padding: 10px;
    }

    :host ::ng-deep app-qr-credential-preview-card .preview-image-wrap img {
      width: min(100%, 215px);
      padding: 5px;
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
    @media (max-width: 560px) {
      h2 { font-size: 19px; }
      .row { flex-direction: column; }

      .close-btn {
        top: -6px;
        right: -6px;
      }
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
