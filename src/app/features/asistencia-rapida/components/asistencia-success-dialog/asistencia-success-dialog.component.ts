import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface AsistenciaSuccessDialogData {
  mensaje: string;
}

@Component({
  standalone: true,
  selector: 'app-asistencia-success-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="dlg" role="dialog" aria-modal="true" aria-label="Éxito">
      <h2 class="title">¡Operación realizada con éxito!</h2>

      <div class="ok-wrap">
        <button
          type="button"
          class="round-btn"
          (click)="cerrar()"
          aria-label="Aceptar"
          title="Aceptar"
        >
          <mat-icon>check</mat-icon>
        </button>
      </div>

      <div class="msg" *ngIf="data?.mensaje">
        {{ data.mensaje }}
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
      border-radius: 34px;
      background: #ffffff;
      max-width: 360px;
      margin: auto;
    }

    .title {
      font-size: 20px;
      line-height: 1.25;
      font-weight: 900;
      margin: 0 0 12px;
    }

    .ok-wrap {
      display: flex;
      justify-content: center;
      margin: 6px 0 14px;
    }

    .round-btn {
      width: 62px;
      height: 62px;
      border-radius: 999px;
      min-width: 62px;
      border: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      background: #2E7D32;
      box-shadow: 0 12px 22px rgba(0,0,0,.18);
      transition: transform .08s ease;
    }

    .round-btn:active {
      transform: scale(.96);
    }

    .round-btn mat-icon {
      color: #ffffff;
      font-size: 30px;
      width: 30px;
      height: 30px;
    }

    .msg {
      font-size: 13px;
      opacity: .78;
      font-weight: 600;
      margin: 0;
      line-height: 1.35;
      word-break: break-word;
    }

    @media (max-width: 360px) {
      .dlg {
        padding: 18px 14px;
        border-radius: 28px;
      }

      .round-btn {
        width: 56px;
        height: 56px;
        min-width: 56px;
      }

      .round-btn mat-icon {
        font-size: 26px;
        width: 26px;
        height: 26px;
      }

      .title {
        font-size: 18px;
      }
    }
  `]
})
export class AsistenciaSuccessDialogComponent {

  constructor(
    public dialogRef: MatDialogRef<AsistenciaSuccessDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AsistenciaSuccessDialogData
  ) {}

  cerrar() {
    this.dialogRef.close(true);
  }
}