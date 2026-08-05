import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

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
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="dlg">
      <div class="dlg__icon">
        <mat-icon>{{ data.esReenvio ? 'forward_to_inbox' : 'send' }}</mat-icon>
      </div>

      <h2>{{ data.esReenvio ? 'Confirmar reenvío de credencial' : 'Confirmar envío de credencial' }}</h2>
      <p class="dlg__sub">Se enviará un correo al tutor principal del estudiante.</p>

      <mat-dialog-content class="dlg__content">
        <div class="dlg__panel">
          <div class="row"><span>Estudiante</span><strong>{{ data.alumno }}</strong></div>
          <div class="row"><span>DNI</span><strong>{{ data.dni }}</strong></div>
          <div class="row"><span>Email tutor</span><strong>{{ data.tutorEmail }}</strong></div>
        </div>

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
      line-height: 1.2;
      font-weight: 700;
      color: #0f2f4b;
    }
    .dlg__sub {
      margin: 10px 0 0;
      color: #4b647a;
      font-size: 13.5px;
      line-height: 1.45;
    }
    .dlg__content { padding: 0 !important; margin-top: 16px; display: grid; gap: 12px; }
    .dlg__panel {
      padding: 14px; border-radius: 14px; border: 1px solid #dce8f3;
      background: #f8fbff; text-align: left;
    }
    .row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 8px;
      font-size: 13px;
    }
    .row:last-child { margin-bottom: 0; }
    .row span {
      color: #64748b;
      font-weight: 600;
    }
    .row strong {
      color: #0f2f4b;
      font-weight: 600;
      text-align: right;
    }
    .help {
      margin: 0; padding: 10px 12px; border-radius: 12px;
      background: #f8fbff; border: 1px solid #dce8f3;
      color: #2f4f6d; text-align: left; font-size: 12px; font-weight: 500;
    }
    .dlg__actions { display: flex; justify-content: center; gap: 10px; margin-top: 18px; padding: 0; }
    .btn-primary {
      background-color: #3c78b4 !important; color: #fff !important; border-radius: 12px !important;
      font-weight: 600 !important; padding: 10px 18px !important;
    }
    .btn-ghost {
      border-color: #c7d9eb !important; color: #3c78b4 !important; background: #fff !important;
      border-radius: 12px !important; font-weight: 600 !important; padding: 10px 18px !important;
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
