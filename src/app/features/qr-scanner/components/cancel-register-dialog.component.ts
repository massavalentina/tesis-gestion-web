import { Component } from '@angular/core';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-cancel-register-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule
  ],
  template: `
    <h2 mat-dialog-title>Cancelar registro</h2>

    <mat-dialog-content>
      <p>
        Se perderán <strong>todas las asistencias escaneadas</strong>.
        <br />
        ¿Deseás continuar?
      </p>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Volver</button>
      <button mat-raised-button color="warn" (click)="confirm()">
        Cancelar registro
      </button>
    </mat-dialog-actions>
  `
})
export class CancelRegisterDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<CancelRegisterDialogComponent>
  ) {}

  confirm() {
    this.dialogRef.close(true);
  }

  cancel() {
    this.dialogRef.close(false);
  }
}
