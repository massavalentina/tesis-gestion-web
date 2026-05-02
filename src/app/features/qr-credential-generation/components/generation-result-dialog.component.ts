import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
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
    <div class="dlg">
      <div class="icon" [class.warn]="data.color === 'warn'" [class.accent]="data.color === 'accent'">
        <mat-icon>{{ data.icono }}</mat-icon>
      </div>

      <div class="badge" [class.warn]="data.color === 'warn'" [class.accent]="data.color === 'accent'">
        {{ data.color === 'warn' ? 'Con incidencias' : 'Proceso finalizado' }}
      </div>

      <h2>{{ data.titulo }}</h2>
      <p class="message">{{ data.mensaje }}</p>

      <div class="summary">
        <div class="summary__item">
          <span>Generados</span>
          <strong>{{ data.generados }}</strong>
        </div>
        <div class="summary__item">
          <span>Desactivados</span>
          <strong>{{ data.desactivados }}</strong>
        </div>
        <div class="summary__item">
          <span>Omitidos</span>
          <strong>{{ data.omitidos }}</strong>
        </div>
        <div class="summary__item">
          <span>Errores</span>
          <strong>{{ data.errores }}</strong>
        </div>
      </div>

      <div class="actions">
        <button mat-raised-button class="btn-primary" (click)="cerrar()">
          Cerrar
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dlg {
      text-align: center;
      padding: 8px 4px 4px;
      max-width: 92vw;
      color: #0f2f4b;
    }

    .icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 68px;
      height: 68px;
      border-radius: 20px;
      background: #dff3e8;
      color: #1f6a5c;
      margin: 0 auto 12px;
      border: 1px solid #cae8d8;
    }

    .icon.warn {
      background: #f9e0dd;
      color: #b3261e;
      border-color: #efcbc7;
    }

    .icon.accent {
      background: #fff1d7;
      color: #9a6700;
      border-color: #f4dfb0;
    }

    .icon mat-icon {
      font-size: 34px;
      width: 34px;
      height: 34px;
    }

    .badge {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 6px 12px;
      border-radius: 999px;
      background: #f0f8f3;
      border: 1px solid #cae8d8;
      color: #1f6a5c;
      font-size: 12px;
      font-weight: 900;
      margin: 0 auto 12px;
      width: fit-content;
    }

    .badge.warn {
      background: #fff3f1;
      border-color: #efcbc7;
      color: #b0473f;
    }

    .badge.accent {
      background: #fff8e7;
      border-color: #f4dfb0;
      color: #9a6700;
    }

    h2 {
      margin: 0 0 8px;
      font-size: 24px;
      line-height: 1.15;
      font-weight: 900;
      letter-spacing: -0.4px;
    }

    .message {
      color: rgba(15, 47, 75, 0.74);
      margin: 0 0 14px;
      line-height: 1.45;
      font-size: 14px;
    }

    .summary {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 18px;
    }

    .summary__item {
      padding: 10px 12px;
      border-radius: 12px;
      border: 1px solid #dce8f3;
      background: #f8fbff;
      display: grid;
      gap: 2px;
      text-align: left;
    }

    .summary__item span {
      color: #63809c;
      font-size: 12px;
      font-weight: 800;
    }

    .summary__item strong {
      color: #22435f;
      font-size: 15px;
      font-weight: 900;
    }

    .actions {
      display: flex;
      justify-content: center;
    }

    .btn-primary {
      background-color: #86b8ea !important;
      color: #fff !important;
      border-radius: 12px !important;
      font-weight: 900 !important;
      padding: 10px 18px !important;
      box-shadow: 0 10px 22px rgba(134, 184, 234, 0.34) !important;
    }

    @media (max-width: 560px) {
      h2 {
        font-size: 20px;
      }

      .summary {
        grid-template-columns: 1fr;
      }
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
