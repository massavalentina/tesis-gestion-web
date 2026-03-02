import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface DatosConfirmacionGeneracionQr {
  curso: string;
  alcance: string;
  totalAlumnosActivos: number;
  totalQrActivos: number;
  totalPendientesGenerar: number;
}

@Component({
  selector: 'app-confirm-generation-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Confirmar generación</h2>

    <mat-dialog-content>
      <p><strong>Curso:</strong> {{ data.curso }}</p>
      <p><strong>Alcance:</strong> {{ data.alcance }}</p>

      <hr />

      <p><strong>Alumnos activos:</strong> {{ data.totalAlumnosActivos }}</p>
      <p><strong>QR activos:</strong> {{ data.totalQrActivos }}</p>
      <p><strong>Pendientes:</strong> {{ data.totalPendientesGenerar }}</p>

      <p class="note">
        Se iniciará un job de generación de credenciales para el curso seleccionado.
      </p>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancelar()">Cancelar</button>
      <button mat-raised-button color="primary" (click)="confirmar()">Iniciar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .note {
      margin-top: 18px;
      color: #48625d;
    }
  `]
})
export class DialogoConfirmacionGeneracionQrComponent {
  constructor(
    private dialogRef: MatDialogRef<DialogoConfirmacionGeneracionQrComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DatosConfirmacionGeneracionQr
  ) {}

  confirmar(): void {
    this.dialogRef.close(true);
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
