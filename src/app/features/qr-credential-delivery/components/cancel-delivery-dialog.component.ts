import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

export interface DatosCancelacionEnvioQr {
  procesados: number;
  total: number;
  enviados: number;
  pendientesCancelar: number;
}

@Component({
  selector: 'app-cancel-delivery-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <div class="dlg">
      <div class="dlg__badge">Proceso pausado</div>
      <h2>¿Qué querés hacer con el envío?</h2>
      <p class="dlg__sub">
        El proceso ya está en pausa. Podés continuarlo o cancelar los envíos pendientes.
      </p>

      <mat-dialog-content class="dlg__content">
        <div class="dlg__panel">
          <div class="row">
            <span>Estado actual</span>
            <strong>{{ data.procesados }} / {{ data.total }} procesados</strong>
          </div>
        </div>

        <ul class="stats">
          <li>Enviados hasta ahora: <strong>{{ data.enviados }}</strong></li>
          <li>Se cancelarían al confirmar: <strong>{{ data.pendientesCancelar }}</strong></li>
        </ul>

        <div class="dlg__card">
          <div class="row">
            <span>Detalle</span>
            <strong>Si cancelás, no se enviarán los pendientes.</strong>
          </div>
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
      padding: 4px;
      text-align: center;
    }

    .dlg__badge {
      display: inline-flex;
      align-items: center;
      padding: 6px 12px;
      border-radius: 999px;
      background: #fff3e6;
      border: 1px solid #ffd3a6;
      color: #a55d12;
      font-size: 12px;
      font-weight: 900;
      margin-bottom: 12px;
    }

    h2 {
      margin: 0;
      font-size: 24px;
      line-height: 1.15;
      font-weight: 900;
    }

    .dlg__sub {
      margin: 10px 0 0;
      color: rgba(15, 47, 75, 0.74);
      font-size: 14px;
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
      border-radius: 16px;
      border: 1px solid #dce8f3;
      background: #f8fbff;
      text-align: left;
    }

    .stats {
      margin: 0;
      padding: 14px 16px;
      border-radius: 16px;
      border: 1px solid #dce8f3;
      background: #fff;
      text-align: left;
      list-style: none;
      display: grid;
      gap: 6px;
      color: #2f4f6d;
      font-size: 13px;
    }

    .dlg__card {
      padding: 12px 14px;
      border-radius: 14px;
      border: 1px solid #f3d0ca;
      background: #fff6f5;
      text-align: left;
    }

    .row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 0;
      color: #2f4f6d;
      font-size: 13px;
    }

    .dlg__card .row strong {
      font-size: 12px;
      color: #7d2d24;
      font-weight: 800;
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
      font-weight: 700;
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
      font-weight: 900 !important;
      padding: 10px 18px !important;
    }

    .btn-ghost {
      border-color: #c7d9eb !important;
      color: #3c78b4 !important;
      background: #fff !important;
      border-radius: 12px !important;
      font-weight: 900 !important;
      padding: 10px 18px !important;
    }

    @media (max-width: 560px) {
      h2 {
        font-size: 20px;
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
