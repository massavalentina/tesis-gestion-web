import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface DatosCancelacionEnvioQr {
  procesados: number;
  total: number;
  enviados: number;
  pendientesCancelar: number;
}

@Component({
  selector: 'app-cancel-delivery-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="dlg">
      <div class="dlg__icon dlg__icon--warn">
        <mat-icon>pause_circle</mat-icon>
      </div>

      <h2>¿Qué desea hacer con el envío?</h2>
      <p class="dlg__sub">
        El proceso ya está en pausa. Puede continuarlo o cancelar los envíos pendientes.
      </p>

      <mat-dialog-content class="dlg__content">
        <div class="dlg__panel">
          <div class="row">
            <span>Estado actual</span>
            <strong>{{ data.procesados }} / {{ data.total }} procesados</strong>
          </div>
        </div>

        <div class="dlg__stats">
          <div class="row"><span>Enviados hasta ahora</span><strong>{{ data.enviados }}</strong></div>
          <div class="row"><span>Se cancelarían al confirmar</span><strong>{{ data.pendientesCancelar }}</strong></div>
        </div>

        <p class="warning">
          Los correos ya enviados no se pueden deshacer. Esta acción solo detiene envíos pendientes.
        </p>
      </mat-dialog-content>

      <mat-dialog-actions class="dlg__actions">
        <button mat-stroked-button class="btn-ghost" (click)="cancelar()">
          Continuar enviando
        </button>
        <button mat-raised-button class="btn-primary" (click)="confirmar()">
          Cancelar y detener pendientes
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
      border: 1px solid #d7e6f4;
      background: #eef5fb;
      color: #3c78b4;
    }

    .dlg__icon--warn {
      background: #fff3e6;
      border-color: #ffd3a6;
      color: #a55d12;
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
      display: grid;
      gap: 12px;
    }

    .dlg__panel {
      padding: 14px;
      border-radius: 14px;
      border: 1px solid #dce8f3;
      background: #f8fbff;
      text-align: left;
    }

    .dlg__stats {
      margin: 0;
      padding: 14px 16px;
      border-radius: 14px;
      border: 1px solid #dce8f3;
      background: #f8fbff;
      text-align: left;
      display: grid;
      gap: 6px;
    }

    .row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 13px;
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

    .warning {
      margin: 0;
      padding: 10px 12px;
      border-radius: 12px;
      background: #fff6f5;
      border: 1px solid #f3d0ca;
      color: #7d2d24;
      text-align: left;
      font-size: 12px;
      font-weight: 500;
      line-height: 1.45;
    }

    .dlg__actions {
      display: flex;
      justify-content: center;
      gap: 10px;
      margin-top: 18px;
      padding: 0;
    }

    .btn-primary {
      background-color: #c65a3a !important;
      color: #fff !important;
      border-radius: 12px !important;
      font-weight: 600 !important;
      padding: 10px 18px !important;
    }

    .btn-ghost {
      border-color: #c7d9eb !important;
      color: #3c78b4 !important;
      background: #fff !important;
      border-radius: 12px !important;
      font-weight: 600 !important;
      padding: 10px 18px !important;
    }

    @media (max-width: 560px) {
      h2 {
        font-size: 19px;
      }

      .row {
        flex-direction: column;
      }

      .dlg__actions {
        flex-direction: column-reverse;
      }

      .dlg__actions button {
        width: 100%;
      }
    }
  `]
})
export class DialogoCancelacionEnvioQrComponent {
  constructor(
    private dialogRef: MatDialogRef<DialogoCancelacionEnvioQrComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DatosCancelacionEnvioQr
  ) {}

  confirmar(): void {
    this.dialogRef.close(true);
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
