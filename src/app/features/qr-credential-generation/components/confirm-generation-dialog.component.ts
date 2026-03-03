import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

export interface DatosConfirmacionGeneracionQr {
  curso: string;
  alcance: string;
  totalAlumnosActivos: number;
  totalQrActivos: number;
  totalPendientesGenerar: number;
}

@Component({
  selector: 'app-confirm-generation-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <div class="dlg">
      <div class="dlg__head">
        <div class="dlg__badge">Generacion QR</div>
        <h2>Comenzar generacion de credenciales</h2>
        <p class="dlg__sub">
          Revisa el alcance antes de iniciar. El proceso se ejecuta en segundo plano.
        </p>
      </div>

      <mat-dialog-content class="dlg__content">
        <div class="dlg__panel">
          <div class="row">
            <span class="label">Curso</span>
            <span class="value strong">{{ data.curso }}</span>
          </div>

          <div class="row">
            <span class="label">Alcance</span>
            <span class="value">{{ data.alcance }}</span>
          </div>
        </div>

        <p class="note">
          Se van a generar solo las credenciales correspondientes al curso seleccionado.
        </p>
      </mat-dialog-content>

      <mat-dialog-actions class="dlg__actions" align="end">
        <button mat-stroked-button class="btn-ghost" (click)="cancelar()">Cancelar</button>
        <button mat-raised-button class="btn-primary" (click)="confirmar()">Comenzar</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    :host ::ng-deep .mat-mdc-dialog-content{
      max-height: none !important;
      overflow: visible !important;
      padding: 0 !important;
    }

    .dlg {
      color: #0f2f4b;
      max-width: 92vw;
      padding: 4px;
    }

    .dlg__head {
      text-align: center;
      margin-bottom: 18px;
    }

    .dlg__badge {
      display: inline-flex;
      align-items: center;
      padding: 6px 12px;
      border-radius: 999px;
      background: #f0f5fa;
      border: 1px solid #c7d9eb;
      color: #86b8ea;
      font-size: 12px;
      font-weight: 900;
      margin-bottom: 12px;
    }

    h2 {
      margin: 0;
      font-size: 24px;
      line-height: 1.15;
      font-weight: 900;
      letter-spacing: -0.4px;
    }

    .dlg__sub {
      margin: 10px 0 0;
      color: rgba(15, 47, 75, 0.72);
      font-size: 13px;
      font-weight: 600;
    }

    .dlg__content {
      display: grid;
      gap: 14px;
    }

    .dlg__panel {
      padding: 16px;
      border-radius: 20px;
      background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
      border: 1px solid rgba(199, 217, 235, 0.95);
      box-shadow: 0 12px 26px rgba(20, 55, 90, 0.08);
    }

    .row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 10px;
    }

    .row:last-child {
      margin-bottom: 0;
    }

    .label {
      color: #5d7c9a;
      font-weight: 800;
    }

    .value {
      text-align: right;
      color: #0f2f4b;
      font-weight: 700;
      overflow-wrap: anywhere;
    }

    .strong {
      font-weight: 900;
    }

    .note {
      margin: 0;
      color: rgba(15, 47, 75, 0.72);
      text-align: center;
      font-size: 13px;
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
      background-color: #86b8ea !important;
      color: #fff !important;
      border-radius: 12px !important;
      font-weight: 900 !important;
      padding: 10px 18px !important;
      box-shadow: 0 10px 22px rgba(134, 184, 234, 0.34) !important;
    }

    .btn-ghost {
      border-color: #c7d9eb !important;
      color: #86b8ea !important;
      background: #fff !important;
      border-radius: 12px !important;
      font-weight: 900 !important;
      padding: 10px 18px !important;
    }

    .btn-ghost:hover {
      background: #f0f5fa !important;
    }

    @media (max-width: 560px) {
      h2 {
        font-size: 20px;
      }

      .row {
        flex-direction: column;
      }

      .value {
        text-align: left;
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
export class DialogoConfirmacionGeneracionQrComponent {
  constructor(
    private dialogRef: MatDialogRef<DialogoConfirmacionGeneracionQrComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DatosConfirmacionGeneracionQr
  ) {}

  confirmar(): void {
    this.dialogRef.close(true);
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
