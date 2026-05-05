import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface DetalleRegistroConfirmacion {
  alumno: string;
  codigo: string;
}

export interface DatosConfirmarRegistro {
  turno: string;
  cantidadEscaneados: number;
  detalle: DetalleRegistroConfirmacion[];
}

@Component({
  selector: 'app-confirmar-registro-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title class="title">Registrar asistencias</h2>

    <mat-dialog-content>
      <p class="intro">
        Se cargarán {{ data.cantidadEscaneados }} registro(s) de asistencia.
      </p>

      <details class="detalle-box" *ngIf="data.detalle.length > 0">
        <summary>
          <span>Ver detalle</span>
          <span class="caret">▾</span>
        </summary>

        <div class="detalle-turno">
          Turno de sesión: <strong>{{ data.turno }}</strong>
        </div>

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
    .title {
      margin-bottom: 4px;
      color: #0f172a;
      font-size: 1.12rem;
      font-weight: 800;
    }

    .intro {
      margin: 4px 0 0;
      color: #556172;
      font-size: 0.82rem;
    }

    .detalle-box {
      margin-top: 10px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      padding: 8px 10px;
    }

    .detalle-box summary {
      cursor: pointer;
      color: #1f2937;
      font-size: 0.8rem;
      font-weight: 700;
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

    .detalle-turno {
      margin: 8px 0;
      font-size: 0.8rem;
      color: #334155;
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
      padding: 3px 0;
      border-bottom: 1px solid #e2e8f0;
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
      padding-top: 8px;
    }

    .btn {
      min-width: 122px;
      border-radius: 999px;
      font-weight: 700;
    }

    .btn--ghost {
      border-color: #94a3b8 !important;
      color: #334155 !important;
    }

    .btn--primary {
      background: linear-gradient(180deg, #3f88c5 0%, #2f6ea3 100%) !important;
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
