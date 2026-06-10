import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
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
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.titulo }}</h2>
    <mat-dialog-content>
      <p class="dialog-msg">{{ data.mensaje }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="cancelar()">Cancelar</button>
      <button mat-flat-button [color]="data.color ?? 'warn'" (click)="confirmar()">
        {{ data.textoConfirmar }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2 { font-size: 18px; font-weight: 700; }
    .dialog-msg { font-size: 14px; color: #5b6b7d; line-height: 1.6; margin: 8px 0 0; }
    mat-dialog-actions { padding: 8px 0 0; gap: 8px; }
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
