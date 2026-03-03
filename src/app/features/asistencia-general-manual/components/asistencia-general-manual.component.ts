import {
  Component,
  OnDestroy,
  OnInit,
  AfterViewInit,
  ViewChild,
} from '@angular/core';
import { CommonModule }                  from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FormsModule }                   from '@angular/forms';
import { forkJoin, Subscription }        from 'rxjs';
import { filter }                        from 'rxjs/operators';

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
import { MatNativeDateModule }           from '@angular/material/core';
import { MatDividerModule }              from '@angular/material/divider';
import { MatSlideToggleModule }          from '@angular/material/slide-toggle';

import { AsistenciaGeneralManualService }   from '../services/asistencia-general-manual.service';
import { CursoManual }                      from '../models/curso-manual.model';
import { FilaAsistenciaManual }             from '../models/fila-asistencia-manual.model';
import { TipoAsistenciaManual, CODIGOS_CON_HORA } from '../models/tipo-asistencia-manual.model';
import { RegistrarAsistenciaManual }        from '../models/registrar-asistencia-manual.model';

@Component({
  selector: 'app-asistencia-general-manual',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatSelectModule, MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatProgressSpinnerModule, MatTableModule, MatSortModule,
    MatTooltipModule, MatSnackBarModule, MatTabsModule,
    MatDatepickerModule, MatNativeDateModule, MatDividerModule,
    MatSlideToggleModule,
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

  dataSource = new MatTableDataSource<FilaAsistenciaManual>([]);
  filas: FilaAsistenciaManual[] = [];

  // ── Fecha ─────────────────────────────────────────────────────────────────
  fechaCtrl = new FormControl<Date>(new Date());
  fechaHoy  = this.dateToString(new Date());

  // ── Tab: 0 = Mañana · 1 = Tarde ──────────────────────────────────────────
  tabActivo = 0;

  get columnasActivas(): string[] {
    const base     = ['nro', 'estudiante', 'documento'];
    const acciones = ['acciones'];
    return this.tabActivo === 0
      ? (this.modoDesarrollo ? [...base, 'manana', 'horaManana', ...acciones] : [...base, 'manana', ...acciones])
      : (this.modoDesarrollo ? [...base, 'tarde',  'horaTarde',  ...acciones] : [...base, 'tarde',  ...acciones]);
  }

  // ── Búsqueda ──────────────────────────────────────────────────────────────
  textoBusqueda = '';

  // ── Acción masiva ─────────────────────────────────────────────────────────
  tipoMasivoId: string | null      = null;
  turnoMasivo:  'MANANA' | 'TARDE' = 'MANANA';

  // ── Modo dev ──────────────────────────────────────────────────────────────
  modoDesarrollo = false;

  // ── Estados UI ────────────────────────────────────────────────────────────
  cargandoInicial  = false;
  cargandoTabla    = false;
  guardandoLote    = false;
  confirmarLimpiar = false;
  confirmarMarcar  = false;
  confirmarAplicar = false;
  confirmarGuardar = false;

  private subs: Subscription[] = [];

  constructor(private service: AsistenciaGeneralManualService, private snack: MatSnackBar) {}

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

    const sub = this.fechaCtrl.valueChanges.pipe(filter(d => !!d)).subscribe(date => {
      this.fechaHoy = this.dateToString(date!);
      if (this.cursoSeleccionado && this.filas.length) this.recargarAsistencias();
    });
    this.subs.push(sub);

    this.dataSource.filterPredicate = (data, q) => {
      const s = q.toLowerCase();
      return data.estudiante.apellido.toLowerCase().includes(s)
          || data.estudiante.nombre.toLowerCase().includes(s)
          || data.estudiante.documento.includes(s);
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
        case 'estudiante': return `${item.estudiante.apellido} ${item.estudiante.nombre}`.toLowerCase();
        case 'documento':  return item.estudiante.documento;
        case 'manana': {
          const t = this.tipos.find(x => x.id === item.tipoManianaId);
          return t ? t.codigo.toLowerCase() : 'zzz';
        }
        case 'tarde': {
          const t = this.tipos.find(x => x.id === item.tipoTardeId);
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
    const sub = forkJoin({ cursos: this.service.getCursos(), tipos: this.service.getTiposAsistencia() })
      .subscribe({
        next: ({ cursos, tipos }) => { this.cursos = cursos; this.tipos = tipos; this.cargandoInicial = false; },
        error: (err) => { console.error(err); this.cargandoInicial = false; this.notify('Error al cargar datos iniciales.', 'Cerrar', 4000); },
      });
    this.subs.push(sub);
  }

  // ── Cambio de curso ───────────────────────────────────────────────────────
  onCursoChange(curso: CursoManual): void {
    this.cursoSeleccionado = curso;
    this.textoBusqueda     = '';
    this.dataSource.filter = '';
    this.cargandoTabla     = true;
    this.confirmarLimpiar  = false;
    this.confirmarMarcar   = false;
    this.confirmarAplicar  = false;
    this.confirmarGuardar  = false;

    const sub = forkJoin({
      estudiantes: this.service.getEstudiantesByCurso(curso.idCurso),
      asistencias: this.service.getAsistenciasDelDia(this.fechaHoy),
    }).subscribe({
      next: ({ estudiantes, asistencias }) => {
        const mapa = new Map(asistencias.map(a => [a.documento, a]));
        this.filas = estudiantes.map(est => {
          const ex = mapa.get(est.documento);
          return {
            estudiante:      est,
            tipoManianaId:   ex ? (this.tipos.find(t => t.codigo === ex.codigoManana)?.id ?? null) : null,
            tipoTardeId:     ex ? (this.tipos.find(t => t.codigo === ex.codigoTarde)?.id  ?? null) : null,
            horaManana: null, horaTarde: null,
            guardado: !!ex, error: null,
            modificadoManana: false, modificadoTarde: false, guardandoFila: false,
          };
        });
        this.asignarSort();
        this.dataSource.data = [...this.filas];
        this.cargandoTabla   = false;
      },
      error: (err) => { console.error(err); this.cargandoTabla = false; this.notify('Error al cargar estudiantes.', 'Cerrar', 4000); },
    });
    this.subs.push(sub);
  }

  // ── Recarga asistencias al cambiar fecha ──────────────────────────────────
  private recargarAsistencias(): void {
    this.cargandoTabla = true;
    const sub = this.service.getAsistenciasDelDia(this.fechaHoy).subscribe({
      next: (asistencias) => {
        const mapa = new Map(asistencias.map(a => [a.documento, a]));
        this.filas.forEach(f => {
          const ex = mapa.get(f.estudiante.documento);
          f.tipoManianaId = ex ? (this.tipos.find(t => t.codigo === ex.codigoManana)?.id ?? null) : null;
          f.tipoTardeId   = ex ? (this.tipos.find(t => t.codigo === ex.codigoTarde)?.id  ?? null) : null;
          f.horaManana = null; f.horaTarde = null;
          f.guardado = !!ex; f.error = null;
          f.modificadoManana = false; f.modificadoTarde = false; f.guardandoFila = false;
        });
        this.dataSource.data = [...this.filas];
        this.cargandoTabla   = false;
      },
      error: (err) => { console.error(err); this.cargandoTabla = false; this.notify('Error al recargar asistencias.', 'Cerrar', 4000); },
    });
    this.subs.push(sub);
  }

  // ── Tab ───────────────────────────────────────────────────────────────────
  onTabChange(i: number): void {
    this.tabActivo   = i;
    this.turnoMasivo = i === 0 ? 'MANANA' : 'TARDE';
  }

  // ── Búsqueda ──────────────────────────────────────────────────────────────
  onBusquedaChange(v: string): void {
    this.dataSource.filter = v.trim().toLowerCase();
  }

  // ── Tipo helpers ──────────────────────────────────────────────────────────
  requiereHora(tipoId: string | null): boolean {
    if (!tipoId || !this.modoDesarrollo) return false;
    const t = this.tipos.find(x => x.id === tipoId);
    return t ? CODIGOS_CON_HORA.has(t.codigo.toUpperCase()) : false;
  }

  onTipoManianaChange(f: FilaAsistenciaManual): void {
    if (!this.requiereHora(f.tipoManianaId)) f.horaManana = null;
    f.guardado = false; f.error = null; f.modificadoManana = true;
    this.dataSource.data = [...this.filas];
  }

  onTipoTardeChange(f: FilaAsistenciaManual): void {
    if (!this.requiereHora(f.tipoTardeId)) f.horaTarde = null;
    f.guardado = false; f.error = null; f.modificadoTarde = true;
    this.dataSource.data = [...this.filas];
  }

  // ── Stats del turno activo ────────────────────────────────────────────────
  // Presentes: P + LLT + LLTE + LLTC (llegadas tarde = estuvo presente)
  // Ausentes:  A + ANC + RA (ausencia computable, no computable y retiro anticipado)

  private idsConCodigos(codigos: string[]): string[] {
    return this.tipos.filter(t => codigos.includes(t.codigo)).map(t => t.id);
  }

  get cantPresentes(): number {
    const ids = this.idsConCodigos(['P', 'LLT', 'LLTE', 'LLTC']);
    if (!ids.length) return 0;
    return this.tabActivo === 0
      ? this.filas.filter(f => f.tipoManianaId !== null && ids.includes(f.tipoManianaId!)).length
      : this.filas.filter(f => f.tipoTardeId   !== null && ids.includes(f.tipoTardeId!)).length;
  }

  get cantAusentes(): number {
    const ids = this.idsConCodigos(['A', 'ANC', 'RA']);
    if (!ids.length) return 0;
    return this.tabActivo === 0
      ? this.filas.filter(f => f.tipoManianaId !== null && ids.includes(f.tipoManianaId!)).length
      : this.filas.filter(f => f.tipoTardeId   !== null && ids.includes(f.tipoTardeId!)).length;
  }

  get cantSinDefinir(): number {
    return this.tabActivo === 0
      ? this.filas.filter(f => !f.tipoManianaId).length
      : this.filas.filter(f => !f.tipoTardeId).length;
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
  get sinDefinirManana(): number { return this.filas.filter(f => !f.tipoManianaId).length; }
  get sinDefinirTarde():  number { return this.filas.filter(f => !f.tipoTardeId).length; }

  // ── Helper para el trigger del select ─────────────────────────────────────
  getTipo(tipoId: string | null): TipoAsistenciaManual | null {
    return tipoId ? (this.tipos.find(t => t.id === tipoId) ?? null) : null;
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
        if (!f.tipoManianaId) { f.tipoManianaId = id; f.modificadoManana = true; f.guardado = false; }
      } else {
        if (!f.tipoTardeId) { f.tipoTardeId = id; f.modificadoTarde = true; f.guardado = false; }
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
        if (!this.requiereHora(f.tipoManianaId)) f.horaManana = null;
        f.modificadoManana = true;
      } else {
        f.tipoTardeId = this.tipoMasivoId;
        if (!this.requiereHora(f.tipoTardeId)) f.horaTarde = null;
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
      f.horaManana = null; f.horaTarde = null;
      f.guardado = false; f.error = null;
      f.modificadoManana = false; f.modificadoTarde = false;
    });
    this.dataSource.data = [...this.filas];
  }

  // ── Guardar ───────────────────────────────────────────────────────────────
  private buildDtos(fila: FilaAsistenciaManual): RegistrarAsistenciaManual[] {
    const dtos: RegistrarAsistenciaManual[] = [];
    if (fila.tipoManianaId) dtos.push({ estudianteId: fila.estudiante.idEstudiante, fecha: this.fechaHoy, turno: 'MANANA', tipoAsistenciaId: fila.tipoManianaId, hora: this.modoDesarrollo && fila.horaManana ? `${fila.horaManana}:00` : null });
    if (fila.tipoTardeId)   dtos.push({ estudianteId: fila.estudiante.idEstudiante, fecha: this.fechaHoy, turno: 'TARDE',  tipoAsistenciaId: fila.tipoTardeId,   hora: this.modoDesarrollo && fila.horaTarde  ? `${fila.horaTarde}:00`  : null });
    return dtos;
  }

  /** Guarda únicamente el turno visible en el tab activo */
  guardarFila(fila: FilaAsistenciaManual): void {
    const esManana = this.tabActivo === 0;
    const tipoId   = esManana ? fila.tipoManianaId : fila.tipoTardeId;
    const hora     = esManana ? fila.horaManana    : fila.horaTarde;

    if (!tipoId) { this.notify('Definí la asistencia para este turno.', 'OK'); return; }

    const dto: RegistrarAsistenciaManual = {
      estudianteId:    fila.estudiante.idEstudiante,
      fecha:           this.fechaHoy,
      turno:           esManana ? 'MANANA' : 'TARDE',
      tipoAsistenciaId: tipoId,
      hora:            this.modoDesarrollo && hora ? `${hora}:00` : null,
    };

    fila.error = null; fila.guardandoFila = true;

    const sub = this.service.registrarLote([dto]).subscribe({
      next: () => {
        fila.guardado = true; fila.guardandoFila = false;
        if (esManana) fila.modificadoManana = false;
        else          fila.modificadoTarde  = false;
        this.dataSource.data = [...this.filas];
        this.notify('Asistencia guardada.');
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
    this.guardandoLote = true;

    const sub = this.service.registrarLote(todos).subscribe({
      next: (res) => {
        this.filas.forEach(f => {
          if (f.tipoManianaId || f.tipoTardeId) {
            f.guardado = true;
            f.modificadoManana = false;
            f.modificadoTarde  = false;
          }
        });
        this.dataSource.data = [...this.filas];
        this.guardandoLote   = false;
        this.notify(res.mensaje ?? 'Asistencias guardadas.', '✓', 3500);
      },
      error: (err) => { console.error(err); this.guardandoLote = false; this.notify('Error al guardar el lote.', 'Cerrar', 4000); },
    });
    this.subs.push(sub);
  }

  // ── Utils ─────────────────────────────────────────────────────────────────
  private dateToString(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
}
