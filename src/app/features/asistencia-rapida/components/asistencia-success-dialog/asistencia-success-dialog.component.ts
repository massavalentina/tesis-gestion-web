import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface AsistenciaSuccessDialogData {
  mensaje: string;
}

@Component({
  standalone: true,
  selector: 'app-asistencia-success-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <div style="text-align:center; padding: 10px 6px;">
      <h2 style="margin: 0 0 14px 0;">Operación realizada con éxito</h2>
      <div style="font-size: 13px; opacity:.85; margin-bottom: 16px;">
        {{ data.mensaje }}
      </div>

      <button mat-raised-button color="primary" (click)="cerrar()">OK</button>
    </div>
  `
})
export class AsistenciaSuccessDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<AsistenciaSuccessDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AsistenciaSuccessDialogData
  ) {}

  cerrar() { this.dialogRef.close(true); }
}
