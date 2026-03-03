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
      <div class="dlg__badge">Cancelar proceso</div>
      <h2>¿Querés detener la generación?</h2>
      <p class="dlg__sub">
        Ya se procesaron {{ data.procesados }} de {{ data.total }} estudiantes.
      </p>

      <mat-dialog-content class="dlg__content">
        <div class="dlg__card">
          <p>
            Hasta ahora se generaron {{ data.generados }} QR(s).
            Si cancelás, el sistema termina el alumno actual y después detiene el proceso.
          </p>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions class="dlg__actions">
        <button mat-stroked-button class="btn-ghost" (click)="cerrar()">
          Seguir generando
        </button>
        <button mat-stroked-button class="btn-warn" (click)="confirmar(true)">
          Cancelar y conservar generados
        </button>
        <button mat-raised-button class="btn-primary" (click)="confirmar(false)">
          Cancelar y revertir
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
      background: #c65a3a !important;
      color: #fff !important;
    }

    .btn-warn {
      border-color: #d8c4a4 !important;
      color: #9a6700 !important;
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
