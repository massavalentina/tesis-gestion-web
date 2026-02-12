import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface AsistenciaConfirmDialogData {
  titulo: string;
  alumno: string;
  curso: string;
  fecha: string; // yyyy-MM-dd
  hora: string;  // HH:mm:ss
  tipoTexto: string; // "LLTE - Llegada Tarde Extendida"
}

@Component({
  standalone: true,
  selector: 'app-asistencia-confirm-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <div style="text-align:center; padding: 6px 4px;">
      <h2 style="margin: 4px 0 12px 0;">{{ data.titulo }}</h2>

      <div style="font-weight: 700; margin-bottom: 6px;">
        {{ data.alumno }}
      </div>

      <div style="opacity: .75; margin-bottom: 10px;">
        Curso: {{ data.curso }}
      </div>

      <div style="margin: 8px 0; font-size: 13px;">
        <div><strong>Tipo:</strong> {{ data.tipoTexto }}</div>
        <div><strong>Fecha/Hora:</strong> {{ data.fecha }} {{ data.hora }}</div>
      </div>

      <div style="display:flex; justify-content:center; gap:12px; margin-top:16px;">
        <button mat-raised-button color="warn" (click)="cancelar()">Cancelar</button>
        <button mat-raised-button color="primary" (click)="confirmar()">Confirmar</button>
      </div>
    </div>
  `
})
export class AsistenciaConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<AsistenciaConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AsistenciaConfirmDialogData
  ) {}

  cancelar() { this.dialogRef.close(false); }
  confirmar() { this.dialogRef.close(true); }
}
