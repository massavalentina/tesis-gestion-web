import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface DatosResultadoEnvioIndividualQr {
  titulo: string;
  mensaje: string;
  destino?: string | null;
  modo: 'success' | 'error';
}

@Component({
  selector: 'app-single-delivery-result-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="dlg">
      <div class="dlg__icon" [class.dlg__icon--error]="data.modo === 'error'">
        <mat-icon>{{ data.modo === 'error' ? 'error' : 'check_circle' }}</mat-icon>
      </div>

      <h2>{{ data.titulo }}</h2>
      <p class="dlg__message">{{ data.mensaje }}</p>

      <p class="dlg__destino" *ngIf="data.destino">
        Destino: <strong>{{ data.destino }}</strong>
      </p>

      <mat-dialog-actions class="dlg__actions">
        <button mat-raised-button class="btn-primary" (click)="cerrar()">Entendido</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dlg {
      color: #0f2f4b;
      max-width: 92vw;
      padding: 8px;
      text-align: center;
    }
    .dlg__icon {
      width: 60px;
      height: 60px;
      margin: 0 auto 14px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      background: #e9f6ef;
      color: #2e8b57;
      border: 1px solid #b9e5cb;
    }
    .dlg__icon mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }
    .dlg__icon--error {
      background: #fdecea;
      color: #b42318;
      border-color: #f6c8c2;
    }
    h2 {
      margin: 0;
      font-size: 22px;
      line-height: 1.2;
      font-weight: 900;
    }
    .dlg__message {
      margin: 10px 0 0;
      color: #2f4f6d;
      line-height: 1.45;
      font-size: 14px;
    }
    .dlg__destino {
      margin: 10px 0 0;
      font-size: 13px;
      color: #365977;
    }
    .dlg__actions {
      margin-top: 18px;
      display: flex;
      justify-content: center;
      padding: 0;
    }
    .btn-primary {
      background-color: #3c78b4 !important;
      color: #fff !important;
      border-radius: 12px !important;
      font-weight: 900 !important;
      padding: 10px 18px !important;
    }
  `]
})
export class DialogoResultadoEnvioIndividualQrComponent {
  constructor(
    private dialogRef: MatDialogRef<DialogoResultadoEnvioIndividualQrComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DatosResultadoEnvioIndividualQr
  ) {}

  cerrar(): void {
    this.dialogRef.close();
  }
}
