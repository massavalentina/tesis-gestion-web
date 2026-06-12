import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface ConfirmarAccionData {
  titulo: string;
  mensaje: string;
  textoConfirmar: string;
  color?: 'warn' | 'primary';
}

@Component({
  selector: 'app-confirmar-accion-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  template: `
    <div class="dlg-wrap">
      <h3 class="dlg-titulo">{{ data.titulo }}</h3>
      <p class="dlg-msg">{{ data.mensaje }}</p>
      <div class="dlg-actions">
        <button mat-button (click)="cancelar()">Cancelar</button>
        <button mat-flat-button [color]="data.color ?? 'warn'" (click)="confirmar()">
          {{ data.textoConfirmar }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dlg-wrap { padding: 28px 24px 20px; min-width: 300px; max-width: 460px; }
    .dlg-titulo { font-size: 18px; font-weight: 700; margin: 0 0 12px; }
    .dlg-msg { font-size: 14px; color: #5b6b7d; line-height: 1.6; margin: 0 0 20px; }
    .dlg-actions { display: flex; justify-content: flex-end; gap: 8px; }
  `],
})
export class ConfirmarAccionDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmarAccionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmarAccionData,
  ) {}

  cancelar(): void { this.dialogRef.close(false); }
  confirmar(): void { this.dialogRef.close(true); }
}
