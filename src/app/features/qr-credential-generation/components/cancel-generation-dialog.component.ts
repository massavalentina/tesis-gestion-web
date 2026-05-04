import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

export interface DatosCancelacionGeneracionQr {
  procesados: number;
  total: number;
  generados: number;
}

export interface ResultadoCancelacionGeneracionQr {
  accion: 'resume' | 'cancel';
  mantenerGenerados: boolean;
}

@Component({
  selector: 'app-cancel-generation-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <div class="dlg">
      <div class="dlg__badge">Detener proceso</div>
      <h2>¿Querés detener la generación?</h2>
      <p class="dlg__sub">
        Ya se procesaron {{ data.procesados }} de {{ data.total }} estudiantes.
      </p>

      <mat-dialog-content class="dlg__content">
        <div class="dlg__card">
          <p class="card-title">Ultima actualizacion visible</p>
          <p>
            QR generados confirmados en pantalla: <strong>{{ data.generados }}</strong>.
          </p>
          <p class="card-note" *ngIf="data.generados === 0 && data.procesados > 0">
            El conteo puede seguir actualizandose mientras se termina el estudiante en curso.
          </p>
          <p class="card-note">
            Al detener, el sistema completa el estudiante actual y luego aplica la opcion elegida.
          </p>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions class="dlg__actions">
        <button mat-stroked-button class="btn-ghost" (click)="cerrar()">
          Continuar generando
        </button>
        <button mat-raised-button class="btn-primary" (click)="confirmar(true)">
          Detener y conservar generados
        </button>
        <button mat-stroked-button class="btn-warn" (click)="confirmar(false)">
          Detener y revertir generados
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
    }

    .dlg__card {
      padding: 16px;
      border-radius: 18px;
      background: #f8fbff;
      border: 1px solid #dce8f3;
      text-align: left;
      color: #4e6881;
      line-height: 1.5;
    }

    .dlg__card p {
      margin: 0;
    }

    .card-title {
      color: #3f5f7a;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-weight: 900;
      margin-bottom: 8px !important;
    }

    .card-note {
      margin-top: 8px !important;
      color: #5f7790;
      font-size: 12px;
      line-height: 1.4;
    }

    .dlg__actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 20px;
      padding: 0;
    }

    .dlg__actions button {
      width: 100%;
      border-radius: 12px !important;
      font-weight: 900 !important;
      min-height: 44px;
    }

    .btn-primary {
      background: #86b8ea !important;
      color: #fff !important;
    }

    .btn-warn {
      border-color: #d8a8a1 !important;
      color: #b05447 !important;
      background: #fff !important;
    }

    .btn-ghost {
      border-color: #c7d9eb !important;
      color: #55738f !important;
      background: #fff !important;
    }
  `]
})
export class DialogoCancelacionGeneracionQrComponent {
  constructor(
    private dialogRef: MatDialogRef<DialogoCancelacionGeneracionQrComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DatosCancelacionGeneracionQr
  ) {}

  cerrar(): void {
    this.dialogRef.close({ accion: 'resume', mantenerGenerados: false });
  }

  confirmar(mantenerGenerados: boolean): void {
    this.dialogRef.close({ accion: 'cancel', mantenerGenerados });
  }
}
