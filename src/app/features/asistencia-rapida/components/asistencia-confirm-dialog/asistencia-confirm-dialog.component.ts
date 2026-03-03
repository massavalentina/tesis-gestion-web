import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface AsistenciaConfirmDialogData {
  titulo: string;
  alumno: string;
  curso: string;
  fecha: string;
  hora: string;
  tipoTexto: string;
}

@Component({
  standalone: true,
  selector: 'app-asistencia-confirm-dialog',
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="dlg" role="dialog" aria-modal="true">
      <h2 class="title">{{ data.titulo }}</h2>

      <div class="alumno">{{ data.alumno }}</div>
      <div class="curso">CURSO: "{{ data.curso }}"</div>

      <div class="info">
        <div class="row">
          <div class="label">Tipo</div>
          <div class="value">{{ data.tipoTexto }}</div>
        </div>

        <div class="row">
          <div class="label">Registro</div>
          <div class="value">{{ data.fecha }} {{ data.hora }}hs</div>
        </div>
      </div>

      <div class="actions">
        <button
          type="button"
          class="round-btn red"
          (click)="cancelar()"
          aria-label="Cancelar"
        >
          <mat-icon>close</mat-icon>
        </button>

        <button
          type="button"
          class="round-btn green"
          (click)="confirmar()"
          aria-label="Confirmar"
        >
          <mat-icon>check</mat-icon>
        </button>
      </div>

      <div class="hint">
        Tocá ❌ para cancelar o ✅ para confirmar
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

    .alumno {
      font-size: 14px;
      font-weight: 900;
      letter-spacing: .3px;
      text-transform: uppercase;
      margin-bottom: 6px;
    }

    .curso {
      font-size: 13px;
      opacity: .75;
      margin-bottom: 14px;
      font-weight: 700;
    }

    .info {
      display: grid;
      gap: 8px;
      padding: 12px 14px;
      margin-bottom: 18px;
      border-radius: 18px;
      background: rgba(0, 0, 0, 0.04);
      text-align: left;
    }

    .row {
      display: grid;
      grid-template-columns: 78px 1fr;
      gap: 10px;
      font-size: 13px;
      line-height: 1.3;
    }

    .label {
      font-weight: 900;
      opacity: .7;
    }

    .value {
      font-weight: 800;
      opacity: .95;
      word-break: break-word;
      text-align: right;
    }

    .actions {
      display: flex;
      justify-content: center;
      gap: 22px;
      padding-top: 6px;
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
      box-shadow: 0 12px 22px rgba(0,0,0,.18);
      transition: transform .08s ease;
    }

    .round-btn:active {
      transform: scale(.96);
    }

    .round-btn.red {
      background: #E53935;
    }

    .round-btn.green {
      background: #2E7D32;
    }

    .round-btn mat-icon {
      color: #ffffff;
      font-size: 30px;
      width: 30px;
      height: 30px;
    }

    .hint {
      font-size: 12px;
      opacity: .55;
      margin-top: 12px;
      font-weight: 700;
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
      }
    }
  `]
})
export class AsistenciaConfirmDialogComponent {

  constructor(
    public dialogRef: MatDialogRef<AsistenciaConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AsistenciaConfirmDialogData
  ) {}

  cancelar() {
    this.dialogRef.close(false);
  }

  confirmar() {
    this.dialogRef.close(true);
  }
}