import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, map, of, switchMap } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import { EstudianteFicha } from '../../../ficha-alumno/models/estudiante-ficha.model';
import { FichaAlumnoService } from '../../../ficha-alumno/services/ficha-alumno.service';
import { MisEcItem } from '../../models/mis-ec.model';
import { MisEspaciosCurricularesService } from '../../services/mis-espacios-curriculares.service';

type TipoCalificacion = 'N' | 'R1' | 'R2';
type FiltroEstado = 'all' | 'without-notes' | 'changed';
type TabId = 1 | 5;

interface EvaluacionPlaceholder {
  numero: number;
  label: string;
}

interface CalificacionesPersistedState {
  version: 1;
  updatedAt: string | null;
  cells: Record<string, number>;
}

interface CalificacionesStudentRow {
  idEstudiante: string;
  nombreCompleto: string;
  documento: string;
  searchText: string;
}

interface CalificacionAuditChange {
  id: string;
  idEstudiante: string;
  estudiante: string;
  documento: string;
  evaluacion: string;
  tipo: TipoCalificacion;
  valorAnterior: number | null;
  valorNuevo: number | null;
}

interface CalificacionAuditSession {
  id: string;
  timestamp: string;
  docente: string;
  origen: 'Manual';
  cambios: CalificacionAuditChange[];
}

@Component({
  selector: 'app-mis-ec-calificaciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mis-ec-calificaciones.component.html',
  styleUrl: './mis-ec-calificaciones.component.scss',
})
export class MisEcCalificacionesComponent implements OnInit {
  private readonly storageVersion = 1 as const;
  readonly tiposCalificacion: readonly TipoCalificacion[] = ['N', 'R1', 'R2'];
  readonly filtros: ReadonlyArray<{ id: FiltroEstado; label: string }> = [
    { id: 'all', label: 'Todos' },
    { id: 'without-notes', label: 'Sin notas' },
    { id: 'changed', label: 'Con cambios' },
  ];
  readonly evaluaciones: ReadonlyArray<EvaluacionPlaceholder> = Array.from(
    { length: 8 },
    (_, index) => ({ numero: index + 1, label: `Eval ${index + 1}` }),
  );
  readonly pageSizeOptions = [10, 20, 30];
  readonly auditSessionPageSize = 5;

  espacio: MisEcItem | null = null;
  estudiantes: CalificacionesStudentRow[] = [];
  loading = true;
  error = false;
  idEC = '';

  busqueda = '';
  filtroActivo: FiltroEstado = 'all';
  tabActivo: TabId = 1;
  modoEdicion = false;
  pageSize = 10;
  pageIndex = 0;

  storageWarning = '';
  auditWarning = '';
  feedbackGuardado = '';

  auditoria: CalificacionAuditSession[] = [];
  expandedAuditSessions: Record<string, boolean> = {};
  visibleAuditSessionsCount = this.auditSessionPageSize;

  private savedState: CalificacionesPersistedState = this.emptyPersistedState();
  private draftCells: Record<string, string> = {};

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly misEcService: MisEspaciosCurricularesService,
    private readonly fichaAlumnoService: FichaAlumnoService,
  ) {}

  ngOnInit(): void {
    this.idEC = this.route.snapshot.paramMap.get('idEC') ?? '';

    this.misEcService.getMisEspaciosCurriculares().pipe(
      map(espacios => espacios.find(espacio => espacio.idEC === this.idEC) ?? null),
      switchMap(espacio => {
        if (!espacio) {
          this.error = true;
          return of({ espacio: null, estudiantes: [] as EstudianteFicha[] });
        }

        return this.fichaAlumnoService.getEstudiantesPorCurso(espacio.idCurso).pipe(
          map(estudiantes => ({ espacio, estudiantes })),
        );
      }),
      finalize(() => {
        this.loading = false;
      }),
    ).subscribe({
      next: ({ espacio, estudiantes }) => {
        if (!espacio) return;

        this.espacio = espacio;
        this.estudiantes = this.buildStudentRows(estudiantes);
        this.restoreSavedState();
        this.restoreAuditTrail();
      },
      error: () => {
        this.error = true;
      },
    });
  }

  get evaluacionesVisibles(): ReadonlyArray<EvaluacionPlaceholder> {
    return this.tabActivo === 1
      ? this.evaluaciones.slice(0, 4)
      : this.evaluaciones.slice(4, 8);
  }

  get totalColumnasTabla(): number {
    return 2 + (this.evaluacionesVisibles.length * this.tiposCalificacion.length);
  }

  get filasFiltradas(): CalificacionesStudentRow[] {
    const texto = this.busqueda.trim().toLowerCase();

    return this.estudiantes.filter(estudiante => {
      if (texto && !estudiante.searchText.includes(texto)) {
        return false;
      }

      switch (this.filtroActivo) {
        case 'without-notes':
          return !this.rowHasAnyValue(estudiante.idEstudiante);
        case 'changed':
          return this.modoEdicion && this.rowHasChanges(estudiante.idEstudiante);
        default:
          return true;
      }
    });
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.filasFiltradas.length / this.pageSize));
  }

  get paginaActual(): number {
    return Math.min(this.pageIndex, this.totalPaginas - 1);
  }

  get filasPaginadas(): CalificacionesStudentRow[] {
    const start = this.paginaActual * this.pageSize;
    return this.filasFiltradas.slice(start, start + this.pageSize);
  }

  get cantidadFiltrada(): number {
    return this.filasFiltradas.length;
  }

  get cantidadSinNotas(): number {
    return this.estudiantes.filter(estudiante => !this.rowHasAnyValue(estudiante.idEstudiante)).length;
  }

  get cantidadConCambios(): number {
    if (!this.modoEdicion) return 0;
    return this.estudiantes.filter(estudiante => this.rowHasChanges(estudiante.idEstudiante)).length;
  }

  get cantidadRegistrosLocales(): number {
    return Object.keys(this.savedState.cells).length;
  }

  get totalAuditoria(): number {
    return this.auditoria.reduce((total, session) => total + session.cambios.length, 0);
  }

  get sesionesAuditoriaVisibles(): CalificacionAuditSession[] {
    return this.auditoria.slice(0, this.visibleAuditSessionsCount);
  }

  get hayMasSesionesAuditoria(): boolean {
    return this.auditoria.length > this.visibleAuditSessionsCount;
  }

  get canSave(): boolean {
    return this.modoEdicion && this.hasDraftChanges() && !this.hasInvalidDraftCells();
  }

  get hayNotasInvalidas(): boolean {
    return this.hasInvalidDraftCells();
  }

  get updatedAtLabel(): string {
    if (!this.savedState.updatedAt) {
      return 'Sin guardados locales';
    }

    const updatedAt = new Date(this.savedState.updatedAt);
    return `Guardado local ${updatedAt.toLocaleString('es-AR')}`;
  }

  get rangoPaginaLabel(): string {
    if (this.cantidadFiltrada === 0) {
      return 'Sin resultados';
    }

    const start = this.paginaActual * this.pageSize + 1;
    const end = Math.min(start + this.filasPaginadas.length - 1, this.cantidadFiltrada);
    return `Mostrando ${start}-${end} de ${this.cantidadFiltrada}`;
  }

  get docenteActualLabel(): string {
    const usuario = this.authService.obtenerUsuario();
    if (!usuario) return 'Docente actual';

    const apellido = usuario.apellido.trim();
    const nombre = usuario.nombre.trim();
    const nombreCompleto = [apellido, nombre].filter(Boolean).join(', ');

    return nombreCompleto || usuario.email || 'Docente actual';
  }

  formatCurso(anio: number, division: string): string {
    return `${anio}.º ${division}`;
  }

  formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString('es-AR');
  }

  formatAuditValue(value: number | null): string {
    return value === null ? '—' : String(value);
  }

  getAuditChangeLabel(change: CalificacionAuditChange): string {
    if (change.valorAnterior === null && change.valorNuevo !== null) {
      return 'Primera carga';
    }

    if (change.valorAnterior !== null && change.valorNuevo === null) {
      return 'Nota quitada';
    }

    return 'Corrección';
  }

  volverAlListado(): void {
    this.router.navigate(['/mis-espacios-curriculares']);
  }

  volverAMateria(): void {
    this.router.navigate(['/mis-espacios-curriculares', this.idEC]);
  }

  setFiltro(filtro: FiltroEstado): void {
    if (filtro === 'changed' && !this.modoEdicion) {
      return;
    }

    this.filtroActivo = filtro;
    this.pageIndex = 0;
  }

  setTab(tab: TabId): void {
    this.tabActivo = tab;
  }

  onBusquedaChange(): void {
    this.pageIndex = 0;
  }

  onPageSizeChange(value: number): void {
    if (!this.pageSizeOptions.includes(value)) {
      return;
    }

    this.pageSize = value;
    this.pageIndex = 0;
  }

  goToPreviousPage(): void {
    if (this.paginaActual === 0) return;
    this.pageIndex = this.paginaActual - 1;
  }

  goToNextPage(): void {
    if (this.paginaActual >= this.totalPaginas - 1) return;
    this.pageIndex = this.paginaActual + 1;
  }

  toggleAuditSession(sessionId: string): void {
    this.expandedAuditSessions[sessionId] = !this.expandedAuditSessions[sessionId];
  }

  isAuditSessionExpanded(sessionId: string): boolean {
    return this.expandedAuditSessions[sessionId] === true;
  }

  showMoreAuditSessions(): void {
    this.visibleAuditSessionsCount += this.auditSessionPageSize;
  }

  activarEdicion(): void {
    this.modoEdicion = true;
    this.feedbackGuardado = '';
    this.draftCells = this.toDraftCells(this.savedState.cells);
    if (this.filtroActivo === 'changed') {
      this.filtroActivo = 'all';
    }
  }

  cancelarEdicion(): void {
    this.modoEdicion = false;
    this.feedbackGuardado = '';
    this.draftCells = {};
    if (this.filtroActivo === 'changed') {
      this.filtroActivo = 'all';
    }
  }

  guardarCambios(): void {
    if (!this.canSave) return;

    const normalizedCells = this.normalizeDraftCells();
    const auditSession = this.buildAuditSession(this.savedState.cells, normalizedCells);

    this.savedState = {
      version: this.storageVersion,
      updatedAt: new Date().toISOString(),
      cells: normalizedCells,
    };

    this.persistState(this.savedState);

    if (auditSession !== null) {
      this.auditoria = [auditSession, ...this.auditoria];
      this.expandedAuditSessions = { ...this.expandedAuditSessions, [auditSession.id]: false };
      this.persistAuditTrail();
    }

    this.feedbackGuardado = 'Cambios guardados localmente para este espacio curricular.';
    this.modoEdicion = false;
    this.draftCells = {};
    if (this.filtroActivo === 'changed') {
      this.filtroActivo = 'all';
    }
  }

  getReadonlyCellLabel(idEstudiante: string, evaluacion: number, tipo: TipoCalificacion): string {
    const savedValue = this.savedState.cells[this.cellKey(idEstudiante, evaluacion, tipo)];
    return savedValue === undefined ? '-' : String(savedValue);
  }

  getDraftCellValue(idEstudiante: string, evaluacion: number, tipo: TipoCalificacion): string {
    return this.draftCells[this.cellKey(idEstudiante, evaluacion, tipo)] ?? '';
  }

  onDraftValueChange(
    idEstudiante: string,
    evaluacion: number,
    tipo: TipoCalificacion,
    value: string,
  ): void {
    this.feedbackGuardado = '';
    this.draftCells[this.cellKey(idEstudiante, evaluacion, tipo)] = value.replace(/\s+/g, '');
  }

  isCellInvalid(idEstudiante: string, evaluacion: number, tipo: TipoCalificacion): boolean {
    const rawValue = this.getDraftCellValue(idEstudiante, evaluacion, tipo);
    return this.parseDraftValue(rawValue) === 'invalid';
  }

  rowHasChanges(idEstudiante: string): boolean {
    for (const evaluacion of this.evaluaciones) {
      for (const tipo of this.tiposCalificacion) {
        const key = this.cellKey(idEstudiante, evaluacion.numero, tipo);
        const saved = this.savedState.cells[key] ?? null;
        const draft = this.parseDraftValue(this.draftCells[key] ?? '');

        if (draft === 'invalid') {
          return true;
        }

        if (draft !== saved) {
          return true;
        }
      }
    }

    return false;
  }

  rowHasAnyValue(idEstudiante: string): boolean {
    for (const evaluacion of this.evaluaciones) {
      for (const tipo of this.tiposCalificacion) {
        const key = this.cellKey(idEstudiante, evaluacion.numero, tipo);

        if (this.modoEdicion) {
          const parsed = this.parseDraftValue(this.draftCells[key] ?? '');
          if (parsed !== null) {
            return true;
          }
          continue;
        }

        if (this.savedState.cells[key] !== undefined) {
          return true;
        }
      }
    }

    return false;
  }

  trackByStudentId(_: number, estudiante: CalificacionesStudentRow): string {
    return estudiante.idEstudiante;
  }

  trackByAuditSessionId(_: number, session: CalificacionAuditSession): string {
    return session.id;
  }

  trackByAuditChangeId(_: number, change: CalificacionAuditChange): string {
    return change.id;
  }

  private hasDraftChanges(): boolean {
    return this.estudiantes.some(estudiante => this.rowHasChanges(estudiante.idEstudiante));
  }

  private hasInvalidDraftCells(): boolean {
    return Object.values(this.draftCells).some(rawValue => this.parseDraftValue(rawValue) === 'invalid');
  }

  private normalizeDraftCells(): Record<string, number> {
    const normalizedCells: Record<string, number> = {};

    Object.entries(this.draftCells).forEach(([key, rawValue]) => {
      const parsed = this.parseDraftValue(rawValue);
      if (parsed !== 'invalid' && parsed !== null) {
        normalizedCells[key] = parsed;
      }
    });

    return normalizedCells;
  }

  private buildAuditSession(
    previousCells: Record<string, number>,
    nextCells: Record<string, number>,
  ): CalificacionAuditSession | null {
    const changedKeys = new Set([
      ...Object.keys(previousCells),
      ...Object.keys(nextCells),
    ]);

    const now = new Date().toISOString();
    const changes: CalificacionAuditChange[] = [];

    changedKeys.forEach(key => {
      const previousValue = previousCells[key] ?? null;
      const nextValue = nextCells[key] ?? null;

      if (previousValue === nextValue) {
        return;
      }

      const [idEstudiante, evaluacionStr, tipo] = key.split('|');
      const evaluacion = Number(evaluacionStr);
      const estudiante = this.estudiantes.find(item => item.idEstudiante === idEstudiante);

      if (!estudiante || !Number.isInteger(evaluacion)) {
        return;
      }

      changes.push({
        id: `${key}|${Date.now()}|${changes.length}`,
        idEstudiante,
        estudiante: estudiante.nombreCompleto,
        documento: estudiante.documento,
        evaluacion: `Eval ${evaluacion}`,
        tipo: tipo as TipoCalificacion,
        valorAnterior: previousValue,
        valorNuevo: nextValue,
      });
    });

    if (changes.length === 0) {
      return null;
    }

    return {
      id: `audit-session|${Date.now()}|${changes.length}`,
      timestamp: now,
      docente: this.docenteActualLabel,
      origen: 'Manual',
      cambios: changes,
    };
  }

  private parseDraftValue(rawValue: string): number | null | 'invalid' {
    const trimmed = rawValue.trim();
    if (!trimmed) return null;
    if (!/^\d+$/.test(trimmed)) return 'invalid';

    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10) {
      return 'invalid';
    }

    return parsed;
  }

  private cellKey(idEstudiante: string, evaluacion: number, tipo: TipoCalificacion): string {
    return `${idEstudiante}|${evaluacion}|${tipo}`;
  }

  private buildStudentRows(estudiantes: EstudianteFicha[]): CalificacionesStudentRow[] {
    return [...estudiantes]
      .sort((a, b) => {
        const apellidoCompare = a.apellido.localeCompare(b.apellido, 'es', { sensitivity: 'base' });
        if (apellidoCompare !== 0) return apellidoCompare;
        return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
      })
      .map(estudiante => {
        const nombreCompleto = `${estudiante.apellido}, ${estudiante.nombre}`;
        return {
          idEstudiante: estudiante.idEstudiante,
          nombreCompleto,
          documento: estudiante.documento,
          searchText: `${nombreCompleto} ${estudiante.documento}`.toLowerCase(),
        };
      });
  }

  private restoreSavedState(): void {
    const raw = localStorage.getItem(this.storageKey());
    if (!raw) {
      this.savedState = this.emptyPersistedState();
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<CalificacionesPersistedState>;
      this.savedState = {
        version: this.storageVersion,
        updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
        cells: this.normalizePersistedCells(parsed.cells),
      };
    } catch {
      localStorage.removeItem(this.storageKey());
      this.savedState = this.emptyPersistedState();
      this.storageWarning = 'Se descartó un guardado local inválido y se reconstruyó la tabla vacía.';
    }
  }

  private restoreAuditTrail(): void {
    const raw = localStorage.getItem(this.auditStorageKey());
    if (!raw) {
      this.auditoria = [];
      this.expandedAuditSessions = {};
      return;
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      this.auditoria = this.normalizeAuditEntries(parsed);
      this.expandedAuditSessions = Object.fromEntries(
        this.auditoria.map(session => [session.id, false]),
      );
    } catch {
      localStorage.removeItem(this.auditStorageKey());
      this.auditoria = [];
      this.expandedAuditSessions = {};
      this.auditWarning = 'Se descartó un historial local inválido y se reinició el registro de cambios.';
    }
  }

  private normalizePersistedCells(cells: unknown): Record<string, number> {
    if (!cells || typeof cells !== 'object') {
      return {};
    }

    const validStudentIds = new Set(this.estudiantes.map(estudiante => estudiante.idEstudiante));
    const normalized: Record<string, number> = {};

    Object.entries(cells as Record<string, unknown>).forEach(([key, value]) => {
      const [idEstudiante, evaluacionStr, tipo] = key.split('|');
      const evaluacion = Number(evaluacionStr);

      if (!validStudentIds.has(idEstudiante)) return;
      if (!Number.isInteger(evaluacion) || evaluacion < 1 || evaluacion > 8) return;
      if (!this.tiposCalificacion.includes(tipo as TipoCalificacion)) return;
      if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 10) return;

      normalized[key] = value;
    });

    return normalized;
  }

  private normalizeAuditEntries(rawEntries: unknown): CalificacionAuditSession[] {
    if (!Array.isArray(rawEntries)) {
      return [];
    }

    const firstEntry = rawEntries[0];
    const looksLikeSession = !!firstEntry
      && typeof firstEntry === 'object'
      && Array.isArray((firstEntry as { cambios?: unknown }).cambios);

    if (looksLikeSession) {
      return rawEntries
        .map(rawEntry => this.normalizeAuditSession(rawEntry))
        .filter((entry): entry is CalificacionAuditSession => entry !== null)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    const legacyChanges = rawEntries
      .map(rawEntry => this.normalizeLegacyAuditChange(rawEntry))
      .filter((entry): entry is CalificacionAuditChange & { timestamp: string; docente: string; origen: 'Manual' } => entry !== null);

    const grouped = new Map<string, CalificacionAuditSession>();

    legacyChanges.forEach(change => {
      const sessionKey = `${change.timestamp}|${change.docente}|${change.origen}`;
      const session = grouped.get(sessionKey);
      const normalizedChange: CalificacionAuditChange = {
        id: change.id,
        idEstudiante: change.idEstudiante,
        estudiante: change.estudiante,
        documento: change.documento,
        evaluacion: change.evaluacion,
        tipo: change.tipo,
        valorAnterior: change.valorAnterior,
        valorNuevo: change.valorNuevo,
      };

      if (session) {
        session.cambios.push(normalizedChange);
        return;
      }

      grouped.set(sessionKey, {
        id: `audit-session|legacy|${grouped.size + 1}`,
        timestamp: change.timestamp,
        docente: change.docente,
        origen: change.origen,
        cambios: [normalizedChange],
      });
    });

    return Array.from(grouped.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  private normalizeAuditSession(rawEntry: unknown): CalificacionAuditSession | null {
    if (!rawEntry || typeof rawEntry !== 'object') return null;

    const typedEntry = rawEntry as Partial<CalificacionAuditSession>;
    if (typeof typedEntry.id !== 'string'
      || typeof typedEntry.timestamp !== 'string'
      || typeof typedEntry.docente !== 'string'
      || typedEntry.origen !== 'Manual'
      || !Array.isArray(typedEntry.cambios)) {
      return null;
    }

    const cambios = typedEntry.cambios
      .map(change => this.normalizeAuditChange(change))
      .filter((change): change is CalificacionAuditChange => change !== null);

    if (cambios.length === 0) {
      return null;
    }

    return {
      id: typedEntry.id,
      timestamp: typedEntry.timestamp,
      docente: typedEntry.docente,
      origen: typedEntry.origen,
      cambios,
    };
  }

  private normalizeAuditChange(rawEntry: unknown): CalificacionAuditChange | null {
    if (!rawEntry || typeof rawEntry !== 'object') return null;

    const typedEntry = rawEntry as Partial<CalificacionAuditChange>;
    return typeof typedEntry.id === 'string'
      && typeof typedEntry.idEstudiante === 'string'
      && typeof typedEntry.estudiante === 'string'
      && typeof typedEntry.documento === 'string'
      && typeof typedEntry.evaluacion === 'string'
      && this.tiposCalificacion.includes(typedEntry.tipo as TipoCalificacion)
      && (typedEntry.valorAnterior === null || typeof typedEntry.valorAnterior === 'number')
      && (typedEntry.valorNuevo === null || typeof typedEntry.valorNuevo === 'number')
      ? {
          id: typedEntry.id,
          idEstudiante: typedEntry.idEstudiante,
          estudiante: typedEntry.estudiante,
          documento: typedEntry.documento,
          evaluacion: typedEntry.evaluacion,
          tipo: typedEntry.tipo as TipoCalificacion,
          valorAnterior: typedEntry.valorAnterior ?? null,
          valorNuevo: typedEntry.valorNuevo ?? null,
        }
      : null;
  }

  private normalizeLegacyAuditChange(
    rawEntry: unknown,
  ): (CalificacionAuditChange & { timestamp: string; docente: string; origen: 'Manual' }) | null {
    if (!rawEntry || typeof rawEntry !== 'object') return null;

    const typedEntry = rawEntry as Partial<CalificacionAuditChange & {
      timestamp: string;
      docente: string;
      origen: 'Manual';
    }>;

    return typeof typedEntry.id === 'string'
      && typeof typedEntry.timestamp === 'string'
      && typeof typedEntry.idEstudiante === 'string'
      && typeof typedEntry.estudiante === 'string'
      && typeof typedEntry.documento === 'string'
      && typeof typedEntry.evaluacion === 'string'
      && this.tiposCalificacion.includes(typedEntry.tipo as TipoCalificacion)
      && (typedEntry.valorAnterior === null || typeof typedEntry.valorAnterior === 'number')
      && (typedEntry.valorNuevo === null || typeof typedEntry.valorNuevo === 'number')
      && typeof typedEntry.docente === 'string'
      && typedEntry.origen === 'Manual'
      ? {
          id: typedEntry.id,
          timestamp: typedEntry.timestamp,
          idEstudiante: typedEntry.idEstudiante,
          estudiante: typedEntry.estudiante,
          documento: typedEntry.documento,
          evaluacion: typedEntry.evaluacion,
          tipo: typedEntry.tipo as TipoCalificacion,
          valorAnterior: typedEntry.valorAnterior ?? null,
          valorNuevo: typedEntry.valorNuevo ?? null,
          docente: typedEntry.docente,
          origen: typedEntry.origen,
        }
      : null;
  }

  private persistState(state: CalificacionesPersistedState): void {
    localStorage.setItem(this.storageKey(), JSON.stringify(state));
  }

  private persistAuditTrail(): void {
    localStorage.setItem(this.auditStorageKey(), JSON.stringify(this.auditoria));
  }

  private toDraftCells(cells: Record<string, number>): Record<string, string> {
    return Object.fromEntries(
      Object.entries(cells).map(([key, value]) => [key, String(value)]),
    );
  }

  private storageKey(): string {
    return `calificaciones-manuales:${this.idEC}`;
  }

  private auditStorageKey(): string {
    return `calificaciones-manuales-auditoria:${this.idEC}`;
  }

  private emptyPersistedState(): CalificacionesPersistedState {
    return {
      version: this.storageVersion,
      updatedAt: null,
      cells: {},
    };
  }
}
