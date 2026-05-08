import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface AdvertenciaRolData {
  esDocente: boolean;
  esPreceptor: boolean;
}

@Component({
  selector: 'app-advertencia-rol-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="dialog-container">
      <div class="dialog-icon">
        <mat-icon>warning_amber</mat-icon>
      </div>
      <h2 class="dialog-titulo">Atención</h2>
      <div class="dialog-body">
        <p *ngIf="data.esDocente" class="aviso">
          Este usuario tiene el rol <strong>Docente</strong>. Al desactivarlo, perderá el
          acceso a las clases y espacios curriculares que tiene a cargo.
        </p>
        <p *ngIf="data.esPreceptor" class="aviso">
          Este usuario tiene el rol <strong>Preceptor</strong>. Al desactivarlo, el o los
          cursos a su cargo quedarán sin preceptor asignado.
        </p>
      </div>
      <div class="dialog-actions">
        <button mat-stroked-button (click)="cancelar()">Cancelar</button>
        <button mat-flat-button class="btn-confirmar" (click)="confirmar()">
          Confirmar desactivación
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dialog-container {
      padding: 28px 24px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      min-width: 320px;
    }
    .dialog-icon mat-icon {
      font-size: 44px;
      width: 44px;
      height: 44px;
      color: #f59e0b;
    }
    .dialog-titulo {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 700;
      color: #0f2f4b;
      text-align: center;
    }
    .dialog-body { width: 100%; display: flex; flex-direction: column; gap: 8px; }
    .aviso {
      margin: 0;
      font-size: 0.9rem;
      color: #475569;
      text-align: center;
      line-height: 1.55;
    }
    .dialog-actions {
      display: flex;
      gap: 8px;
      margin-top: 8px;
      flex-wrap: wrap;
      justify-content: center;
    }
    .btn-confirmar { background: #dc2626; color: white; }
  `],
})
export class AdvertenciaRolDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<AdvertenciaRolDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AdvertenciaRolData,
  ) {}

  confirmar(): void { this.dialogRef.close(true); }
  cancelar(): void  { this.dialogRef.close(false); }
}
