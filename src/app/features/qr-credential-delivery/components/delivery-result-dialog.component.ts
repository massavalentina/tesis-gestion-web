import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface DatosResultadoEnvioQr {
  titulo: string;
  mensaje: string;
  enviados: number;
  omitidos: number;
  errores: number;
  detallesErrores?: string[] | null;
  icono: string;
  color: 'primary' | 'accent' | 'warn';
}

@Component({
  selector: 'app-delivery-result-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="dlg">
      <div class="icon" [class.warn]="data.color === 'warn'" [class.accent]="data.color === 'accent'">
        <mat-icon>{{ data.icono }}</mat-icon>
      </div>

      <div class="badge" [class.warn]="data.color === 'warn'" [class.accent]="data.color === 'accent'">
        {{ data.color === 'warn' ? 'Con incidencias' : 'Proceso finalizado' }}
      </div>

      <h2>{{ data.titulo }}</h2>
      <p class="message">{{ data.mensaje }}</p>

      <div class="stats">
        <div>Enviados: <strong>{{ data.enviados }}</strong></div>
        <div>Omitidos: <strong>{{ data.omitidos }}</strong></div>
        <div>Errores: <strong>{{ data.errores }}</strong></div>
      </div>

      <div class="error-list" *ngIf="data.detallesErrores?.length">
        <p class="error-list__title">Detalle de errores:</p>
        <ul>
          <li *ngFor="let detalle of data.detallesErrores">{{ detalle }}</li>
        </ul>
      </div>

      <div class="actions">
        <button mat-raised-button class="btn-primary" (click)="cerrar()">Cerrar</button>
      </div>
    </div>
  `,
  styles: [`
    .dlg { text-align: center; padding: 8px 4px 4px; max-width: 92vw; color: #0f2f4b; }
    .icon {
      display: inline-flex; align-items: center; justify-content: center; width: 68px; height: 68px;
      border-radius: 20px; background: #dff3e8; color: #1f6a5c; margin-bottom: 12px; border: 1px solid #cae8d8;
    }
    .icon.warn { background: #f9e0dd; color: #b3261e; border-color: #efcbc7; }
    .icon.accent { background: #fff1d7; color: #9a6700; border-color: #f4dfb0; }
    .icon mat-icon { font-size: 34px; width: 34px; height: 34px; }
    .badge {
      display: inline-flex; align-items: center; padding: 6px 12px; border-radius: 999px;
      background: #f0f8f3; border: 1px solid #cae8d8; color: #1f6a5c; font-size: 12px;
      font-weight: 900; margin-bottom: 12px;
    }
    .badge.warn { background: #fff3f1; border-color: #efcbc7; color: #b0473f; }
    .badge.accent { background: #fff8e7; border-color: #f4dfb0; color: #9a6700; }
    h2 { margin: 0 0 8px; font-size: 24px; line-height: 1.15; font-weight: 900; letter-spacing: -0.4px; }
    .message { color: rgba(15, 47, 75, 0.74); margin: 0 0 12px; line-height: 1.45; font-size: 14px; }
    .stats {
      margin: 0 0 18px; padding: 12px; border-radius: 14px; border: 1px solid #dce8f3;
      background: #fff; display: grid; gap: 6px; text-align: left; color: #2f4f6d;
    }
    .error-list {
      margin: 0 0 16px;
      padding: 12px;
      border-radius: 14px;
      border: 1px solid #f3d0ca;
      background: #fff6f5;
      text-align: left;
      color: #7d2d24;
      max-height: 180px;
      overflow: auto;
    }
    .error-list__title {
      margin: 0 0 6px;
      font-size: 13px;
      font-weight: 800;
    }
    .error-list ul {
      margin: 0;
      padding-left: 18px;
    }
    .error-list li {
      margin-bottom: 6px;
      font-size: 12px;
      line-height: 1.4;
    }
    .actions { display: flex; justify-content: center; }
    .btn-primary {
      background-color: #3c78b4 !important; color: #fff !important; border-radius: 12px !important;
      font-weight: 900 !important; padding: 10px 18px !important;
    }
    @media (max-width: 560px) {
      h2 { font-size: 20px; }
    }
  `]
})
export class DialogoResultadoEnvioQrComponent {
  constructor(
    private dialogRef: MatDialogRef<DialogoResultadoEnvioQrComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DatosResultadoEnvioQr
  ) {}

  cerrar(): void {
    this.dialogRef.close();
  }
}
