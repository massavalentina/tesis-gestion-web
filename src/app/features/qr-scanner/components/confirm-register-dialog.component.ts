import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface ConfirmRegisterData {
  course: string;
  turno: string;
  attendanceType: string;
  scannedCount: number;
  totalStudents: number;
}

@Component({
  selector: 'app-confirm-register-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Confirmar carga</h2>

    <mat-dialog-content>
      <p><strong>Curso:</strong> {{ data.course }}</p>
      <p><strong>Turno:</strong> {{ data.turno }}</p>
      <p><strong>Asistencia:</strong> {{ data.attendanceType }}</p>

      <hr />

      <p>
        Se cargarán <strong>{{ data.scannedCount }}</strong> asistencias
        de <strong>{{ data.totalStudents }}</strong> alumnos del curso.
      </p>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancelar</button>
      <button mat-raised-button color="primary" (click)="confirm()">
        Confirmar
      </button>
    </mat-dialog-actions>
  `
})
export class ConfirmRegisterDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<ConfirmRegisterDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmRegisterData
  ) {}

  confirm() {
    this.dialogRef.close(true);
  }

  cancel() {
    this.dialogRef.close(false);
  }
}

