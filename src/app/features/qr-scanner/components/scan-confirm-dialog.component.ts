import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface ScanConfirmData {
  name: string;
  lastName: string;
  course: string;
  turno: string;
  attendanceType: string;
}

@Component({
  selector: 'app-scan-confirm-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule
  ],
  template: `
    <h2 mat-dialog-title>Confirmar asistencia</h2>

    <mat-dialog-content>
      <p><strong>Alumno:</strong> {{ data.lastName }}, {{ data.name }}</p>
      <p><strong>Curso:</strong> {{ data.course }}</p>
      <p><strong>Turno:</strong> {{ data.turno }}</p>
      <p><strong>Asistencia:</strong> {{ data.attendanceType }}</p>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancelar</button>
      <button mat-raised-button color="primary" (click)="confirm()">
        Confirmar
      </button>
    </mat-dialog-actions>
  `
})
export class ScanConfirmDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<ScanConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ScanConfirmData
  ) {}

  confirm() {
    this.dialogRef.close(true);
  }

  cancel() {
    this.dialogRef.close(false);
  }
}
