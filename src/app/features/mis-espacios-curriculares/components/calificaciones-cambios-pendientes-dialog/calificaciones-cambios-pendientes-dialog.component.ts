import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export type CalificacionesCambiosPendientesDialogResult = 'guardar' | 'descartar' | 'cancelar';

export interface CalificacionesCambiosPendientesDialogData {
  titulo: string;
  mensaje: string;
  textoDescartar: string;
  permitirGuardar: boolean;
}

@Component({
  selector: 'app-calificaciones-cambios-pendientes-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="dialog-wrap">
      <mat-icon class="dialog-icon">warning_amber</mat-icon>
      <h2 mat-dialog-title class="dialog-title">{{ data.titulo }}</h2>
      <mat-dialog-content class="dialog-content">
        <p>{{ data.mensaje }}</p>
      </mat-dialog-content>
      <mat-dialog-actions class="dialog-actions">
        <button mat-button type="button" (click)="cerrar('cancelar')">
          Seguir editando
        </button>
        <button mat-stroked-button color="warn" type="button" (click)="cerrar('descartar')">
          {{ data.textoDescartar }}
        </button>
        <button
          *ngIf="data.permitirGuardar"
          mat-flat-button
          color="primary"
          type="button"
          (click)="cerrar('guardar')">
          Guardar y continuar
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 320px;
      max-width: 460px;
      padding: 24px 28px 18px;
      text-align: center;
    }

    .dialog-icon {
      width: 48px;
      height: 48px;
      font-size: 48px;
      color: #f59e0b;
      margin-bottom: 8px;
    }

    .dialog-title {
      margin: 0 0 8px;
      padding: 0;
      font-size: 1.1rem;
      font-weight: 700;
    }

    .dialog-content {
      padding: 0 0 12px;
      color: #64748b;
      font-size: 14px;
      line-height: 1.55;
    }

    .dialog-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      padding: 0;
    }

    .dialog-actions button {
      width: 100%;
      justify-content: center;
    }
  `],
})
export class CalificacionesCambiosPendientesDialogComponent {
  constructor(
    private readonly dialogRef: MatDialogRef<CalificacionesCambiosPendientesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: CalificacionesCambiosPendientesDialogData,
  ) {}

  cerrar(result: CalificacionesCambiosPendientesDialogResult): void {
    this.dialogRef.close(result);
  }
}
