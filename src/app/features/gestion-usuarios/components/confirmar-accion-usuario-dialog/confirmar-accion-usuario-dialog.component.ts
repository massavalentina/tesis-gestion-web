import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmarAccionUsuarioData {
  nombre: string;
  apellido: string;
  accion: 'activar' | 'desactivar';
}

@Component({
  selector: 'app-confirmar-accion-usuario-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, CommonModule],
  template: `
    <div class="dialog-container">
      <div class="dialog-icon" [class.icono-activar]="data.accion === 'activar'"
                               [class.icono-desactivar]="data.accion === 'desactivar'">
        <mat-icon>{{ data.accion === 'activar' ? 'person' : 'person_off' }}</mat-icon>
      </div>

      <h2 class="dialog-titulo">
        {{ data.accion === 'activar' ? 'Activar usuario' : 'Desactivar usuario' }}
      </h2>

      <p class="dialog-texto" *ngIf="data.accion === 'desactivar'">
        Si desactivás a <strong>{{ data.apellido }}, {{ data.nombre }}</strong>, no podrá
        acceder al sistema hasta que se reactive su cuenta.
      </p>
      <p class="dialog-texto" *ngIf="data.accion === 'activar'">
        ¿Querés activar la cuenta de <strong>{{ data.apellido }}, {{ data.nombre }}</strong>?
        Podrá volver a acceder al sistema.
      </p>

      <div class="dialog-actions">
        <button mat-stroked-button (click)="cancelar()">Cancelar</button>
        <button mat-flat-button
                [class.btn-activar]="data.accion === 'activar'"
                [class.btn-desactivar]="data.accion === 'desactivar'"
                (click)="confirmar()">
          {{ data.accion === 'activar' ? 'Activar' : 'Continuar' }}
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
    .dialog-icon mat-icon { font-size: 44px; width: 44px; height: 44px; }
    .icono-desactivar mat-icon { color: #64748b; }
    .icono-activar mat-icon    { color: #16a34a; }

    .dialog-titulo {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 700;
      color: #0f2f4b;
      text-align: center;
    }
    .dialog-texto {
      margin: 0;
      font-size: 0.9rem;
      color: #475569;
      text-align: center;
      line-height: 1.55;
    }
    .dialog-actions { display: flex; gap: 8px; margin-top: 8px; }
    .btn-desactivar { background: #0284c7; color: white; }
    .btn-activar    { background: #16a34a; color: white; }
  `],
})
export class ConfirmarAccionUsuarioDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<ConfirmarAccionUsuarioDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmarAccionUsuarioData,
  ) {}

  confirmar(): void { this.dialogRef.close(true); }
  cancelar(): void  { this.dialogRef.close(false); }
}
