import { Component } from '@angular/core';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-descarte-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="dialog-wrap">
      <mat-icon class="dialog-warn-icon">warning_amber</mat-icon>
      <h2 mat-dialog-title class="dialog-title">Cambios sin guardar</h2>
      <mat-dialog-content class="dialog-content">
        <p>Tenés cambios sin guardar. ¿Qué querés hacer?</p>
      </mat-dialog-content>
      <mat-dialog-actions class="dialog-actions">
        <button mat-flat-button color="primary" (click)="dialogRef.close('guardar')">
          <mat-icon>save</mat-icon> Guardar y continuar
        </button>
        <button mat-stroked-button color="warn" (click)="dialogRef.close('descartar')">
          <mat-icon>delete_outline</mat-icon> Descartar cambios
        </button>
        <button mat-button (click)="dialogRef.close(null)">
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
export class DescarteDialogComponent {
  constructor(public dialogRef: MatDialogRef<DescarteDialogComponent>) {}
}
