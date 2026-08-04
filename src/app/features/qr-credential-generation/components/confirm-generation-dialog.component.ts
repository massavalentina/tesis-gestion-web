import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface DatosConfirmacionGeneracionQr {
  curso: string;
  alcance: string;
  etiquetaIntento: string;
  totalIntentos: number;
}

@Component({
  selector: 'app-confirm-generation-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="dlg">
      <div class="dlg__icon">
        <mat-icon>qr_code_2</mat-icon>
      </div>

      <h2>Comenzar generación de credenciales</h2>
<br/>

      <mat-dialog-content class="dlg__content">
        <div class="dlg__panel">
          <div class="row"><span>Curso</span><strong>{{ data.curso }}</strong></div>
          <div class="row"><span>Alcance</span><strong>{{ data.alcance }}</strong></div>
          <div class="row"><span>{{ data.etiquetaIntento }}</span><strong>{{ data.totalIntentos }}</strong></div>
        </div>

        <p class="note">
          El proceso se ejecuta en segundo plano y aplicará el alcance seleccionado.
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
    }

    .dlg__sub {
      margin: 10px 0 0;
      color: #4b647a;
      font-size: 13.5px;
      line-height: 1.45;
    }

    .dlg__content {
      display: grid;
      gap: 12px;
      margin-top: 16px;
    }

    .dlg__panel {
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
      overflow-wrap: anywhere;
    }

    .note {
      margin: 0;
      color: #4b647a;
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
      background-color: #3c78b4 !important;
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

    .btn-ghost:hover {
      background: #f0f5fa !important;
    }

    @media (max-width: 560px) {
      h2 {
        font-size: 19px;
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
