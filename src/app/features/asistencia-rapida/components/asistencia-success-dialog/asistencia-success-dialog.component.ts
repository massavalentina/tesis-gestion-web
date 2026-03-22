import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface AsistenciaSuccessDialogData {
  titulo?: string;
  mensaje: string;
}

@Component({
  standalone: true,
  selector: 'app-asistencia-success-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="dlg" role="dialog" aria-modal="true" aria-label="Operación realizada">
      <div class="icon-wrap">
        <div class="icon-circle">
          <mat-icon>check_circle</mat-icon>
        </div>
      </div>

      <h2 class="title">{{ data.titulo || 'Operación realizada con éxito' }}</h2>

      <div class="msg" *ngIf="data?.mensaje">
        {{ data.mensaje }}
      </div>

      <div class="actions">
        <button
          mat-raised-button
          type="button"
          class="btn-ok"
          (click)="cerrar()">
          <mat-icon>check</mat-icon>
          <span>Aceptar</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      font-family: 'Open Sans', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      color: #0f2f4b;
    }

    .dlg {
      text-align: center;
      padding: 22px 20px 20px;
      border-radius: 30px;
      background: #ffffff;
      max-width: 360px;
      margin: auto;
    }

    .icon-wrap {
      display: flex;
      justify-content: center;
      margin-bottom: 10px;
    }

    .icon-circle {
      width: 68px;
      height: 68px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      background: rgba(46,125,50,.12);
    }

    .icon-circle mat-icon {
      color: #2e7d32;
      font-size: 34px;
      width: 34px;
      height: 34px;
    }

    .title {
      font-size: 20px;
      line-height: 1.25;
      font-weight: 900;
      margin: 0 0 10px;
    }

    .msg {
      font-size: 13px;
      color: rgba(15,47,75,.78);
      font-weight: 700;
      margin: 0 0 18px;
      line-height: 1.4;
      word-break: break-word;
    }

    .actions {
      display: flex;
      justify-content: center;
    }

    .btn-ok {
      min-width: 150px;
      height: 46px;
      border-radius: 14px !important;
      font-weight: 900 !important;
      background: #2e7d32 !important;
      color: #ffffff !important;
      box-shadow: 0 10px 20px rgba(46,125,50,.22) !important;
    }

    .btn-ok mat-icon {
      margin-right: 6px;
    }

    @media (max-width: 360px) {
      .dlg {
        padding: 18px 14px;
        border-radius: 24px;
      }

      .title {
        font-size: 18px;
      }

      .btn-ok {
        width: 100%;
      }
    }
  `]
})
export class AsistenciaSuccessDialogComponent {

  constructor(
    public dialogRef: MatDialogRef<AsistenciaSuccessDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AsistenciaSuccessDialogData
  ) {}

  cerrar(): void {
    this.dialogRef.close(true);
  }
}