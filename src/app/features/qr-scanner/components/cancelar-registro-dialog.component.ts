import { Component } from '@angular/core';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-cancelar-registro-dialog',
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
      <button mat-button (click)="cancelar()">Volver</button>
      <button mat-raised-button color="warn" (click)="confirmar()">
        Cancelar registro
      </button>
    </mat-dialog-actions>
  `
})
export class DialogoCancelarRegistroComponent {
  constructor(
    private referenciaDialogo: MatDialogRef<DialogoCancelarRegistroComponent>
  ) {}

  confirmar() {
    this.referenciaDialogo.close(true);
  }

  cancelar() {
    this.referenciaDialogo.close(false);
  }
}
