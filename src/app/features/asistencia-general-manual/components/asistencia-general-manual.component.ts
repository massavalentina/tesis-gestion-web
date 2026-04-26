import {
  Component,
  Injectable,
  OnDestroy,
  OnInit,
  AfterViewInit,
  ViewChild,
} from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule }                  from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FormsModule }                   from '@angular/forms';
import { forkJoin, lastValueFrom, Subscription } from 'rxjs';
import { filter }                        from 'rxjs/operators';
import { BreakpointObserver }            from '@angular/cdk/layout';

import { MatSelectModule }               from '@angular/material/select';
import { MatFormFieldModule }            from '@angular/material/form-field';
import { MatInputModule }                from '@angular/material/input';
import { MatButtonModule }               from '@angular/material/button';
import { MatIconModule }                 from '@angular/material/icon';
import { MatProgressSpinnerModule }      from '@angular/material/progress-spinner';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule }        from '@angular/material/sort';
import { MatTooltipModule }              from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule }                 from '@angular/material/tabs';
import { MatDatepickerModule }           from '@angular/material/datepicker';
import { MAT_DATE_LOCALE, MatNativeDateModule, NativeDateAdapter, DateAdapter, MAT_DATE_FORMATS, MatDateFormats } from '@angular/material/core';
import { MatDividerModule }              from '@angular/material/divider';
import { MatDialog, MatDialogModule }    from '@angular/material/dialog';

import { AsistenciaGeneralManualService }   from '../services/asistencia-general-manual.service';
import { CursoManual }                      from '../models/curso-manual.model';
import { FilaAsistenciaManual }             from '../models/fila-asistencia-manual.model';
import { TipoAsistenciaManual, CODIGOS_INTERNOS } from '../models/tipo-asistencia-manual.model';
import { RegistrarAsistenciaManual }        from '../models/registrar-asistencia-manual.model';
import { DescarteDialogComponent }          from './descarte-dialog/descarte-dialog.component';
import { ConfirmacionManualesDialogComponent, ConfirmacionManualesDialogData, ConfirmacionManualesResult } from './confirmacion-manuales-dialog/confirmacion-manuales-dialog.component';
import { DetalleEstudianteDialogComponent } from './detalle-estudiante-dialog/detalle-estudiante-dialog.component';
import { RetiroDialogComponent, RetiroDialogData } from '../../retiro-anticipado/components/retiro-dialog/retiro-dialog.component';
import { RetiroInfoDialogComponent, RetiroInfoDialogData } from '../../retiro-anticipado/components/retiro-info-dialog/retiro-info-dialog.component';
import { RetiroService } from '../../retiro-anticipado/services/retiro.service';
import { RetiroActivo }                     from '../../retiro-anticipado/models/retiro-activo.model';
import { MatChipsModule }                   from '@angular/material/chips';

@Injectable()
class DdMmYyyyDateAdapter extends NativeDateAdapter {
  override format(date: Date, displayFormat: object): string {
    if ((displayFormat as unknown as string) === 'input') {
      const d = String(date.getDate()).padStart(2, '0');
      const m = String(date.getMonth() + 1).padStart(2, '0');
      return `${d}/${m}/${date.getFullYear()}`;
    }
    return super.format(date, displayFormat);
  }
}

const DD_MM_YYYY: MatDateFormats = {
  parse:   { dateInput: { day: 'numeric', month: 'numeric', year: 'numeric' } },
  display: {
    dateInput:          'input',
    monthYearLabel:     { year: 'numeric', month: 'short'  },
    dateA11yLabel:      { year: 'numeric', month: 'long',  day: 'numeric' },
    monthYearA11yLabel: { year: 'numeric', month: 'long'   },
  },
};

const EXPAND_COLLAPSE = trigger('expandCollapse', [
  transition(':enter', [
    style({ height: '0', overflow: 'hidden', opacity: 0 }),
    animate('220ms cubic-bezier(0.4, 0, 0.2, 1)', style({ height: '*', opacity: 1 })),
  ]),
  transition(':leave', [
    style({ overflow: 'hidden' }),
    animate('180ms cubic-bezier(0.4, 0, 0.2, 1)', style({ height: '0', opacity: 0 })),
  ]),
]);

@Component({
  selector: 'app-asistencia-general-manual',
  standalone: true,
  animations: [EXPAND_COLLAPSE],
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatSelectModule, MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatProgressSpinnerModule, MatTableModule, MatSortModule,
    MatTooltipModule, MatSnackBarModule, MatTabsModule,
    MatDatepickerModule, MatNativeDateModule, MatDividerModule,
    MatDialogModule, MatChipsModule,
  ],
  providers: [
    { provide: MAT_DATE_LOCALE,  useValue: 'es-AR'            },
    { provide: DateAdapter,      useClass: DdMmYyyyDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: DD_MM_YYYY          },
  ],
  templateUrl: './asistencia-general-manual.component.html',
  styleUrls:   ['./asistencia-general-manual.component.css'],
})
export class AsistenciaGeneralManualComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild(MatSort) sort!: MatSort;

  // ── Datos ─────────────────────────────────────────────────────────────────
  cursos:            CursoManual[]          = [];
  cursoSeleccionado: CursoManual | null     = null;
  tipos:             TipoAsistenciaManual[] = [];
  /** Todos los tipos incluyendo RE/RAE — solo para lookup/display, nunca para mat-option */
  todosTipos:        TipoAsistenciaManual[] = [];

  dataSource = new MatTableDataSource<FilaAsistenciaManual>([]);
  filas: FilaAsistenciaManual[] = [];

  // ── Fecha ─────────────────────────────────────────────────────────────────
  fechaCtrl = new FormControl<Date>(AsistenciaGeneralManualComponent.ultimoDiaLaboral());

  private static ultimoDiaLaboral(): Date {
    const d = new Date();
    if (d.getDay() === 0) d.setDate(d.getDate() - 2);
    if (d.getDay() === 6) d.setDate(d.getDate() - 1);
    return d;
  }
  fechaHoy  = this.dateToString(new Date());

  // ── Tab: 0 = Mañana · 1 = Tarde ──────────────────────────────────────────
  tabActivo        = 0;
  tieneTurnoTarde  = true;

  // ── Límite máximo del datepicker: hoy ────────────────────────────────────
  readonly hoy = new Date();

  // ── Filtro de fecha: solo días hábiles pasados o de hoy (lun–vie, ≤ hoy) ──
  readonly diasHabiles = (d: Date | null): boolean => {
    if (!d) return false;
    const dia = d.getDay();
    if (dia === 0 || dia === 6) return false;
    // Comparar solo la fecha, sin hora
    const soloFecha = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const soloHoy   = new Date(this.hoy.getFullYear(), this.hoy.getMonth(), this.hoy.getDate());
    return soloFecha <= soloHoy;
  };

  // ── Responsive ────────────────────────────────────────────────────────────
  esMobile = false;

  get columnasActivas(): string[] {
    if (this.esMobile) return ['filaMovil'];
    const base = ['nro', 'estudiante', 'documento', 'valorTest'];
    return this.tabActivo === 0
      ? [...base, 'manana', 'acciones']
      : [...base, 'tarde',  'acciones'];
  }

  // ── Helpers para la columna mobile ───────────────────────────────────────
  getTipoActivo(fila: FilaAsistenciaManual): string | null {
    return this.tabActivo === 0 ? fila.tipoManianaId : fila.tipoTardeId;
  }

  setTipoActivo(fila: FilaAsistenciaManual, valor: string | null): void {
    if (this.tabActivo === 0) {
      fila.tipoManianaId = valor;
      this.onTipoManianaChange(fila);
    } else {
      fila.tipoTardeId = valor;
      this.onTipoTardeChange(fila);
    }
  }

  estaModificado(fila: FilaAsistenciaManual): boolean {
    return this.tabActivo === 0 ? fila.modificadoManana : fila.modificadoTarde;
  }

  // ── Búsqueda ──────────────────────────────────────────────────────────────
  textoBusqueda = '';
  filtroChip: 'presentes' | 'ausentes' | 'sinDefinir' | null = null;

  // ── Acción masiva ─────────────────────────────────────────────────────────
  tipoMasivoId: string | null      = null;
  turnoMasivo:  'MANANA' | 'TARDE' = 'MANANA';

  // ── Hora global de sesión ─────────────────────────────────────────────────
  horaGlobal: string | null = null;

  // ── Fecha previa (para revertir si el usuario cancela el guard) ────────────
  private fechaAnterior: Date = new Date();

  // ── Estados UI ────────────────────────────────────────────────────────────
  cargandoInicial  = false;
  cargandoTabla    = false;
  guardandoLote    = false;
  confirmarLimpiar = false;
  confirmarMarcar  = false;
  confirmarAplicar = false;
  confirmarGuardar = false;

  private subs: Subscription[] = [];

  get hayModificaciones(): boolean {
    return this.filas.some(f => f.modificadoManana || f.modificadoTarde);
  }

  constructor(
    private service:              AsistenciaGeneralManualService,
    private snack:                MatSnackBar,
    private dialog:               MatDialog,
    private breakpointObserver:   BreakpointObserver,
    private retiroService:        RetiroService,
  ) {}

  private notify(msg: string, action = '✓', duration = 2500): void {
    this.snack.open(msg, action, {
      duration,
      panelClass:         ['snack-rounded'],
      horizontalPosition: 'end',
      verticalPosition:   'bottom',
    });
  }

  ngOnInit(): void {
    this.cargarDatosIniciales();

    const bpSub = this.breakpointObserver.observe(['(max-width: 480px)']).subscribe(r => {
      this.esMobile = r.matches;
    });
    this.subs.push(bpSub);

    const sub = this.fechaCtrl.valueChanges.pipe(filter(d => !!d)).subscribe(async date => {
      if (this.hayModificaciones) {
        const puede = await this.confirmarDescarteNavegacion();
        if (!puede) {
          this.fechaCtrl.setValue(this.fechaAnterior, { emitEvent: false });
          return;
        }
      }
      this.fechaAnterior = date!;
      this.fechaHoy = this.dateToString(date!);
      if (this.cursoSeleccionado && this.filas.length) this.recargarAsistencias();
    });
    this.subs.push(sub);

    this.dataSource.filterPredicate = (data: FilaAsistenciaManual, q: string) => {
      if (!q) return true;
      const parts    = q.split('|');
      const textPart = parts.find(p => p.startsWith('text:'))?.slice(5) ?? '';
      const chipPart = parts.find(p => p.startsWith('chip:'))?.slice(5) ?? '';

      if (textPart) {
        const matchText = data.estudiante.apellido.toLowerCase().includes(textPart)
            || data.estudiante.nombre.toLowerCase().includes(textPart)
            || data.estudiante.documento.includes(textPart);
        if (!matchText) return false;
      }

      if (chipPart === 'presentes') {
        const ids = this.idsConCodigos(['P', 'LLT', 'LLTE', 'LLTC']);
        const tipoId = this.tabActivo === 0 ? data.tipoManianaId : data.tipoTardeId;
        if (tipoId !== null && ids.includes(tipoId!)) return true;
        const r = this.tabActivo === 0 ? data.retiroActivoManana : data.retiroActivoTarde;
        return r?.etiquetaEstado === 'Reingresado';
      }
      if (chipPart === 'ausentes') {
        const idsRA  = this.todosTipos.filter(t => ['RA', 'RAE', 'RE'].includes(t.codigo.toUpperCase())).map(t => t.id);
        const idsAus = this.idsConCodigos(['A', 'ANC']);
        const tipoId = this.tabActivo === 0 ? data.tipoManianaId : data.tipoTardeId;
        if (tipoId !== null && idsAus.includes(tipoId!)) return true;
        if (tipoId !== null && idsRA.includes(tipoId!)) {
          const r = this.tabActivo === 0 ? data.retiroActivoManana : data.retiroActivoTarde;
          return r?.etiquetaEstado !== 'Reingresado';
        }
        return false;
      }
      if (chipPart === 'sinDefinir') {
        return this.tabActivo === 0
          ? this.esSinDefinir(data.tipoManianaId)
          : this.esSinDefinir(data.tipoTardeId);
      }
      return true;
    };
  }

  ngAfterViewInit(): void {
    this.asignarSort();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private asignarSort(): void {
    if (!this.sort) return;
    this.dataSource.sortingDataAccessor = (item, col) => {
      switch (col) {
        case 'filaMovil':
        case 'estudiante': return `${item.estudiante.apellido} ${item.estudiante.nombre}`.toLowerCase();
        case 'documento':  return item.estudiante.documento;
        case 'manana': {
          const t = this.todosTipos.find(x => x.id === item.tipoManianaId);
          return t ? t.codigo.toLowerCase() : 'zzz';
        }
        case 'tarde': {
          const t = this.todosTipos.find(x => x.id === item.tipoTardeId);
          return t ? t.codigo.toLowerCase() : 'zzz';
        }
        default: return '';
      }
    };
    this.dataSource.sort = this.sort;
    this.sort.sort({ id: 'estudiante', start: 'asc', disableClear: false });
  }

  // ── Carga inicial ─────────────────────────────────────────────────────────
  private cargarDatosIniciales(): void {
    this.cargandoInicial = true;
    const sub = forkJoin({
      cursos:     this.service.getCursos(),
      tipos:      this.service.getTiposAsistencia(),
      todosTipos: this.service.getTodosTiposAsistencia(),
    }).subscribe({
      next: ({ cursos, tipos, todosTipos }) => {
        this.cursos     = cursos;
        this.tipos      = tipos;
        this.todosTipos = todosTipos;
        this.cargandoInicial = false;
      },
      error: (err) => { console.error(err); this.cargandoInicial = false; this.notify('Error al cargar datos iniciales.', 'Cerrar', 4000); },
    });
    this.subs.push(sub);
  }

  // ── Cambio de curso ───────────────────────────────────────────────────────
  async onCursoChange(nuevoCurso: CursoManual): Promise<void> {
    if (this.hayModificaciones) {
      const puede = await this.confirmarDescarteNavegacion();
      if (!puede) return;
    }
    this.cursoSeleccionado = nuevoCurso;
    this.textoBusqueda     = '';
    this.filtroChip        = null;
    this.dataSource.filter = '';
    this.cargandoTabla     = true;
    this.confirmarLimpiar  = false;
    this.confirmarMarcar   = false;
    this.confirmarAplicar  = false;
    this.confirmarGuardar  = false;

    const sub = forkJoin({
      estudiantes: this.service.getEstudiantesByCurso(nuevoCurso.id),
      asistencias: this.service.getAsistenciasDelDia(this.fechaHoy),
      turnos:      this.service.getTurnosCurso(nuevoCurso.id, this.fechaHoy),
    }).subscribe({
      next: ({ estudiantes, asistencias, turnos }) => {
        this.tieneTurnoTarde = turnos.tieneTarde;
        if (!this.tieneTurnoTarde) { this.tabActivo = 0; this.turnoMasivo = 'MANANA'; }
        const mapa = new Map(asistencias.map(a => [a.documento, a]));
        this.filas = estudiantes.map(est => {
          const ex = mapa.get(est.documento);
          const manianaId = ex ? (this.todosTipos.find(t => t.codigo === ex.codigoManana)?.id ?? null) : null;
          const tardeId   = ex ? (this.todosTipos.find(t => t.codigo === ex.codigoTarde)?.id  ?? null) : null;
          return {
            estudiante:      est,
            tipoManianaId:   manianaId,
            tipoTardeId:     tardeId,
            tipoManianaIdPrev: manianaId,
            tipoTardeIdPrev:   tardeId,
            guardado: !!ex, error: null,
            modificadoManana: false, modificadoTarde: false, guardandoFila: false,
            valorTotalInasistencia: ex ? ex.valorTotal : null,
            retiroActivo: null,
          };
        });
        this.dataSource.data = [...this.filas];
        this.cargandoTabla   = false;
        setTimeout(() => this.asignarSort());
        this.cargarRetirosActivos();
      },
      error: (err) => { console.error(err); this.cargandoTabla = false; this.notify('Error al cargar estudiantes.', 'Cerrar', 4000); },
    });
    this.subs.push(sub);
  }

  // ── Recarga asistencias al cambiar fecha ──────────────────────────────────
  private recargarAsistencias(): void {
    this.cargandoTabla = true;
    const sub = forkJoin({
      asistencias: this.service.getAsistenciasDelDia(this.fechaHoy),
      turnos:      this.service.getTurnosCurso(this.cursoSeleccionado!.id, this.fechaHoy),
    }).subscribe({
      next: ({ asistencias, turnos }) => {
        this.tieneTurnoTarde = turnos.tieneTarde;
        if (!this.tieneTurnoTarde) { this.tabActivo = 0; this.turnoMasivo = 'MANANA'; }
        const mapa = new Map(asistencias.map(a => [a.documento, a]));
        this.filas.forEach(f => {
          const ex = mapa.get(f.estudiante.documento);
          f.tipoManianaId = ex ? (this.todosTipos.find(t => t.codigo === ex.codigoManana)?.id ?? null) : null;
          f.tipoTardeId   = ex ? (this.todosTipos.find(t => t.codigo === ex.codigoTarde)?.id  ?? null) : null;
          f.tipoManianaIdPrev = f.tipoManianaId;
          f.tipoTardeIdPrev   = f.tipoTardeId;
          f.tipoLlegadaManianaId = ex?.codigoLlegadaManana
            ? (this.todosTipos.find(t => t.codigo === ex.codigoLlegadaManana)?.id ?? null)
            : null;
          f.guardado = !!ex; f.error = null;
          f.modificadoManana = false; f.modificadoTarde = false; f.guardandoFila = false;
          f.valorTotalInasistencia = ex ? ex.valorTotal : null;
          f.retiroActivoManana = null;
          f.retiroActivoTarde  = null;
          f.priorizarManualesManana = undefined;
          f.priorizarManualesTarde  = undefined;
        });
        this.dataSource.data = [...this.filas];
        this.cargandoTabla   = false;
        this.cargarRetirosActivos();
      },
      error: (err) => { console.error(err); this.cargandoTabla = false; this.notify('Error al recargar asistencias.', 'Cerrar', 4000); },
    });
    this.subs.push(sub);
  }

  /** Carga en paralelo los retiros activos de todos los estudiantes del curso. */
  private cargarRetirosActivos(): void {
    if (!this.filas.length) return;
    const sub = forkJoin(
      this.filas.map(f => this.retiroService.getRetirosActivos(f.estudiante.idEstudiante, this.fechaHoy))
    ).subscribe({
      next: (listas) => {
        this.filas.forEach((f, i) => {
          f.retiroActivoManana = listas[i].find(r => r.turno === 'MANANA') ?? null;
          f.retiroActivoTarde  = listas[i].find(r => r.turno === 'TARDE')  ?? null;
        });
        this.recalcularEtiquetasRetiro();
        this.dataSource.data = [...this.filas];
      },
    });
    this.subs.push(sub);
  }

  /**
   * Recalcula localmente el etiquetaEstado de cada retiro con reingreso,
   * comparando la hora límite con la hora actual del dispositivo.
   * Complementa lo que devuelve el backend al abrir el curso.
   */
  private recalcularEtiquetasRetiro(): void {
    const ahora    = new Date();
    const ahoraMin = ahora.getHours() * 60 + ahora.getMinutes();
    const actualizar = (r: RetiroActivo | null | undefined) => {
      if (!r || !r.conReingreso || !r.horarioLimiteReingreso || r.horarioReingreso) return;
      const [lh, lm] = r.horarioLimiteReingreso.split(':').map(Number);
      const limiteMin = lh * 60 + lm;
      r.etiquetaEstado = ahoraMin > limiteMin ? 'ReingresoVencido' : 'ConReingreso';
    };
    this.filas.forEach(f => { actualizar(f.retiroActivoManana); actualizar(f.retiroActivoTarde); });
  }

  /** Retiro activo del turno actualmente visible (null si no tiene). */
  retiroTurnoActivo(fila: FilaAsistenciaManual): RetiroActivo | null {
    return (this.tabActivo === 0 ? fila.retiroActivoManana : fila.retiroActivoTarde) ?? null;
  }

  /** @deprecated use retiroTurnoActivo — kept for template compatibility */
  retiroEsTurnoActivo(fila: FilaAsistenciaManual): boolean {
    return this.retiroTurnoActivo(fila) !== null;
  }

  // ── Tab ───────────────────────────────────────────────────────────────────
  onTabChange(i: number): void {
    this.tabActivo   = i;
    this.turnoMasivo = i === 0 ? 'MANANA' : 'TARDE';
  }

  // ── Búsqueda ──────────────────────────────────────────────────────────────
  onBusquedaChange(v: string): void {
    this.textoBusqueda = v;
    this.aplicarFiltro();
  }

  toggleFiltroChip(chip: 'presentes' | 'ausentes' | 'sinDefinir'): void {
    this.filtroChip = this.filtroChip === chip ? null : chip;
    this.aplicarFiltro();
  }

  private aplicarFiltro(): void {
    const parts: string[] = [];
    if (this.textoBusqueda.trim()) parts.push('text:' + this.textoBusqueda.trim().toLowerCase());
    if (this.filtroChip)           parts.push('chip:' + this.filtroChip);
    this.dataSource.filter = parts.join('|');
  }

  // ── Tipo helpers ──────────────────────────────────────────────────────────

  onTipoManianaChange(f: FilaAsistenciaManual): void {
    f.guardado = false; f.error = null; f.modificadoManana = true;
    f.priorizarManualesManana = undefined;
    this.dataSource.data = [...this.filas];
    this.verificarManualesECRow(f, 'MANANA');
  }

  onTipoTardeChange(f: FilaAsistenciaManual): void {
    f.guardado = false; f.error = null; f.modificadoTarde = true;
    f.priorizarManualesTarde = undefined;
    this.dataSource.data = [...this.filas];
    this.verificarManualesECRow(f, 'TARDE');
  }

  private verificarManualesECRow(f: FilaAsistenciaManual, turno: 'MANANA' | 'TARDE'): void {
    const limite = '13:20';
    this.service.getAsistenciaEspaciosDia(f.estudiante.idEstudiante, this.fechaHoy).subscribe({
      next: (items) => {
        const esManana = turno === 'MANANA';
        const tieneManuales = items.some(i =>
          i.dictada === true &&
          (i.motivo === 'Presente Manual' || i.motivo === 'Ausente Manual') &&
          (esManana ? i.horarioEntrada < limite : i.horarioEntrada >= limite)
        );

        if (!tieneManuales) {
          if (esManana) f.priorizarManualesManana = false;
          else          f.priorizarManualesTarde  = false;
          return;
        }

        const nombre = `${f.estudiante.apellido}, ${f.estudiante.nombre}`;
        const ref = this.dialog.open(ConfirmacionManualesDialogComponent, {
          width: '420px',
          maxWidth: '96vw',
          disableClose: false,
          data: { modo: 'individual', nombreEstudiante: nombre } satisfies ConfirmacionManualesDialogData,
        });

        const sub = ref.afterClosed().subscribe((result: ConfirmacionManualesResult) => {
          if (result === 'priorizar') {
            if (esManana) f.priorizarManualesManana = true;
            else          f.priorizarManualesTarde  = true;
          } else if (result === 'recalcular') {
            if (esManana) f.priorizarManualesManana = false;
            else          f.priorizarManualesTarde  = false;
          } else {
            // Cancelar: revertir al valor anterior
            if (esManana) {
              f.tipoManianaId = f.tipoManianaIdPrev ?? null;
              f.modificadoManana = false;
            } else {
              f.tipoTardeId = f.tipoTardeIdPrev ?? null;
              f.modificadoTarde = false;
            }
          }
          this.dataSource.data = [...this.filas];
        });
        this.subs.push(sub);
      },
      error: () => {
        // Si falla la verificación, continuar sin modal (recalcular por defecto)
        if (turno === 'MANANA') f.priorizarManualesManana = false;
        else                    f.priorizarManualesTarde  = false;
      },
    });
  }

  // ── Retiro anticipado ─────────────────────────────────────────────────────

  /**
   * Botón único de retiro: si la fila no tiene retiro → abre el formulario de registro.
   * Si ya tiene retiro → abre el dialog de info/edición/reingreso/cancelación.
   */
  abrirRetiroGeneral(fila: FilaAsistenciaManual): void {
    if (this.retiroTurnoActivo(fila)) {
      this.abrirInfoRetiro(fila);
    } else {
      const turno: 'MANANA' | 'TARDE' = this.tabActivo === 0 ? 'MANANA' : 'TARDE';
      this.abrirNuevoRetiro(fila, turno);
    }
  }

  private abrirNuevoRetiro(fila: FilaAsistenciaManual, turno: 'MANANA' | 'TARDE'): void {
    const ref = this.dialog.open(RetiroDialogComponent, {
      width:        '680px',
      maxWidth:     '96vw',
      maxHeight:    '90vh',
      disableClose: true,
      data: {
        estudiante: fila.estudiante,
        cursoLabel: this.cursoSeleccionado?.label ?? '',
        fecha:      this.fechaHoy,
        turno,
      } satisfies RetiroDialogData,
    });

    const sub = ref.afterClosed().subscribe((retiro: RetiroActivo | null) => {
      if (!retiro) return;

      const tipoCalculado = retiro.tipoRetiro
        ? (this.todosTipos.find(t => t.codigo === retiro.tipoRetiro) ?? null)
        : null;

      if (turno === 'MANANA') {
        fila.tipoManianaId    = tipoCalculado?.id ?? fila.tipoManianaId;
        fila.modificadoManana = false;
      } else {
        fila.tipoTardeId    = tipoCalculado?.id ?? fila.tipoTardeId;
        fila.modificadoTarde = false;
      }
      if (turno === 'MANANA') fila.retiroActivoManana = retiro;
      else                    fila.retiroActivoTarde  = retiro;
      fila.guardado = true;
      fila.error    = null;

      this.dataSource.data = [...this.filas];
      this.actualizarValorTest();
      this.notify('Retiro registrado correctamente.');
    });
    this.subs.push(sub);
  }

  private abrirInfoRetiro(fila: FilaAsistenciaManual): void {
    const retiroActivo = this.retiroTurnoActivo(fila);
    if (!retiroActivo) return;

    const turno = retiroActivo.turno as 'MANANA' | 'TARDE';

    const ref = this.dialog.open(RetiroInfoDialogComponent, {
      width:        '580px',
      maxWidth:     '96vw',
      disableClose: false,
      data: {
        estudiante:   fila.estudiante,
        cursoLabel:   this.cursoSeleccionado?.label ?? '',
        retiroActivo: { ...retiroActivo },
        fecha:        this.fechaHoy,
        readonly:     false,
      } satisfies RetiroInfoDialogData,
    });

    const sub = ref.afterClosed().subscribe((result: RetiroActivo | 'cancelado' | null) => {
      if (result === 'cancelado') {
        // Retiro cancelado — restaurar el tipo original del turno
        if (turno === 'MANANA') {
          fila.retiroActivoManana = null;
          // Restaurar el tipo de llegada mañana (P/LLT/LLTE/LLTC)
          fila.tipoManianaId = fila.tipoLlegadaManianaId ?? null;
        } else {
          fila.retiroActivoTarde = null;
          // Sin TipoLlegadaTardeId todavía — se limpia
          fila.tipoTardeId = null;
        }
        fila.guardado = false;
        this.dataSource.data = [...this.filas];
        this.actualizarValorTest();
        this.notify('Retiro cancelado correctamente.');
        return;
      }
      if (!result) return;

      const tipoCalculado = result.tipoRetiro
        ? (this.todosTipos.find(t => t.codigo === result.tipoRetiro) ?? null)
        : null;

      if (tipoCalculado) {
        if (turno === 'MANANA') fila.tipoManianaId = tipoCalculado.id;
        else                    fila.tipoTardeId   = tipoCalculado.id;
      }

      if (turno === 'MANANA') fila.retiroActivoManana = result;
      else                    fila.retiroActivoTarde  = result;

      this.dataSource.data = [...this.filas];
      this.actualizarValorTest();
      const esReingreso = !!result.horarioReingreso;
      this.notify(esReingreso ? 'Reingreso registrado correctamente.' : 'Retiro actualizado correctamente.');
    });
    this.subs.push(sub);
  }

  /** true si el turno activo no tiene retiro y tiene Presente o LLT (puede registrar retiro). */
  puedeNuevoRetiro(fila: FilaAsistenciaManual): boolean {
    if (this.retiroTurnoActivo(fila)) return false;
    const ids    = this.idsConCodigos(['P', 'LLT', 'LLTE', 'LLTC']);
    const tipoId = this.tabActivo === 0 ? fila.tipoManianaId : fila.tipoTardeId;
    return tipoId !== null && ids.includes(tipoId);
  }

  /** Texto legible para el chip del retiro activo. */
  retiroEtiquetaLabel(fila: FilaAsistenciaManual): string {
    const r = this.retiroTurnoActivo(fila);
    if (!r) return 'Retiro';
    switch (r.etiquetaEstado) {
      case 'ConReingreso':     return 'Con Reingreso';
      case 'ReingresoVencido': return 'Reingreso Vencido';
      case 'Reingresado':      return 'Reingresado';
      default: return r.tipoRetiro ?? 'Retiro';
    }
  }

  /** Clase CSS suffix del chip de retiro activo (naranja / rojo / verde / gris). */
  retiroChipClass(fila: FilaAsistenciaManual): string {
    const r = this.retiroTurnoActivo(fila);
    switch (r?.etiquetaEstado) {
      case 'ConReingreso':     return 'naranja';
      case 'ReingresoVencido': return 'rojo';
      case 'Reingresado':      return 'verde';
      default:                 return r ? 'naranja' : 'gris';
    }
  }

  /** Tooltip para el botón de retiro. */
  retiroTooltip(fila: FilaAsistenciaManual): string {
    const r = this.retiroTurnoActivo(fila);
    if (!r) return 'Registrar retiro anticipado';
    const e = r.etiquetaEstado;
    if (e === 'ConReingreso' || e === 'ReingresoVencido') return 'Ver retiro / Registrar reingreso';
    return 'Ver información del retiro';
  }

  // ── Stats del turno activo ────────────────────────────────────────────────
  // Presentes: P + LLT + LLTE + LLTC + retiros con reingreso efectuado
  // Ausentes:  A + ANC + retiros sin reingreso (RA, RAE donde etiquetaEstado !== 'Reingresado')

  private idsConCodigos(codigos: string[]): string[] {
    return this.tipos.filter(t => codigos.includes(t.codigo)).map(t => t.id);
  }

  get cantPresentes(): number {
    const ids = this.idsConCodigos(['P', 'LLT', 'LLTE', 'LLTC']);
    if (!ids.length) return 0;
    return this.filas.filter(f => {
      const tipoId = this.tabActivo === 0 ? f.tipoManianaId : f.tipoTardeId;
      if (tipoId !== null && ids.includes(tipoId!)) return true;
      // Retiro con reingreso efectuado = presente
      const r = this.tabActivo === 0 ? f.retiroActivoManana : f.retiroActivoTarde;
      return r?.etiquetaEstado === 'Reingresado';
    }).length;
  }

  get cantAusentes(): number {
    const idsRA  = this.todosTipos.filter(t => ['RA', 'RAE', 'RE'].includes(t.codigo.toUpperCase())).map(t => t.id);
    const idsAus = this.idsConCodigos(['A', 'ANC']);
    return this.filas.filter(f => {
      const tipoId = this.tabActivo === 0 ? f.tipoManianaId : f.tipoTardeId;
      if (tipoId !== null && idsAus.includes(tipoId!)) return true;
      // RA/RAE/RE sin reingreso efectuado = ausente
      if (tipoId !== null && idsRA.includes(tipoId!)) {
        const r = this.tabActivo === 0 ? f.retiroActivoManana : f.retiroActivoTarde;
        return r?.etiquetaEstado !== 'Reingresado';
      }
      return false;
    }).length;
  }

  get cantSinDefinir(): number {
    return this.tabActivo === 0
      ? this.filas.filter(f => this.esSinDefinir(f.tipoManianaId)).length
      : this.filas.filter(f => this.esSinDefinir(f.tipoTardeId)).length;
  }

  get porcentajeAsistencia(): number {
    if (!this.filas.length) return 0;
    const ids = this.idsConCodigos(['P', 'LLT', 'LLTE', 'LLTC']);
    const con = this.tabActivo === 0
      ? this.filas.filter(f => f.tipoManianaId !== null && ids.includes(f.tipoManianaId!)).length
      : this.filas.filter(f => f.tipoTardeId   !== null && ids.includes(f.tipoTardeId!)).length;
    return Math.round((con / this.filas.length) * 100);
  }

  // ── Badges de tabs ────────────────────────────────────────────────────────
  get sinDefinirManana(): number { return this.filas.filter(f => this.esSinDefinir(f.tipoManianaId)).length; }
  get sinDefinirTarde():  number { return this.filas.filter(f => this.esSinDefinir(f.tipoTardeId)).length;  }

  // ── Helper para el trigger del select ─────────────────────────────────────
  getTipo(tipoId: string | null): TipoAsistenciaManual | null {
    return tipoId ? (this.todosTipos.find(t => t.id === tipoId) ?? null) : null;
  }

  /**
   * Si tipoId corresponde a un tipo interno (RE/RAE), retorna ese tipo; si no, null.
   * Se usa para agregar un <mat-option disabled> en el select solo cuando el valor actual
   * es un tipo calculado, permitiendo que Angular Material reconozca el valor y muestre
   * el mat-select-trigger en vez del placeholder.
   */
  getInternalTipo(tipoId: string | null): TipoAsistenciaManual | null {
    if (!tipoId) return null;
    const tipo = this.todosTipos.find(t => t.id === tipoId);
    return tipo && CODIGOS_INTERNOS.has(tipo.codigo.toUpperCase()) ? tipo : null;
  }

  // Devuelve true si el tipoId es null o corresponde al tipo SA (Sin Asistencia).
  // Centraliza la lógica para que los contadores, filtros y acciones masivas
  // traten SA igual que "sin definir".
  private esSinDefinir(tipoId: string | null): boolean {
    if (!tipoId) return true;
    const sa = this.tipos.find(t => t.codigo === 'SA');
    return !!sa && tipoId === sa.id;
  }

  // ── Acciones masivas ──────────────────────────────────────────────────────
  /** Marca Presente solo los sin definir del turno activo */
  marcarTodosPresentes(): void {
    this.confirmarMarcar = false;
    const id = this.tipos.find(t => t.codigo === 'P')?.id ?? null;
    if (!id) return;
    const turnoLabel = this.tabActivo === 0 ? 'Mañana' : 'Tarde';
    this.filas.forEach(f => {
      if (this.tabActivo === 0) {
        if (this.esSinDefinir(f.tipoManianaId) && !f.retiroActivoManana) {
          f.tipoManianaId = id; f.modificadoManana = true; f.guardado = false;
        }
      } else {
        if (this.esSinDefinir(f.tipoTardeId) && !f.retiroActivoTarde) {
          f.tipoTardeId = id; f.modificadoTarde = true; f.guardado = false;
        }
      }
    });
    this.dataSource.data = [...this.filas];
    this.notify(`Presentes marcados en turno ${turnoLabel}.`);
  }

  aplicarEstadoATodos(): void {
    this.confirmarAplicar = false;
    if (!this.tipoMasivoId) { this.notify('Seleccioná un estado antes de aplicar.', 'OK'); return; }
    const desc = this.tipos.find(t => t.id === this.tipoMasivoId)?.descripcion ?? '';
    this.filas.forEach(f => {
      if (this.turnoMasivo === 'MANANA') {
        f.tipoManianaId = this.tipoMasivoId;
        f.modificadoManana = true;
      } else {
        f.tipoTardeId = this.tipoMasivoId;
        f.modificadoTarde = true;
      }
      f.guardado = false; f.error = null;
    });
    this.dataSource.data = [...this.filas];
    this.notify(`"${desc}" aplicado al turno ${this.turnoMasivo === 'MANANA' ? 'Mañana' : 'Tarde'}.`);
  }

  limpiarTabla(): void {
    this.confirmarLimpiar = false;
    this.filas.forEach(f => {
      f.tipoManianaId = null; f.tipoTardeId = null;
      f.guardado = false; f.error = null;
      f.modificadoManana = false; f.modificadoTarde = false;
    });
    this.dataSource.data = [...this.filas];
  }

  // ── Guardar ───────────────────────────────────────────────────────────────
  private buildDtos(fila: FilaAsistenciaManual): RegistrarAsistenciaManual[] {
    const hora = this.horaGlobal ? `${this.horaGlobal}:00` : null;
    const dtos: RegistrarAsistenciaManual[] = [];
    if (fila.tipoManianaId) dtos.push({
      estudianteId: fila.estudiante.idEstudiante,
      fecha: this.fechaHoy,
      turno: 'MANANA',
      tipoAsistenciaId: fila.tipoManianaId,
      hora,
      priorizarManualesEC: fila.priorizarManualesManana === true,
    });
    if (fila.tipoTardeId) dtos.push({
      estudianteId: fila.estudiante.idEstudiante,
      fecha: this.fechaHoy,
      turno: 'TARDE',
      tipoAsistenciaId: fila.tipoTardeId,
      hora,
      priorizarManualesEC: fila.priorizarManualesTarde === true,
    });
    return dtos;
  }

  /** Guarda únicamente el turno visible en el tab activo */
  guardarFila(fila: FilaAsistenciaManual): void {
    const esManana = this.tabActivo === 0;
    const tipoId   = esManana ? fila.tipoManianaId : fila.tipoTardeId;

    if (!tipoId) { this.notify('Definí la asistencia para este turno.', 'OK'); return; }

    const dto: RegistrarAsistenciaManual = {
      estudianteId:       fila.estudiante.idEstudiante,
      fecha:              this.fechaHoy,
      turno:              esManana ? 'MANANA' : 'TARDE',
      tipoAsistenciaId:   tipoId,
      hora:               this.horaGlobal ? `${this.horaGlobal}:00` : null,
      priorizarManualesEC: esManana
        ? fila.priorizarManualesManana === true
        : fila.priorizarManualesTarde  === true,
    };

    fila.error = null; fila.guardandoFila = true;

    const sub = this.service.registrarLote([dto]).subscribe({
      next: () => {
        const eraSA = this.esSinDefinir(tipoId);
        fila.guardandoFila = false;
        if (esManana) {
          fila.modificadoManana = false;
          fila.priorizarManualesManana = undefined;
          if (eraSA) { fila.tipoManianaId = null; fila.tipoManianaIdPrev = null; fila.guardado = false; }
          else        { fila.tipoManianaIdPrev = tipoId; fila.guardado = true; }
        } else {
          fila.modificadoTarde = false;
          fila.priorizarManualesTarde = undefined;
          if (eraSA) { fila.tipoTardeId = null; fila.tipoTardeIdPrev = null; fila.guardado = false; }
          else        { fila.tipoTardeIdPrev = tipoId; fila.guardado = true; }
        }
        this.dataSource.data = [...this.filas];
        this.actualizarValorTest();
        this.notify(eraSA ? 'Asistencia borrada.' : 'Asistencia guardada.');
      },
      error: (err) => {
        console.error(err); fila.error = 'Error al guardar'; fila.guardandoFila = false;
        this.dataSource.data = [...this.filas];
        this.notify('No se pudo guardar.', 'Cerrar', 3500);
      },
    });
    this.subs.push(sub);
  }

  guardarTodo(): void {
    this.confirmarGuardar = false;
    const todos = this.filas.flatMap(f => this.buildDtos(f));
    if (!todos.length) { this.notify('No hay asistencias definidas.', 'OK'); return; }

    // Filas modificadas cuya decisión de priorizar aún no fue tomada
    const filasIndecisasManana = this.filas.filter(f => f.modificadoManana && f.priorizarManualesManana === undefined);
    const filasIndecisasTarde  = this.filas.filter(f => f.modificadoTarde  && f.priorizarManualesTarde  === undefined);

    if (!filasIndecisasManana.length && !filasIndecisasTarde.length) {
      this.ejecutarGuardarTodo(todos);
      return;
    }

    // Construir requests para verificar
    const requests = [
      ...filasIndecisasManana.map(f => ({ estudianteId: f.estudiante.idEstudiante, fecha: this.fechaHoy, turno: 'MANANA' })),
      ...filasIndecisasTarde.map(f  => ({ estudianteId: f.estudiante.idEstudiante, fecha: this.fechaHoy, turno: 'TARDE'  })),
    ];

    this.guardandoLote = true;
    const sub = this.service.verificarManualesEc(requests).subscribe({
      next: (resultados) => {
        const conManuales = resultados.filter(r => r.tieneManuales);

        // Marcar los sin manuales como recalcular
        filasIndecisasManana.forEach(f => {
          const res = resultados.find(r => r.estudianteId === f.estudiante.idEstudiante && r.turno === 'MANANA');
          if (res && !res.tieneManuales) f.priorizarManualesManana = false;
        });
        filasIndecisasTarde.forEach(f => {
          const res = resultados.find(r => r.estudianteId === f.estudiante.idEstudiante && r.turno === 'TARDE');
          if (res && !res.tieneManuales) f.priorizarManualesTarde = false;
        });

        if (!conManuales.length) {
          // Nadie tiene manuales → proceder
          this.ejecutarGuardarTodo(this.filas.flatMap(f => this.buildDtos(f)));
          return;
        }

        // Hay estudiantes con manuales → abrir modal masivo
        this.guardandoLote = false;
        const nombres = conManuales.map(r => {
          const fila = this.filas.find(f => f.estudiante.idEstudiante === r.estudianteId);
          return fila ? `${fila.estudiante.apellido}, ${fila.estudiante.nombre}` : r.estudianteId;
        });

        const ref = this.dialog.open(ConfirmacionManualesDialogComponent, {
          width: '480px',
          maxWidth: '96vw',
          disableClose: false,
          data: { modo: 'masivo', nombresEstudiantes: nombres } satisfies ConfirmacionManualesDialogData,
        });

        const sub2 = ref.afterClosed().subscribe((result: ConfirmacionManualesResult) => {
          if (result === null || result === undefined) return; // cancelar → abortar

          const priorizar = result === 'priorizar';
          conManuales.forEach(r => {
            const fila = this.filas.find(f => f.estudiante.idEstudiante === r.estudianteId);
            if (!fila) return;
            if (r.turno === 'MANANA') fila.priorizarManualesManana = priorizar;
            else                      fila.priorizarManualesTarde  = priorizar;
          });
          // Los que no tenían manuales ya se marcaron como false
          this.ejecutarGuardarTodo(this.filas.flatMap(f => this.buildDtos(f)));
        });
        this.subs.push(sub2);
      },
      error: (err) => {
        console.error(err);
        this.guardandoLote = false;
        this.notify('Error al verificar cambios manuales. Intente de nuevo.', 'Cerrar', 4000);
      },
    });
    this.subs.push(sub);
  }

  private ejecutarGuardarTodo(todos: RegistrarAsistenciaManual[]): void {
    this.guardandoLote = true;
    const sub = this.service.registrarLote(todos).subscribe({
      next: (res) => {
        this.filas.forEach(f => {
          if (f.tipoManianaId || f.tipoTardeId) {
            const mananaSA = this.esSinDefinir(f.tipoManianaId) && f.tipoManianaId !== null;
            const tardeSA  = this.esSinDefinir(f.tipoTardeId)   && f.tipoTardeId   !== null;
            if (mananaSA) { f.tipoManianaId = null; f.tipoManianaIdPrev = null; }
            else          { f.tipoManianaIdPrev = f.tipoManianaId; }
            if (tardeSA)  { f.tipoTardeId   = null; f.tipoTardeIdPrev  = null; }
            else          { f.tipoTardeIdPrev  = f.tipoTardeId;   }
            f.guardado         = !mananaSA && !tardeSA;
            f.modificadoManana = false;
            f.modificadoTarde  = false;
            f.priorizarManualesManana = undefined;
            f.priorizarManualesTarde  = undefined;
          }
        });
        this.dataSource.data = [...this.filas];
        this.guardandoLote   = false;
        this.actualizarValorTest();
        this.notify(res.mensaje ?? 'Asistencias guardadas.', '✓', 3500);
      },
      error: (err) => { console.error(err); this.guardandoLote = false; this.notify('Error al guardar el lote.', 'Cerrar', 4000); },
    });
    this.subs.push(sub);
  }

  // ── Navegación con cambios pendientes ─────────────────────────────────────
  async confirmarDescarteNavegacion(): Promise<boolean> {
    const result = await lastValueFrom(
      this.dialog.open(DescarteDialogComponent, { width: '380px', disableClose: true }).afterClosed()
    );
    if (result === 'descartar') return true;
    if (!result) return false;
    // result === 'guardar'
    const todos = this.filas.flatMap(f => this.buildDtos(f));
    if (!todos.length) return true;
    try {
      await lastValueFrom(this.service.registrarLote(todos));
      return true;
    } catch {
      this.notify('Error al guardar. La navegación fue cancelada.', 'Cerrar', 4000);
      return false;
    }
  }

  // ── TEST: refresca valorTotalInasistencia desde backend ───────────────────
  private actualizarValorTest(): void {
    const sub = this.service.getAsistenciasDelDia(this.fechaHoy).subscribe({
      next: (asistencias) => {
        const mapa = new Map(asistencias.map(a => [a.documento, a]));
        this.filas.forEach(f => {
          const ex = mapa.get(f.estudiante.documento);
          f.valorTotalInasistencia = ex ? ex.valorTotal : null;
        });
        this.dataSource.data = [...this.filas];
      },
    });
    this.subs.push(sub);
  }

  // ── Detalle por Espacio Curricular ────────────────────────────────────────
  abrirDetalle(fila: FilaAsistenciaManual): void {
    this.dialog.open(DetalleEstudianteDialogComponent, {
      width: '680px',
      maxWidth: '96vw',
      disableClose: true,
      data: {
        fila,
        fecha:        this.fechaHoy,
        fechaDisplay: this.formatFechaDisplay(),
        tipos:        this.todosTipos,
      },
    });
  }

  private formatFechaDisplay(): string {
    const d = this.fechaCtrl.value ?? new Date();
    return d.toLocaleDateString('es-AR', {
      weekday: 'long',
      day:     'numeric',
      month:   'long',
      year:    'numeric',
    });
  }

  // ── Utils ─────────────────────────────────────────────────────────────────
  private dateToString(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
}
