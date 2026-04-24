import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule }              from '@angular/common';
import { forkJoin, Subscription }    from 'rxjs';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule }           from '@angular/material/button';
import { MatIconModule }             from '@angular/material/icon';
import { MatProgressSpinnerModule }  from '@angular/material/progress-spinner';
import { MatChipsModule }            from '@angular/material/chips';
import { MatTooltipModule }          from '@angular/material/tooltip';
import { MatDividerModule }          from '@angular/material/divider';

import { AsistenciaGeneralManualService } from '../../services/asistencia-general-manual.service';
import { AsistenciaEspacioItem }          from '../../models/asistencia-estudiante-dia.model';
import { FilaAsistenciaManual }           from '../../models/fila-asistencia-manual.model';
import { TipoAsistenciaManual }           from '../../models/tipo-asistencia-manual.model';

export interface DetalleDialogData {
  fila:              FilaAsistenciaManual;
  fecha:             string;
  fechaDisplay:      string;
  tipos:             TipoAsistenciaManual[];
  /** Etiqueta de texto para el chip de mañana cuando tipos[] está vacío (ej. desde Parte Diario). */
  mananaChipLabel?:  string | null;
  /** Etiqueta de texto para el chip de tarde cuando tipos[] está vacío (ej. desde Parte Diario). */
  tardeChipLabel?:   string | null;
  /** Etiqueta del chip de llegada mañana (LLT/LLTE/LLTC) cuando el estudiante tiene retiro.
   *  Usada como fallback en la rama retiro cuando tipoLlegadaManana no resuelve (tipos[]=[]).
   */
  mananaLlegadaChipLabel?: string | null;
}

@Component({
  selector: 'app-detalle-estudiante-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatChipsModule,
    MatTooltipModule, MatDividerModule,
  ],
  template: `
    <div class="det-wrap">

      <!-- Header -->
      <div class="det-header">
        <div class="det-header-info">
          <h2 class="det-nombre">{{ data.fila.estudiante.apellido }}, {{ data.fila.estudiante.nombre }}</h2>
          <p class="det-fecha">{{ data.fechaDisplay }}</p>
          <div class="det-chips-turno">
            <!-- ── MAÑANA ── -->
            <ng-container *ngIf="data.fila.retiroActivoManana; else sinRetiroManana">
              <ng-container *ngIf="tipoLlegadaManana as tll">
                <span class="turno-chip"><strong>{{ tll.codigo }}</strong>&nbsp;· {{ tll.descripcion }} (mañana)</span>
              </ng-container>
              <ng-container *ngIf="!tipoLlegadaManana && data.mananaLlegadaChipLabel">
                <span class="turno-chip">{{ data.mananaLlegadaChipLabel }}</span>
              </ng-container>
              <span class="turno-chip"><strong>{{ data.fila.retiroActivoManana!.tipoRetiro ?? 'Retiro' }}</strong>&nbsp;· Retiro {{ data.fila.retiroActivoManana!.horarioRetiro }}</span>
            </ng-container>
            <ng-template #sinRetiroManana>
              <ng-container *ngIf="tipoManana as t">
                <span class="turno-chip"><strong>{{ t.codigo }}</strong>&nbsp;· {{ t.descripcion }} (mañana)</span>
              </ng-container>
              <ng-container *ngIf="!tipoManana && data.mananaChipLabel">
                <span class="turno-chip">{{ data.mananaChipLabel }}</span>
              </ng-container>
              <ng-container *ngIf="!tipoManana && !data.mananaChipLabel">
                <span class="turno-chip turno-chip--sin">— Sin registro (mañana)</span>
              </ng-container>
            </ng-template>
            <!-- ── TARDE ── -->
            <ng-container *ngIf="data.fila.retiroActivoTarde; else sinRetiroTarde">
              <span class="turno-chip"><strong>{{ data.fila.retiroActivoTarde!.tipoRetiro ?? 'Retiro' }}</strong>&nbsp;· Retiro {{ data.fila.retiroActivoTarde!.horarioRetiro }} (tarde)</span>
            </ng-container>
            <ng-template #sinRetiroTarde>
              <ng-container *ngIf="tipoTarde as t">
                <span class="turno-chip"><strong>{{ t.codigo }}</strong>&nbsp;· {{ t.descripcion }} (tarde)</span>
              </ng-container>
              <ng-container *ngIf="!tipoTarde && data.tardeChipLabel">
                <span class="turno-chip">{{ data.tardeChipLabel }}</span>
              </ng-container>
              <ng-container *ngIf="!tipoTarde && !data.tardeChipLabel">
                <span class="turno-chip turno-chip--sin">— Sin registro (tarde)</span>
              </ng-container>
            </ng-template>
          </div>
        </div>
        <button mat-icon-button (click)="cerrar()" class="det-close-btn">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-divider></mat-divider>

      <!-- Loading -->
      <div *ngIf="cargando" class="det-loading">
        <mat-spinner diameter="36"></mat-spinner>
        <p>Cargando espacios...</p>
      </div>

      <!-- Empty state -->
      <div *ngIf="!cargando && items.length === 0" class="det-empty">
        <mat-icon>event_busy</mat-icon>
        <p>Este estudiante no tiene clases hoy.</p>
      </div>

      <!-- Tabla -->
      <div *ngIf="!cargando && items.length > 0" class="det-tabla-wrap">
        <table class="det-tabla">
          <thead>
            <tr>
              <th>Materia</th>
              <th>Horario</th>
              <th>Estado clase</th>
              <th>Asistencia</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of items"
                [class.fila-modificada]="item.presente !== item.presenteOriginal">
              <td class="col-materia">{{ item.nombreMateria }}</td>
              <td class="col-horario">
                <span>{{ item.horarioEntrada }} – {{ item.horarioSalida }}</span>
                <ng-container *ngIf="item.horarioEntradaOriginal">
                  <span class="horario-original-hint"
                        [matTooltip]="'Horario original: ' + item.horarioEntradaOriginal + ' – ' + item.horarioSalidaOriginal">
                    <mat-icon class="horario-swap-icon">swap_horiz</mat-icon>
                    <span class="horario-original-text">{{ item.horarioEntradaOriginal }} – {{ item.horarioSalidaOriginal }}</span>
                  </span>
                </ng-container>
              </td>
              <td class="col-estado">
                <span *ngIf="item.dictada === null"  class="chip-estado chip-sin">Sin reg.</span>
                <span *ngIf="item.dictada === false" class="chip-estado chip-nodictada">No dictada</span>
                <span *ngIf="item.dictada === true"  class="chip-estado chip-dictada">Dictada</span>
              </td>
              <td class="col-asist">
                <ng-container *ngIf="item.dictada === true && item.presente !== null; else sinRegistro">
                  <button class="chip-estado chip-asist"
                          [class.chip-presente]="item.presente === true"
                          [class.chip-ausente]="item.presente === false"
                          (click)="item.presente = !item.presente">
                    {{ item.presente ? 'Presente' : 'Ausente' }}
                  </button>
                  <span *ngIf="item.motivo === 'Retiro anticipado'" class="chip-retiro-motivo">Retiro</span>
                </ng-container>
                <ng-template #sinRegistro>
                  <span class="sin-reg">—</span>
                </ng-template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer: botón guardar y panel de confirmación al cerrar -->
      <ng-container *ngIf="!cargando && items.length > 0 && (hayModificaciones || confirmarCierre)">
        <mat-divider></mat-divider>

        <div *ngIf="hayModificaciones && !confirmarCierre" class="det-footer">
          <span class="det-footer-hint">
            <mat-icon class="hint-icon">edit_note</mat-icon>
            {{ cantModificaciones }} cambio(s) sin guardar
          </span>
          <button mat-flat-button color="primary" [disabled]="guardandoTodo" (click)="guardarCambios()">
            <mat-spinner *ngIf="guardandoTodo" diameter="16" class="btn-spinner"></mat-spinner>
            {{ guardandoTodo ? 'Guardando...' : 'Guardar cambios' }}
          </button>
        </div>

        <div *ngIf="confirmarCierre" class="det-confirm">
          <div class="det-confirm-msg">
            <mat-icon color="warn">warning_amber</mat-icon>
            <span>Hay {{ cantModificaciones }} cambio(s) sin guardar. ¿Qué querés hacer?</span>
          </div>
          <div class="det-confirm-actions">
            <button mat-stroked-button (click)="confirmarCierre = false">Volver</button>
            <button mat-stroked-button color="warn" (click)="dialogRef.close()">Descartar</button>
            <button mat-flat-button color="primary" [disabled]="guardandoTodo" (click)="guardarYCerrar()">
              <mat-spinner *ngIf="guardandoTodo" diameter="16" class="btn-spinner"></mat-spinner>
              {{ guardandoTodo ? 'Guardando...' : 'Guardar y cerrar' }}
            </button>
          </div>
        </div>
      </ng-container>

    </div>
  `,
  styles: [`
    .det-wrap {
      font-family: 'Open Sans', sans-serif;
      display: flex;
      flex-direction: column;
      min-height: 200px;
    }
    .det-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 20px 20px 16px;
      gap: 8px;
    }
    .det-header-info { flex: 1; min-width: 0; }
    .det-nombre {
      margin: 0 0 2px;
      font-size: 1.1rem;
      font-weight: 700;
      color: #1e293b;
    }
    .det-fecha {
      margin: 0 0 10px;
      font-size: 0.85rem;
      color: #64748b;
    }
    .det-chips-turno { display: flex; flex-wrap: wrap; gap: 6px; }
    .turno-chip {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 0.78rem;
      font-weight: 500;
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
    }
    .turno-chip--sin { background: #f1f5f9; color: #94a3b8; border: 1px solid #e2e8f0; }
    .det-close-btn { flex-shrink: 0; }

    .det-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
      gap: 12px;
      color: #64748b;
      font-size: 0.9rem;
    }
    .det-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
      gap: 8px;
      color: #94a3b8;
    }
    .det-empty mat-icon { font-size: 40px; height: 40px; width: 40px; }
    .det-empty p { margin: 0; font-size: 0.9rem; }

    .det-tabla-wrap { overflow-x: auto; padding: 16px 20px 20px; }
    .det-tabla {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    .det-tabla th {
      text-align: left;
      padding: 8px 12px;
      font-size: 0.78rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748b;
      border-bottom: 1px solid #e2e8f0;
    }
    .det-tabla td {
      padding: 10px 12px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }
    .det-tabla tr:last-child td { border-bottom: none; }
    .col-materia { font-weight: 500; color: #1e293b; min-width: 140px; }
    .col-horario { color: #475569; white-space: nowrap; min-width: 110px; vertical-align: middle; }
    .horario-original-hint {
      display: flex;
      align-items: center;
      gap: 2px;
      margin-top: 2px;
      cursor: default;
    }
    .horario-swap-icon { font-size: 13px; height: 13px; width: 13px; color: #d97706; flex-shrink: 0; }
    .horario-original-text { font-size: 0.72rem; color: #d97706; text-decoration: line-through; }
    .col-estado  { min-width: 100px; }
    .col-asist   { min-width: 130px; }

    .fila-modificada td { background: #fefce8; }

    .chip-estado {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 10px;
      font-size: 0.78rem;
      font-weight: 500;
    }
    .chip-dictada   { background: #dcfce7; color: #15803d; }
    .chip-nodictada { background: #fee2e2; color: #b91c1c; }
    .chip-sin       { background: #f1f5f9; color: #94a3b8; }

    .chip-asist  { border: none; font-family: inherit; font-size: 0.78rem; font-weight: 500; cursor: pointer; }
    .chip-presente { background: #dcfce7; color: #15803d; }
    .chip-ausente  { background: #fee2e2; color: #b91c1c; }
    .chip-asist:hover { filter: brightness(0.93); }
    .chip-retiro-motivo {
      display: inline-block; margin-left: 4px;
      background: #f5f3ff; color: #6d28d9;
      border: 1px solid #ddd6fe; border-radius: 8px;
      padding: 1px 7px; font-size: 0.7rem; font-weight: 600; vertical-align: middle;
    }
    .sin-reg { color: #94a3b8; }

    /* Footer: botón guardar */
    .det-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 20px;
      gap: 12px;
      flex-wrap: wrap;
    }
    .det-footer-hint {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #92400e;
      font-size: 0.85rem;
      font-weight: 500;
    }
    .hint-icon { font-size: 18px; height: 18px; width: 18px; color: #d97706; }

    /* Panel de confirmación al cerrar */
    .det-confirm {
      padding: 14px 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .det-confirm-msg {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.875rem;
      color: #1e293b;
    }
    .det-confirm-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      flex-wrap: wrap;
    }
    .btn-spinner { display: inline-block; margin-right: 6px; vertical-align: middle; }

    /* opt-* color classes */
    :host ::ng-deep .opt-p  { color: #15803d; font-weight: 700; }
    :host ::ng-deep .opt-a  { color: #b91c1c; font-weight: 700; }
    :host ::ng-deep .opt-llt,
    :host ::ng-deep .opt-llte,
    :host ::ng-deep .opt-lltc { color: #d97706; font-weight: 700; }
    :host ::ng-deep .opt-ra,
    :host ::ng-deep .opt-rae { color: #7c3aed; font-weight: 700; }
    :host ::ng-deep .opt-anc { color: #0369a1; font-weight: 700; }
  `],
})
export class DetalleEstudianteDialogComponent implements OnInit, OnDestroy {

  items:          AsistenciaEspacioItem[] = [];
  cargando      = true;
  confirmarCierre = false;
  guardandoTodo   = false;

  private backdropSub?: Subscription;

  get tipoManana(): TipoAsistenciaManual | null {
    const id = this.data.fila.tipoManianaId;
    return id ? (this.data.tipos.find(t => t.id === id) ?? null) : null;
  }

  get tipoTarde(): TipoAsistenciaManual | null {
    const id = this.data.fila.tipoTardeId;
    return id ? (this.data.tipos.find(t => t.id === id) ?? null) : null;
  }

  get tipoLlegadaManana(): TipoAsistenciaManual | null {
    const id = this.data.fila.tipoLlegadaManianaId;
    return id ? (this.data.tipos.find(t => t.id === id) ?? null) : null;
  }

  get hayModificaciones(): boolean {
    return this.items.some(i => i.presente !== i.presenteOriginal);
  }

  get cantModificaciones(): number {
    return this.items.filter(i => i.presente !== i.presenteOriginal).length;
  }

  constructor(
    public  dialogRef: MatDialogRef<DetalleEstudianteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DetalleDialogData,
    private service: AsistenciaGeneralManualService,
  ) {}

  ngOnInit(): void {
    this.service.getAsistenciaEspaciosDia(
      this.data.fila.estudiante.idEstudiante,
      this.data.fecha,
    ).subscribe({
      next: items => { this.items = items; this.cargando = false; },
      error: ()    => { this.cargando = false; },
    });

    this.backdropSub = this.dialogRef.backdropClick().subscribe(() => this.cerrar());
  }

  ngOnDestroy(): void {
    this.backdropSub?.unsubscribe();
  }

  cerrar(): void {
    if (this.hayModificaciones) {
      this.confirmarCierre = true;
    } else {
      this.dialogRef.close();
    }
  }

  guardarCambios(cerrarAlFinal = false): void {
    const modificados = this.items.filter(
      i => i.presente !== i.presenteOriginal && i.idClaseDictada !== null
    );
    if (!modificados.length) {
      if (cerrarAlFinal) this.dialogRef.close();
      return;
    }
    this.guardandoTodo = true;
    forkJoin(
      modificados.map(item =>
        this.service.actualizarAsistenciaEspacio({
          estudianteId:   this.data.fila.estudiante.idEstudiante,
          idClaseDictada: item.idClaseDictada!,
          presente:       item.presente!,
        })
      )
    ).subscribe({
      next: () => {
        modificados.forEach(i => { i.presenteOriginal = i.presente; });
        this.guardandoTodo   = false;
        this.confirmarCierre = false;
        if (cerrarAlFinal) this.dialogRef.close();
      },
      error: () => { this.guardandoTodo = false; },
    });
  }

  guardarYCerrar(): void {
    this.guardarCambios(true);
  }
}
