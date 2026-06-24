import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export type ConfirmarEstadoIEResult = 'evaluada' | 'mantener' | 'cancelar';

export interface ConfirmarEstadoIEData {
  titulo: string;
  mensaje: string;
  textoEvaluada: string;
  textoMantener: string;
}

@Component({
  selector: 'app-confirmar-estado-ie-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  template: `
    <div class="dlg-wrap">
      <div class="dlg-head">
        <h3 class="dlg-titulo">{{ data.titulo }}</h3>
        <button type="button" class="dlg-close" (click)="cerrar('cancelar')" aria-label="Cerrar">×</button>
      </div>
      <p class="dlg-msg">{{ data.mensaje }}</p>
      <br />
      <div class="dlg-actions">
        <button mat-stroked-button class="dlg-secondary" (click)="cerrar('mantener')">
          {{ data.textoMantener }}
        </button>
        <button mat-flat-button color="primary" (click)="cerrar('evaluada')">
          {{ data.textoEvaluada }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dlg-wrap { padding: 24px 22px 20px; min-width: 320px; max-width: 480px; }
    .dlg-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
    .dlg-titulo { font-size: 18px; font-weight: 700; margin: 0 0 12px; }
    .dlg-close {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      border: 0;
      background: #eef2ff;
      color: #334155;
      font-size: 20px;
      line-height: 1;
      cursor: pointer;
      flex-shrink: 0;
    }
    .dlg-msg { font-size: 14px; color: #5b6b7d; line-height: 1.6; margin: 0 0 6px; }
    .dlg-hint { margin: 0 0 18px; font-size: 12px; color: #718096; }
    .dlg-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .dlg-actions button { width: 100%; }
    .dlg-secondary { color: #1d4ed8; border-color: #bfdbfe; }
    @media (max-width: 480px) {
      .dlg-actions { grid-template-columns: 1fr; }
    }
  `],
})
export class ConfirmarEstadoIEDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmarEstadoIEDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: ConfirmarEstadoIEData,
  ) {}

  cerrar(result: ConfirmarEstadoIEResult): void {
    this.dialogRef.close(result);
  }
}
