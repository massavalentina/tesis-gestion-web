import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface DatosResultadoGeneracionQr {
  titulo: string;
  mensaje: string;
  generados: number;
  desactivados: number;
  omitidos: number;
  errores: number;
  icono: string;
  color: 'primary' | 'accent' | 'warn';
}

@Component({
  selector: 'app-generation-result-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="result-shell">
      <div class="icon" [class.warn]="data.color === 'warn'" [class.accent]="data.color === 'accent'">
        <mat-icon>{{ data.icono }}</mat-icon>
      </div>

      <h2>{{ data.titulo }}</h2>
      <p class="message">{{ data.mensaje }}</p>

      <div class="totals">
        <span>Generados: {{ data.generados }}</span>
        <span>Desactivados: {{ data.desactivados }}</span>
        <span>Omitidos: {{ data.omitidos }}</span>
        <span>Errores: {{ data.errores }}</span>
      </div>

      <button mat-raised-button [color]="data.color" (click)="cerrar()">
        Aceptar
      </button>
    </div>
  `,
  styles: [`
    .result-shell {
      text-align: center;
      padding: 24px;
      max-width: 360px;
    }

    .icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: #dcefe9;
      color: #1f6a5c;
      margin-bottom: 12px;
    }

    .icon.warn {
      background: #f9d7d4;
      color: #b3261e;
    }

    .icon.accent {
      background: #f2e4c2;
      color: #9a6700;
    }

    .icon mat-icon {
      font-size: 34px;
      width: 34px;
      height: 34px;
    }

    .message {
      color: #48625d;
      margin-bottom: 20px;
    }

    .totals {
      display: grid;
      gap: 8px;
      margin-bottom: 20px;
      color: #2a433f;
      font-weight: 500;
    }
  `]
})
export class DialogoResultadoGeneracionQrComponent {
  constructor(
    private dialogRef: MatDialogRef<DialogoResultadoGeneracionQrComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DatosResultadoGeneracionQr
  ) {}

  cerrar(): void {
    this.dialogRef.close();
  }
}
