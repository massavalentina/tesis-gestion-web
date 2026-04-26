import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmacionManualesDialogData {
  modo: 'individual' | 'masivo';
  nombreEstudiante?: string;    // individual only — "Apellido, Nombre"
  nombresEstudiantes?: string[]; // masivo only
}

export type ConfirmacionManualesResult = 'recalcular' | 'priorizar' | null;

@Component({
  selector: 'app-confirmacion-manuales-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="dialog-wrap">
      <mat-icon class="dialog-warn-icon">warning_amber</mat-icon>
      <h2 mat-dialog-title class="dialog-title">Cambios manuales en EC</h2>

      <mat-dialog-content class="dialog-content">
        <ng-container *ngIf="data.modo === 'individual'">
          <p>
            <strong>{{ data.nombreEstudiante }}</strong> tiene modificaciones manuales
            en la asistencia por espacio curricular para este turno.
          </p>
          <p>¿Cómo desea proceder?</p>
        </ng-container>

        <ng-container *ngIf="data.modo === 'masivo'">
          <p>Los siguientes estudiantes tienen modificaciones manuales en la asistencia
          por espacio curricular para el turno modificado:</p>
          <ul class="nombres-list">
            <li *ngFor="let nombre of (data.nombresEstudiantes ?? [])">{{ nombre }}</li>
          </ul>
          <p>¿Cómo desea proceder con todos ellos?</p>
        </ng-container>
      </mat-dialog-content>

      <mat-dialog-actions class="dialog-actions">
        <button mat-flat-button color="primary" (click)="close('priorizar')">
          <mat-icon>lock</mat-icon>
          {{ data.modo === 'individual' ? 'Priorizar cambios manuales' : 'Priorizar todos' }}
        </button>
        <button mat-stroked-button (click)="close('recalcular')">
          <mat-icon>refresh</mat-icon>
          {{ data.modo === 'individual' ? 'Recalcular EC' : 'Recalcular todos' }}
        </button>
        <button *ngIf="data.modo === 'individual'" mat-button (click)="close(null)">
          Cancelar
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 24px 28px 16px;
      text-align: center;
      font-family: 'Open Sans', sans-serif;
    }
    .dialog-warn-icon {
      font-size: 48px;
      height: 48px;
      width: 48px;
      color: #f59e0b;
      margin-bottom: 8px;
    }
    .dialog-title {
      margin: 0 0 8px;
      font-size: 1.1rem;
      font-weight: 700;
      padding: 0;
    }
    .dialog-content {
      padding: 0 0 12px;
      font-size: 14px;
      color: #64748b;
      max-width: 360px;
    }
    .dialog-content p {
      margin: 0 0 8px;
    }
    .nombres-list {
      text-align: left;
      margin: 4px 0 8px;
      padding-left: 20px;
    }
    .nombres-list li {
      margin-bottom: 4px;
    }
    .dialog-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 0;
      min-height: unset;
      width: 100%;
    }
    .dialog-actions button {
      width: 100%;
      justify-content: center;
    }
  `],
})
export class ConfirmacionManualesDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmacionManualesDialogComponent, ConfirmacionManualesResult>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmacionManualesDialogData,
  ) {}

  close(result: ConfirmacionManualesResult): void {
    this.dialogRef.close(result);
  }
}
