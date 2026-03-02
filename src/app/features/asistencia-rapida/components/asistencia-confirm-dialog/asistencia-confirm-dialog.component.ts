import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface AsistenciaConfirmDialogData {
  titulo: string;
  alumno: string;
  curso: string;
  fecha: string; // yyyy-MM-dd
  hora: string;  // HH:mm:ss
  tipoTexto: string;
}

@Component({
  standalone: true,
  selector: 'app-asistencia-confirm-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="dlg">

      <div class="dlg__head">
        <div class="dlg__icon">
          <mat-icon>event</mat-icon>
        </div>

        <div class="dlg__titles">
          <div class="dlg__badge">Confirmación</div>
          <h2>{{ data.titulo }}</h2>
          <div class="dlg__sub">
            Verificá los datos antes de continuar
          </div>
        </div>
      </div>

      <div class="dlg__body">

        <div class="dlg__panel">
          <div class="row">
            <span class="label">Alumno</span>
            <span class="value strong">{{ data.alumno }}</span>
          </div>

          <div class="row">
            <span class="label">Curso</span>
            <span class="value">{{ data.curso }}</span>
          </div>

          <div class="row">
            <span class="label">Tipo</span>
            <span class="value">{{ data.tipoTexto }}</span>
          </div>

          <div class="row">
            <span class="label">Fecha / Hora</span>
            <span class="value mono">{{ data.fecha }} {{ data.hora }}</span>
          </div>
        </div>

      </div>

      <div class="dlg__actions">
        <button mat-stroked-button class="btn-ghost" (click)="cancelar()">
          Cancelar
        </button>

        <button mat-raised-button class="btn-primary" (click)="confirmar()">
          Confirmar
        </button>
      </div>

    </div>
  `,
  styles: [`
    /* Paleta:
       #3c78b4 primary
       #f0f5fa bg
       #c7d9eb border
    */

    .dlg{
      padding: 4px 4px;
      color: #0f2f4b;
      max-width: 92vw;
      overflow-x: hidden;
    }

    .dlg__head{
      display:flex;
      gap:14px;
      align-items:flex-start;
      margin-bottom: 14px;
    }

    .dlg__icon{
      width: 44px;
      height: 44px;
      border-radius: 14px;
      display:grid;
      place-items:center;
      background:#f0f5fa;
      border:1px solid #c7d9eb;
      color:#3c78b4;
      flex: 0 0 auto;
    }

    .dlg__icon mat-icon{
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    .dlg__titles{
      flex:1;
      min-width:0;
    }

    .dlg__badge{
      display:inline-flex;
      align-items:center;
      padding:4px 10px;
      border-radius:999px;
      background:#f0f5fa;
      border:1px solid #c7d9eb;
      font-size:12px;
      font-weight: 900;
      color:#3c78b4;
      margin-bottom: 8px;
    }

    h2{
      margin:0;
      font-weight: 1000;
      font-size: 18px;
      letter-spacing:-0.3px;
      color:#0f2f4b;
    }

    .dlg__sub{
      margin-top:6px;
      font-size:13px;
      color:rgba(15,47,75,.75);
      font-weight:600;
    }

    .dlg__panel{
      margin-top: 10px;
      padding: 14px;
      border-radius: 16px;
      background:#ffffff;
      border:1px solid rgba(199,217,235,.95);
      box-shadow: 0 8px 18px rgba(0,0,0,0.05);
    }

    .row{
      display:flex;
      justify-content:space-between;
      gap:10px;
      margin-bottom: 8px;
      font-size:13px;
    }

    .row:last-child{
      margin-bottom:0;
    }

    .label{
      font-weight: 900;
      color:#3c78b4;
    }

    .value{
      text-align:right;
      font-weight: 700;
      color:#0f2f4b;
      overflow-wrap:anywhere;
    }

    .strong{
      font-weight: 1000;
    }

    .mono{
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-weight: 900;
    }

    .dlg__actions{
      display:flex;
      justify-content:flex-end;
      gap:10px;
      margin-top: 16px;
    }

    .btn-primary{
      background-color: #3c78b4 !important;
      color: #fff !important;
      border-radius: 12px !important;
      font-weight: 900 !important;
      padding: 10px 16px !important;
      box-shadow: 0 10px 22px rgba(60,120,180,.22) !important;
    }

    .btn-ghost{
      border-color: #c7d9eb !important;
      color: #3c78b4 !important;
      border-radius: 12px !important;
      font-weight: 900 !important;
      padding: 10px 16px !important;
      background:#ffffff !important;
    }

    .btn-ghost:hover{
      background:#f0f5fa !important;
    }

    /* Mobile */
    @media (max-width: 520px){
      .row{
        flex-direction:column;
        align-items:flex-start;
      }

      .value{
        text-align:left;
      }

      .dlg__actions{
        flex-direction:column;
      }

      .dlg__actions button{
        width:100%;
      }
    }
  `]
})
export class AsistenciaConfirmDialogComponent {

  constructor(
    public dialogRef: MatDialogRef<AsistenciaConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AsistenciaConfirmDialogData
  ) {}

  cancelar() { this.dialogRef.close(false); }
  confirmar() { this.dialogRef.close(true); }
}