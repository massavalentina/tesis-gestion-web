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
import { MatTabsModule }             from '@angular/material/tabs';

import { AsistenciaGeneralManualService } from '../../services/asistencia-general-manual.service';
import { AsistenciaEspacioItem }          from '../../models/asistencia-estudiante-dia.model';
import { FilaAsistenciaManual }           from '../../models/fila-asistencia-manual.model';
import { TipoAsistenciaManual }           from '../../models/tipo-asistencia-manual.model';
import { AuditoriaAsistenciaEC }          from '../../models/auditoria-asistencia-ec.model';

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
  /** Si true, el diálogo muestra la info en modo solo lectura (sin edición de asistencia). */
  soloLectura?: boolean;
}

@Component({
  selector: 'app-detalle-estudiante-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatChipsModule,
    MatTooltipModule, MatDividerModule,
    MatTabsModule,
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

      <!-- Loading inicial -->
      <div *ngIf="cargando" class="det-loading">
        <mat-spinner diameter="36"></mat-spinner>
        <p>Cargando...</p>
      </div>

      <!-- Tab group -->
      <mat-tab-group *ngIf="!cargando"
                     [(selectedIndex)]="tabActivo"
                     animationDuration="200ms"
                     class="det-tabs">

        <!-- ── Tab 0: Asistencia por EC ── -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="tab-icon">fact_check</mat-icon>
            Asistencia
            <span *ngIf="hayModificaciones" class="tab-dot"></span>
          </ng-template>

          <!-- Empty state -->
          <div *ngIf="items.length === 0" class="det-empty">
            <mat-icon>event_busy</mat-icon>
            <p>Este estudiante no tiene clases hoy.</p>
          </div>

          <!-- Tabla -->
          <div *ngIf="items.length > 0" class="det-tabla-wrap">
            <table class="det-tabla">
              <thead>
                <tr>
                  <th>Materia</th>
                  <th>Horario</th>
                  <th>Estado clase</th>
                  <th class="th-asist">Asistencia <mat-icon class="th-edit-icon" *ngIf="!data.soloLectura">edit</mat-icon></th>
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
                      <div class="asist-cell">
                        <span *ngIf="data.soloLectura"
                              class="chip-estado chip-asist"
                              [class.chip-presente]="item.presente === true"
                              [class.chip-ausente]="item.presente === false">
                          {{ item.presente ? 'Presente' : 'Ausente' }}
                        </span>
                        <button *ngIf="!data.soloLectura"
                                class="chip-estado chip-asist"
                                [class.chip-presente]="item.presente === true"
                                [class.chip-ausente]="item.presente === false"
                                (click)="item.presente = !item.presente">
                          {{ item.presente ? 'Presente' : 'Ausente' }}
                        </button>
                        <span *ngIf="item.presente === false && item.motivo === 'Retiro anticipado'" class="chip-motivo chip-motivo--retiro">Retiro</span>
                        <span *ngIf="item.presente === false && item.motivo === 'Llegada tarde'"    class="chip-motivo chip-motivo--tarde">Tarde</span>
                      </div>
                    </ng-container>
                    <ng-template #sinRegistro>
                      <span class="sin-reg">—</span>
                    </ng-template>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </mat-tab>

        <!-- ── Tab 1: Historial ── -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="tab-icon">history</mat-icon>
            Historial
          </ng-template>

          <div class="audit-wrap">
            <div *ngIf="cargandoAuditoria" class="audit-loading">
              <mat-spinner diameter="24"></mat-spinner>
            </div>

            <p *ngIf="!cargandoAuditoria && auditoria.length === 0" class="audit-empty-msg">
              Sin historial de cambios para esta fecha.
            </p>

            <div *ngIf="!cargandoAuditoria && auditoria.length > 0" class="audit-list">
              <div *ngFor="let ev of auditoria" class="audit-item">
                <span class="audit-tipo"
                      [class.audit-tipo--general]="ev.tipoEvento === 1"
                      [class.audit-tipo--retiro]="ev.tipoEvento === 2"
                      [class.audit-tipo--manual]="ev.tipoEvento === 3">
                  {{ ev.tipoEventoLabel }}
                </span>
                <div class="audit-body">
                  <span class="audit-materia">{{ ev.nombreMateria }}</span>
                  <div class="audit-cambio">
                    <span class="chip-min"
                          [class.chip-presente]="ev.estadoAnterior === true"
                          [class.chip-ausente]="ev.estadoAnterior === false"
                          [class.chip-sin]="ev.estadoAnterior === null">
                      {{ ev.estadoAnterior === null ? '—' : (ev.estadoAnterior ? 'Presente' : 'Ausente') }}
                    </span>
                    <mat-icon class="audit-arrow">east</mat-icon>
                    <span class="chip-min"
                          [class.chip-presente]="ev.estadoNuevo === true"
                          [class.chip-ausente]="ev.estadoNuevo === false">
                      {{ ev.estadoNuevo ? 'Presente' : 'Ausente' }}
                    </span>
                  </div>
                </div>
                <div class="audit-meta">
                  <span class="audit-hora">{{ ev.horarioEvento }}</span>
                  <span class="audit-user">{{ ev.apellidoUsuario }}, {{ ev.nombreUsuario }}</span>
                </div>
              </div>
            </div>
          </div>
        </mat-tab>

      </mat-tab-group>

      <!-- Footer: botón guardar y panel de confirmación al cerrar -->
      <ng-container *ngIf="!cargando && items.length > 0 && (hayModificaciones || confirmarCierre) && !data.soloLectura">
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
      max-height: 85vh;
      overflow: hidden;
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

    /* ── Tabs ──────────────────────────────────────────────────────────── */
    .det-tabs {
      flex: 1;
      min-height: 0; /* crítico: permite que el flex shrink/scroll funcione */
    }
    :host ::ng-deep .det-tabs .mat-mdc-tab-header {
      border-bottom: 1px solid #e2e8f0;
      flex-shrink: 0;
    }
    :host ::ng-deep .det-tabs .mat-mdc-tab .mdc-tab__text-label {
      font-family: 'Open Sans', sans-serif;
      font-size: 0.82rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    :host ::ng-deep .det-tabs .mat-mdc-tab-body-wrapper {
      flex: 1;
      min-height: 0;
    }
    :host ::ng-deep .det-tabs .mat-mdc-tab-body-content {
      overflow-y: auto;
      overflow-x: auto;
      height: 100%;
    }
    .tab-icon { font-size: 16px; height: 16px; width: 16px; }
    .tab-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: #d97706;
      flex-shrink: 0;
    }

    /* ── Tab 0: Asistencia ─────────────────────────────────────────────── */
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

    .det-tabla-wrap { padding: 0 0 8px; }
    .det-tabla {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
      min-width: 420px; /* fuerza scroll horizontal en mobile */
    }
    .det-tabla th {
      position: sticky;
      top: 0;
      z-index: 2;
      background: white;
      text-align: left;
      padding: 10px 12px 8px;
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
    .det-tabla tbody tr:first-child td { padding-top: 12px; }
    .col-materia { font-weight: 500; color: #1e293b; min-width: 140px; padding-left: 20px; }
    .col-horario { color: #475569; white-space: nowrap; min-width: 110px; vertical-align: middle; }
    .det-tabla th:first-child { padding-left: 20px; }
    .det-tabla td:last-child, .det-tabla th:last-child { padding-right: 20px; }
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
    .th-asist    { display: flex; align-items: center; gap: 4px; }
    .th-edit-icon { font-size: 13px; height: 13px; width: 13px; color: #94a3b8; vertical-align: middle; }

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
    .chip-asist:hover { filter: brightness(0.93); }
    .chip-presente { background: #dcfce7; color: #15803d; }
    .chip-ausente  { background: #fee2e2; color: #b91c1c; }

    /* Celda de asistencia — flex para alinear chip + etiqueta de motivo */
    .asist-cell { display: flex; align-items: center; gap: 4px; }

    /* Etiquetas de motivo de ausencia en EC */
    .chip-motivo {
      display: inline-block;
      border-radius: 8px;
      padding: 1px 7px; font-size: 0.7rem; font-weight: 600;
    }
    .chip-motivo--retiro { background: #f5f3ff; color: #6d28d9; border: 1px solid #ddd6fe; }
    .chip-motivo--tarde  { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }

    .sin-reg { color: #94a3b8; }

    /* ── Tab 1: Historial ──────────────────────────────────────────────── */
    .audit-wrap {
      padding: 16px 20px 20px;
    }
    .audit-loading {
      display: flex;
      justify-content: center;
      padding: 20px 0;
    }
    .audit-empty-msg {
      margin: 0;
      font-size: 0.82rem;
      color: #94a3b8;
      text-align: center;
      padding: 24px 0 8px;
    }
    .audit-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .audit-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
    }
    .audit-tipo {
      flex-shrink: 0;
      padding: 2px 8px;
      border-radius: 8px;
      font-size: 0.7rem;
      font-weight: 600;
      white-space: nowrap;
    }
    .audit-tipo--general { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
    .audit-tipo--retiro  { background: #f5f3ff; color: #6d28d9; border: 1px solid #ddd6fe; }
    .audit-tipo--manual  { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .audit-body {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .audit-materia {
      font-size: 0.82rem;
      font-weight: 500;
      color: #1e293b;
    }
    .audit-cambio {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .chip-min {
      display: inline-block;
      padding: 1px 7px;
      border-radius: 8px;
      font-size: 0.72rem;
      font-weight: 500;
    }
    .audit-arrow { font-size: 13px; height: 13px; width: 13px; color: #94a3b8; }
    .audit-meta {
      flex-shrink: 0;
      text-align: right;
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .audit-hora {
      font-size: 0.8rem;
      font-weight: 600;
      color: #1e293b;
    }
    .audit-user {
      font-size: 0.7rem;
      color: #64748b;
      white-space: nowrap;
    }

    /* ── Footer ────────────────────────────────────────────────────────── */
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

  items:             AsistenciaEspacioItem[]  = [];
  auditoria:         AuditoriaAsistenciaEC[]  = [];
  cargando         = true;
  cargandoAuditoria = true;
  confirmarCierre  = false;
  guardandoTodo    = false;
  tabActivo        = 0;

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
    const estudianteId = this.data.fila.estudiante.idEstudiante;
    const fecha        = this.data.fecha;

    this.service.getAsistenciaEspaciosDia(estudianteId, fecha).subscribe({
      next: items => { this.items = items; this.cargando = false; },
      error: ()    => { this.cargando = false; },
    });

    this.service.getAuditoriaEspaciosDia(estudianteId, fecha).subscribe({
      next: audit => { this.auditoria = audit; this.cargandoAuditoria = false; },
      error: ()    => { this.cargandoAuditoria = false; },
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
        this.recargarAuditoria();
        if (cerrarAlFinal) this.dialogRef.close();
      },
      error: () => { this.guardandoTodo = false; },
    });
  }

  guardarYCerrar(): void {
    this.guardarCambios(true);
  }

  private recargarAuditoria(): void {
    this.service.getAuditoriaEspaciosDia(
      this.data.fila.estudiante.idEstudiante,
      this.data.fecha,
    ).subscribe({
      next: audit => { this.auditoria = audit; },
      error: () => {},
    });
  }
}
