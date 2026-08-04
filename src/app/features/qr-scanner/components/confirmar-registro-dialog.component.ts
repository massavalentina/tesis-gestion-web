import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface DetalleRegistroConfirmacion {
  alumno: string;
  codigo: string;
}

export interface DatosConfirmarRegistro {
  turno: string;
  detalleHora: string;
  cantidadEscaneados: number;
  detalle: DetalleRegistroConfirmacion[];
}

@Component({
  selector: 'app-confirmar-registro-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="dialog-head">
      <div class="dialog-icon-shell">
        <mat-icon>fact_check</mat-icon>
      </div>
      <h2 mat-dialog-title class="title">Registrar asistencias</h2>
    </div>

    <mat-dialog-content>
      <div class="summary-card">
        <p class="intro">
          Se registrarán {{ data.cantidadEscaneados }} asistencia(s) en este lote.
        </p>

        <div class="turno-hora">
          <p>Turno de sesión: <strong>{{ data.turno }}</strong></p>
          <p>Hora de registro: <strong>{{ data.detalleHora }}</strong></p>
        </div>
      </div>

      <details class="detalle-box" *ngIf="data.detalle.length > 0">
        <summary>
          <span>Ver detalle</span>
          <span class="caret">▾</span>
        </summary>

        <div class="detalle-tabla">
          <div class="fila encabezado">
            <span>Alumno</span>
            <span>Asistencia</span>
          </div>
          <div class="fila" *ngFor="let item of data.detalle">
            <span class="alumno">{{ item.alumno }}</span>
            <span class="code-pill" [class]="chipClass(item.codigo)">{{ item.codigo }}</span>
          </div>
        </div>
      </details>
    </mat-dialog-content>

    <mat-dialog-actions align="center" class="acciones">
      <button mat-stroked-button class="btn btn--ghost" (click)="cancelar()">Cancelar</button>
      <button mat-raised-button class="btn btn--primary" (click)="confirmar()">Confirmar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-head {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
    }

    .dialog-icon-shell {
      width: 58px;
      height: 58px;
      border-radius: 18px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: #eaf3fb;
      border: 1px solid #d7e6f4;
      color: #3c78b4;
    }

    .dialog-icon-shell mat-icon {
      width: 30px;
      height: 30px;
      font-size: 30px;
    }

    .title {
      margin: 0;
      color: #0f172a;
      font-size: 1.04rem;
      font-weight: 700;
      text-align: center;
    }

    .summary-card {
      border: 1px solid #d7e6f4;
      border-radius: 14px;
      background: #f8fbff;
      padding: 12px 14px;
    }

    .intro {
      margin: 0;
      color: #334155;
      font-size: 0.84rem;
      line-height: 1.45;
    }

    .turno-hora {
      margin: 10px 0 0;
      color: #334155;
      font-size: 0.8rem;
      line-height: 1.4;
    }

    .turno-hora p {
      margin: 0;
    }

    .turno-hora p + p {
      margin-top: 4px;
    }

    .detalle-box {
      margin-top: 12px;
      border-radius: 14px;
      border: 1px solid #d7e6f4;
      background: #ffffff;
      padding: 10px 12px;
    }

    .detalle-box summary {
      cursor: pointer;
      color: #1f2937;
      font-size: 0.8rem;
      font-weight: 600;
      user-select: none;
      list-style: none;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .detalle-box .caret {
      display: inline-flex;
      transition: transform 120ms ease;
      color: #475569;
    }

    .detalle-box[open] .caret {
      transform: rotate(180deg);
    }

    .detalle-box summary::-webkit-details-marker {
      display: none;
    }

    .detalle-tabla {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .fila {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
      gap: 8px;
      padding: 6px 0;
      border-bottom: 1px solid #e8eef5;
    }

    .fila:last-child {
      border-bottom: none;
    }

    .fila.encabezado {
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-weight: 700;
      color: #64748b;
    }

    .alumno {
      font-size: 0.82rem;
      color: #0f172a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .code-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 34px;
      padding: 1px 8px;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 700;
      border: 1px solid transparent;
    }

    .chip-p { background: rgba(21, 128, 61, .12); color: #15803d; border-color: #bbf7d0; }
    .chip-a { background: rgba(185, 28, 28, .12); color: #b91c1c; border-color: #fecaca; }
    .chip-anc { background: rgba(2, 132, 199, .12); color: #0369a1; border-color: #bae6fd; }
    .chip-llt, .chip-llte, .chip-lltc { background: rgba(194, 65, 12, .12); color: #c2410c; border-color: #fed7aa; }

    .acciones {
      justify-content: center;
      gap: 10px;
      padding-top: 12px;
    }

    .btn {
      min-width: 122px;
      border-radius: 10px;
      font-weight: 600;
    }

    .btn--ghost {
      border-color: #bfd4e7 !important;
      color: #3c78b4 !important;
    }

    .btn--primary {
      background: #3c78b4 !important;
      color: #fff !important;
    }
  `]
})
export class DialogoConfirmarRegistroComponent {
  constructor(
    private readonly referenciaDialogo: MatDialogRef<DialogoConfirmarRegistroComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DatosConfirmarRegistro
  ) {}

  chipClass(codigo: string): string {
    return `chip-${(codigo ?? '').toLowerCase()}`;
  }

  confirmar(): void {
    this.referenciaDialogo.close(true);
  }

  cancelar(): void {
    this.referenciaDialogo.close(false);
  }
}
