import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

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
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="dlg">
      <div class="dlg__icon dlg__icon--warn">
        <mat-icon>pause_circle</mat-icon>
      </div>

      <h2>¿Desea detener la generación?</h2>
      <p class="dlg__sub">
        Ya se procesaron {{ data.procesados }} de {{ data.total }} estudiantes.
      </p>

      <mat-dialog-content class="dlg__content">
        <div class="dlg__card">
          <div class="row"><span>Procesados</span><strong>{{ data.procesados }} / {{ data.total }}</strong></div>
          <div class="row"><span>QR generados</span><strong>{{ data.generados }}</strong></div>
        </div>

        <div class="note-card">
          <p class="card-note" *ngIf="data.generados === 0 && data.procesados > 0">
            El conteo puede seguir actualizándose mientras se termina el estudiante en curso.
          </p>
          <p class="card-note">
            Al detener, el sistema completa el estudiante actual y luego aplica la opción elegida.
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
    }

    .dlg__card {
      padding: 14px;
      border-radius: 14px;
      background: #f8fbff;
      border: 1px solid #dce8f3;
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

    .note-card {
      padding: 12px 14px;
      border-radius: 14px;
      border: 1px solid #f3d0ca;
      background: #fff6f5;
      text-align: left;
    }

    .card-note {
      margin: 0;
      color: #7d2d24;
      font-size: 12px;
      line-height: 1.4;
      font-weight: 500;
    }

    .card-note + .card-note {
      margin-top: 8px;
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
      font-weight: 600 !important;
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
