import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

export interface DatosConfirmacionEnvioIndividualQr {
  curso: string;
  alumno: string;
  dni: string;
  tutorEmail: string;
  esReenvio: boolean;
}

@Component({
  selector: 'app-confirm-single-delivery-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <div class="dlg">
      <div class="dlg__badge">{{ data.esReenvio ? 'Reenvio QR' : 'Envio QR' }}</div>
      <h2>{{ data.esReenvio ? 'Confirmar reenvio de credencial' : 'Confirmar envio de credencial' }}</h2>
      <p class="dlg__sub">Se enviará un correo al tutor principal del alumno.</p>

      <mat-dialog-content class="dlg__content">
        <div class="dlg__panel">
          <div class="row"><span>Curso</span><strong>{{ data.curso }}</strong></div>
          <div class="row"><span>Alumno</span><strong>{{ data.alumno }}</strong></div>
          <div class="row"><span>DNI</span><strong>{{ data.dni }}</strong></div>
          <div class="row"><span>Email tutor</span><strong>{{ data.tutorEmail }}</strong></div>
        </div>

        <p class="help">
          Esta acción envía solo la credencial de este alumno y actualiza su estado en la tabla.
        </p>
      </mat-dialog-content>

      <mat-dialog-actions class="dlg__actions">
        <button mat-stroked-button class="btn-ghost" (click)="cancelar()">Cancelar</button>
        <button mat-raised-button class="btn-primary" (click)="confirmar()">
          {{ data.esReenvio ? 'Reenviar' : 'Enviar' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dlg { color: #0f2f4b; max-width: 92vw; padding: 4px; text-align: center; }
    .dlg__badge {
      display: inline-flex; align-items: center; padding: 6px 12px; border-radius: 999px;
      background: #f0f5fa; border: 1px solid #c7d9eb; color: #3c78b4; font-size: 12px;
      font-weight: 900; margin-bottom: 12px;
    }
    h2 { margin: 0; font-size: 22px; line-height: 1.15; font-weight: 900; }
    .dlg__sub { margin: 10px 0 0; color: rgba(15, 47, 75, 0.74); font-size: 14px; }
    .dlg__content { padding: 0 !important; margin-top: 16px; display: grid; gap: 12px; }
    .dlg__panel {
      padding: 14px; border-radius: 16px; border: 1px solid #dce8f3;
      background: #f8fbff; text-align: left;
    }
    .row { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
    .row:last-child { margin-bottom: 0; }
    .help {
      margin: 0; padding: 10px 12px; border-radius: 12px;
      background: #f8fbff; border: 1px solid #dce8f3;
      color: #2f4f6d; text-align: left; font-size: 12px; font-weight: 700;
    }
    .dlg__actions { display: flex; justify-content: center; gap: 10px; margin-top: 18px; padding: 0; }
    .btn-primary {
      background-color: #3c78b4 !important; color: #fff !important; border-radius: 12px !important;
      font-weight: 900 !important; padding: 10px 18px !important;
    }
    .btn-ghost {
      border-color: #c7d9eb !important; color: #3c78b4 !important; background: #fff !important;
      border-radius: 12px !important; font-weight: 900 !important; padding: 10px 18px !important;
    }
    @media (max-width: 560px) {
      h2 { font-size: 19px; }
      .row { flex-direction: column; }
      .dlg__actions { flex-direction: column-reverse; }
      .dlg__actions button { width: 100%; }
    }
  `]
})
export class DialogoConfirmacionEnvioIndividualQrComponent {
  constructor(
    private dialogRef: MatDialogRef<DialogoConfirmacionEnvioIndividualQrComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DatosConfirmacionEnvioIndividualQr
  ) {}

  confirmar(): void {
    this.dialogRef.close(true);
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
