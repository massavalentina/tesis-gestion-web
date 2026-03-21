import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface AsistenciaConfirmDialogData {
  titulo: string;
  alumno: string;
  dni?: string;
  curso: string;
  fecha: string;
  hora: string;
  tipoTexto: string;
  detalle?: string;
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
      <div class="icon-wrap">
        <div class="icon-circle">
          <mat-icon>fact_check</mat-icon>
        </div>
      </div>

      <h2 class="title">{{ data.titulo }}</h2>

      <p class="detail" *ngIf="data.detalle">
        {{ data.detalle }}
      </p>

      <div class="alumno">{{ data.alumno }}</div>
      <div class="dni" *ngIf="data.dni">DNI {{ data.dni }}</div>
      <div class="curso">Curso: {{ data.curso }}</div>

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
          class="btn btn-cancel"
          (click)="cancelar()">
          <mat-icon>close</mat-icon>
        </button>

        <button
          type="button"
          class="btn btn-confirm"
          (click)="confirmar()">
          <mat-icon>check</mat-icon>
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
      width: 64px;
      height: 64px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      background: rgba(60,120,180,.12);
    }

    .icon-circle mat-icon {
      color: #3c78b4;
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .title {
      font-size: 20px;
      line-height: 1.25;
      font-weight: 900;
      margin: 0 0 10px;
    }

    .detail {
      font-size: 13px;
      line-height: 1.4;
      font-weight: 700;
      color: rgba(15,47,75,.72);
      margin: 0 0 14px;
    }

    .alumno {
      font-size: 14px;
      font-weight: 900;
      letter-spacing: .2px;
      text-transform: uppercase;
      margin-bottom: 6px;
    }

    .dni {
      font-size: 13px;
      font-weight: 700;
      opacity: .75;
      margin-bottom: 4px;
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
      background: rgba(60,120,180,.06);
      border: 1px solid rgba(60,120,180,.10);
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
      gap: 20px;
    }

    .btn {
      width: 64px;
      height: 64px;
      border-radius: 999px !important;
      border: none;
      cursor: pointer;
      display: grid;
      place-items: center;
      padding: 0;
      transition: transform .12s ease, box-shadow .12s ease;
    }

    .btn:hover {
      transform: scale(1.07);
    }

    .btn mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .btn-cancel {
      background: #e53935 !important;
      color: #fff !important;
      box-shadow: 0 6px 18px rgba(229,57,53,.35) !important;
    }

    .btn-confirm {
      background: #43a047 !important;
      color: #fff !important;
      box-shadow: 0 6px 18px rgba(67,160,71,.35) !important;
    }

    @media (max-width: 360px) {
      .dlg {
        padding: 18px 14px;
        border-radius: 24px;
      }
    }
  `]
})
export class AsistenciaConfirmDialogComponent {

  constructor(
    public dialogRef: MatDialogRef<AsistenciaConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AsistenciaConfirmDialogData
  ) {}

  cancelar(): void {
    this.dialogRef.close(false);
  }

  confirmar(): void {
    this.dialogRef.close(true);
  }
}