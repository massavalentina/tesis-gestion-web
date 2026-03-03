import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface DatosConfirmarAsistencia {
  nombre: string;
  apellido: string;
  curso: string;
  turno: string;
  tipoAsistencia: string;
}

@Component({
  selector: 'app-confirmar-asistencia-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule
  ],
  template: `
    <h2 mat-dialog-title>Confirmar asistencia</h2>

    <mat-dialog-content>
      <p><strong>Alumno:</strong> {{ data.apellido }}, {{ data.nombre }}</p>
      <p><strong>Curso:</strong> {{ data.curso }}</p>
      <p><strong>Turno:</strong> {{ data.turno }}</p>
      <p><strong>Asistencia:</strong> {{ data.tipoAsistencia }}</p>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancelar()">Cancelar</button>
      <button mat-raised-button color="primary" (click)="confirmar()">
        Confirmar
      </button>
    </mat-dialog-actions>
  `
})
export class DialogoConfirmarAsistenciaComponent {
  constructor(
    private referenciaDialogo: MatDialogRef<DialogoConfirmarAsistenciaComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DatosConfirmarAsistencia
  ) {}

  confirmar() {
    this.referenciaDialogo.close(true);
  }

  cancelar() {
    this.referenciaDialogo.close(false);
  }
}
