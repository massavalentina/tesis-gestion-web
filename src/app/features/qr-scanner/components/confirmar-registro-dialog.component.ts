import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface DatosConfirmarRegistro {
  curso: string;
  turno: string;
  tipoAsistencia: string;
  cantidadEscaneados: number;
  totalAlumnos: number;
}

@Component({
  selector: 'app-confirmar-registro-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Confirmar carga</h2>

    <mat-dialog-content>
      <p><strong>Curso:</strong> {{ data.curso }}</p>
      <p><strong>Turno:</strong> {{ data.turno }}</p>
      <p><strong>Asistencia:</strong> {{ data.tipoAsistencia }}</p>

      <hr />

      <p>
        Se cargarán <strong>{{ data.cantidadEscaneados }}</strong> asistencias
        de <strong>{{ data.totalAlumnos }}</strong> alumnos del curso.
      </p>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancelar()">Cancelar</button>
      <button mat-raised-button color="primary" (click)="confirmar()">
        Confirmar
      </button>
    </mat-dialog-actions>
  `
})
export class DialogoConfirmarRegistroComponent {
  constructor(
    private referenciaDialogo: MatDialogRef<DialogoConfirmarRegistroComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DatosConfirmarRegistro
  ) {}

  confirmar() {
    this.referenciaDialogo.close(true);
  }

  cancelar() {
    this.referenciaDialogo.close(false);
  }
}
