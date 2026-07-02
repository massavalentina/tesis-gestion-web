import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { catchError, finalize, forkJoin, lastValueFrom, map, of } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import { MisEcItem } from '../../models/mis-ec.model';
import {
  AuditoriaCalificacionSesion as AuditoriaCalificacionSesionApi,
  AuditoriaCalificacionesResponse,
  CalificacionVigente,
  GestionManualEstudiante,
  GuardarCalificacionCambio,
  GuardarCalificacionesManualResponse,
  InstanciaEvaluativaResumen,
  TipoCalificacion,
} from '../../models/calificaciones.model';
import {
  CalificacionesCambiosPendientesDialogComponent,
  CalificacionesCambiosPendientesDialogData,
  CalificacionesCambiosPendientesDialogResult,
} from '../calificaciones-cambios-pendientes-dialog/calificaciones-cambios-pendientes-dialog.component';
import { CalificacionesService } from '../../services/calificaciones.service';
import { MisEspaciosCurricularesService } from '../../services/mis-espacios-curriculares.service';

type FiltroEstado = 'all' | 'without-notes' | 'changed';
type TabId = 1 | 5;
type CellValueMap = Record<string, number | null>;
type DraftParsedValue = number | null | 'invalid';

interface EvaluacionSlot {
  numero: number;
  label: string;
  instancia: InstanciaEvaluativaResumen | null;
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
  origen: string;
  cantidadCambios: number;
  rutaArchivoImportacion: string | null;
  cambios: CalificacionAuditChange[];
}

@Component({
  selector: 'app-mis-ec-calificaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule],
  templateUrl: './mis-ec-calificaciones.component.html',
  styleUrl: './mis-ec-calificaciones.component.scss',
})
export class MisEcCalificacionesComponent implements OnInit {
  readonly tiposCalificacion: readonly TipoCalificacion[] = ['N', 'R1', 'R2'];
  readonly filtros: ReadonlyArray<{ id: FiltroEstado; label: string }> = [
    { id: 'all', label: 'Todos' },
    { id: 'without-notes', label: 'Sin notas' },
    { id: 'changed', label: 'Con cambios' },
  ];
  readonly pageSizeOptions = [10, 20, 30];
  readonly auditSessionPageSize = 5;

  espacio: MisEcItem | null = null;
  instancias: InstanciaEvaluativaResumen[] = [];
  estudiantes: CalificacionesStudentRow[] = [];
  evaluaciones: EvaluacionSlot[] = [];
  evaluacionesVisibles: EvaluacionSlot[] = [];
  filasFiltradas: CalificacionesStudentRow[] = [];
  filasPaginadas: CalificacionesStudentRow[] = [];

  loading = true;
  error = false;
  saving = false;
  auditLoadingMore = false;
  idEC = '';
  errorMessage = 'No se pudieron cargar las calificaciones de este espacio curricular.';

  busqueda = '';
  filtroActivo: FiltroEstado = 'all';
  tabActivo: TabId = 1;
  modoEdicion = false;
  pageSize = 10;
  pageIndex = 0;

  totalColumnasTabla = 14;
  totalPaginas = 1;
  paginaActual = 0;
  cantidadFiltrada = 0;
  cantidadSinNotas = 0;
  cantidadConCambios = 0;
  cantidadNotasPersistidas = 0;
  canSave = false;
  hayNotasInvalidas = false;
  updatedAtLabel = 'Sin notas persistidas';
  rangoPaginaLabel = 'Sin resultados';

  dataWarning = '';
  auditWarning = '';
  estadoAvisoPendienteConNotas = '';
  estadoAvisoEvaluadaSinNotas = '';
  feedbackGuardado = '';
  saveError = '';

  auditoria: CalificacionAuditSession[] = [];
  expandedAuditSessions: Record<string, boolean> = {};
  totalAuditSessions = 0;
  hasMoreAuditSessions = false;

  private savedCells: CellValueMap = {};
  private draftCells: Record<string, string> = {};
  private invalidCellMap: Record<string, boolean> = {};
  private rowHasAnyValueMap: Record<string, boolean> = {};
  private rowHasChangesMap: Record<string, boolean> = {};
  private slotEnabledMap: Record<string, boolean> = {};
  private lastUpdatedAt: string | null = null;
  private instanciasByNumero = new Map<number, InstanciaEvaluativaResumen>();
  private instanciasById = new Map<string, InstanciaEvaluativaResumen>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly misEcService: MisEspaciosCurricularesService,
    private readonly calificacionesService: CalificacionesService,
    private readonly dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.idEC = this.route.snapshot.paramMap.get('idEC') ?? '';
    if (!this.idEC) {
      this.error = true;
      this.loading = false;
      this.errorMessage = 'No se indico un espacio curricular valido para gestionar calificaciones.';
      return;
    }

    this.loadScreen();
  }

  get totalAuditoria(): number {
    return this.auditoria.reduce((total, session) => total + session.cambios.length, 0);
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.tieneCambiosSinGuardar()) {
      return;
    }

    event.preventDefault();
    event.returnValue = '';
  }

  get sesionesAuditoriaVisibles(): CalificacionAuditSession[] {
    return this.auditoria;
  }

  get hayMasSesionesAuditoria(): boolean {
    return this.hasMoreAuditSessions;
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
    return `${anio}°${division}`;
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

    return 'Correccion';
  }

  volverAlListado(): void {
    this.router.navigate(['/mis-espacios-curriculares']);
  }

  volverAMateria(): void {
    this.router.navigate(['/mis-espacios-curriculares', this.idEC]);
  }

  navegarImportador(): void {
    this.router.navigate(['/mis-espacios-curriculares', this.idEC, 'calificaciones', 'importar']);
  }

  setFiltro(filtro: FiltroEstado): void {
    if (filtro === 'changed' && !this.modoEdicion) {
      return;
    }

    this.filtroActivo = filtro;
    this.pageIndex = 0;
    this.refreshTableState();
  }

  setTab(tab: TabId): void {
    this.tabActivo = tab;
    this.refreshVisibleEvaluaciones();
  }

  onBusquedaChange(): void {
    this.pageIndex = 0;
    this.refreshTableState();
  }

  onPageSizeChange(value: number): void {
    if (!this.pageSizeOptions.includes(value)) {
      return;
    }

    this.pageSize = value;
    this.pageIndex = 0;
    this.refreshTableState();
  }

  goToPreviousPage(): void {
    if (this.paginaActual === 0) return;
    this.pageIndex = this.paginaActual - 1;
    this.refreshTableState();
  }

  goToNextPage(): void {
    if (this.paginaActual >= this.totalPaginas - 1) return;
    this.pageIndex = this.paginaActual + 1;
    this.refreshTableState();
  }

  toggleAuditSession(sessionId: string): void {
    this.expandedAuditSessions[sessionId] = !this.expandedAuditSessions[sessionId];
  }

  isAuditSessionExpanded(sessionId: string): boolean {
    return this.expandedAuditSessions[sessionId] === true;
  }

  showMoreAuditSessions(): void {
    if (this.auditLoadingMore || !this.hasMoreAuditSessions) {
      return;
    }

    this.auditLoadingMore = true;
    this.auditWarning = '';

    this.calificacionesService.getAuditoria(
      this.idEC,
      this.auditoria.length,
      this.auditSessionPageSize,
    ).pipe(
      finalize(() => {
        this.auditLoadingMore = false;
      }),
    ).subscribe({
      next: response => {
        this.applyAuditResponse(response, true);
      },
      error: () => {
        this.auditWarning = 'No se pudo cargar mas historial de cambios.';
      },
    });
  }

  activarEdicion(): void {
    this.modoEdicion = true;
    this.feedbackGuardado = '';
    this.saveError = '';
    this.draftCells = this.toDraftCells(this.savedCells);
    if (this.filtroActivo === 'changed') {
      this.filtroActivo = 'all';
    }
    this.recomputeDerivedState();
  }

  async cancelarEdicion(): Promise<void> {
    if (this.tieneCambiosSinGuardar()) {
      const puedeSalir = await this.confirmarSalidaConCambios('cancel-edit');
      if (!puedeSalir) {
        return;
      }

      if (!this.modoEdicion) {
        return;
      }
    }

    this.descartarEdicion();
  }

  async guardarCambios(): Promise<void> {
    if (!this.canSave) return;
    await this.persistDraftChanges();
  }

  tieneCambiosSinGuardar(): boolean {
    return this.modoEdicion && Object.values(this.rowHasChangesMap).some(hasChanges => hasChanges);
  }

  async confirmarSalidaConCambios(contexto: 'navigation' | 'cancel-edit'): Promise<boolean> {
    const dialogResult = await lastValueFrom(
      this.dialog.open(CalificacionesCambiosPendientesDialogComponent, {
        width: '420px',
        disableClose: true,
        data: this.buildDialogData(contexto),
      }).afterClosed(),
    ) as CalificacionesCambiosPendientesDialogResult | undefined;

    if (dialogResult === 'descartar') {
      return true;
    }

    if (dialogResult !== 'guardar') {
      return false;
    }

    return this.persistDraftChanges();
  }

  private descartarEdicion(): void {
    this.modoEdicion = false;
    this.feedbackGuardado = '';
    this.saveError = '';
    this.draftCells = {};
    if (this.filtroActivo === 'changed') {
      this.filtroActivo = 'all';
    }
    this.recomputeDerivedState();
  }

  private async persistDraftChanges(): Promise<boolean> {
    const cambios = this.buildSavePayload();
    if (cambios.length === 0) {
      this.feedbackGuardado = 'No se detectaron cambios para persistir.';
      this.descartarEdicion();
      return true;
    }

    this.saving = true;
    this.feedbackGuardado = '';
    this.saveError = '';
    this.canSave = false;

    try {
      const response = await lastValueFrom(
        this.calificacionesService.guardarGestionManual(this.idEC, { cambios }),
      );
      this.applySaveResponse(cambios, response);
      return true;
    } catch (error) {
      this.saveError = this.extractErrorMessage(
        error,
        'No se pudieron guardar las calificaciones en la base de datos.',
      );
      return false;
    } finally {
      this.saving = false;
      this.recomputeDerivedState();
    }
  }

  getReadonlyCellLabel(idEstudiante: string, evaluacion: number, tipo: TipoCalificacion): string {
    const savedValue = this.getSavedCellValue(idEstudiante, evaluacion, tipo);
    return savedValue === null ? '-' : String(savedValue);
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
    if (!this.isSlotEnabled(evaluacion, tipo)) {
      return;
    }

    this.feedbackGuardado = '';
    this.saveError = '';
    this.draftCells[this.cellKey(idEstudiante, evaluacion, tipo)] = value.replace(/\s+/g, '');
    this.recomputeDerivedState();
  }

  isCellInvalid(idEstudiante: string, evaluacion: number, tipo: TipoCalificacion): boolean {
    return this.invalidCellMap[this.cellKey(idEstudiante, evaluacion, tipo)] === true;
  }

  isSlotEnabled(evaluacion: number, tipo: TipoCalificacion): boolean {
    return this.slotEnabledMap[this.slotKey(evaluacion, tipo)] === true;
  }

  rowHasChanges(idEstudiante: string): boolean {
    return this.rowHasChangesMap[idEstudiante] === true;
  }

  rowHasAnyValue(idEstudiante: string): boolean {
    return this.rowHasAnyValueMap[idEstudiante] === true;
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

  private loadScreen(): void {
    this.loading = true;
    this.error = false;
    this.dataWarning = '';
    this.auditWarning = '';

    forkJoin({
      espacio: this.misEcService.getMisEspaciosCurriculares().pipe(
        map(espacios => espacios.find(espacio => espacio.idEC === this.idEC) ?? null),
      ),
      instancias: this.calificacionesService.getInstancias(this.idEC),
      estudiantes: this.calificacionesService.getEstudiantes(this.idEC),
      calificaciones: this.calificacionesService.getCalificacionesVigentes(this.idEC),
      auditoria: this.calificacionesService.getAuditoria(this.idEC, 0, this.auditSessionPageSize).pipe(
        catchError(() => {
          this.auditWarning = 'No se pudo cargar la auditoria persistida. Podes trabajar igual con la tabla.';
          return of<AuditoriaCalificacionesResponse | null>(null);
        }),
      ),
    }).pipe(
      finalize(() => {
        this.loading = false;
      }),
    ).subscribe({
      next: ({ espacio, instancias, estudiantes, calificaciones, auditoria }) => {
        if (!espacio) {
          this.error = true;
          this.errorMessage = 'No se encontro el espacio curricular asignado para esta pantalla.';
          return;
        }

        this.applyScreenData(espacio, instancias, estudiantes, calificaciones);
        if (auditoria) {
          this.applyAuditResponse(auditoria, false);
        }
      },
      error: error => {
        this.error = true;
        this.errorMessage = this.extractErrorMessage(
          error,
          'No se pudieron cargar las calificaciones de este espacio curricular.',
        );
      },
    });
  }

  private applyScreenData(
    espacio: MisEcItem,
    instancias: InstanciaEvaluativaResumen[],
    estudiantes: GestionManualEstudiante[],
    calificaciones: CalificacionVigente[],
  ): void {
    this.espacio = espacio;
    this.instancias = [...instancias].sort((a, b) => a.nro - b.nro);
    this.instanciasByNumero = new Map(this.instancias.map(instancia => [instancia.nro, instancia]));
    this.instanciasById = new Map(this.instancias.map(instancia => [instancia.idIE, instancia]));
    this.estudiantes = this.buildStudentRows(estudiantes);
    this.savedCells = this.buildSavedCells(calificaciones, estudiantes);
    this.lastUpdatedAt = this.computeLastUpdatedAt(calificaciones);
    this.rebuildEvaluaciones();
    this.dataWarning = this.instancias.length === 0
      ? 'Este espacio curricular no tiene instancias evaluativas cargadas todavia.'
      : '';
    this.recomputeDerivedState();
  }

  private rebuildEvaluaciones(): void {
    this.evaluaciones = Array.from({ length: 8 }, (_, index) => {
      const numero = index + 1;
      return {
        numero,
        label: `Eval ${numero}`,
        instancia: this.instanciasByNumero.get(numero) ?? null,
      };
    });

    this.slotEnabledMap = {};
    this.evaluaciones.forEach(evaluacion => {
      const instancia = evaluacion.instancia;
      if (!instancia) {
        this.tiposCalificacion.forEach(tipo => {
          this.slotEnabledMap[this.slotKey(evaluacion.numero, tipo)] = false;
        });
        return;
      }

      this.slotEnabledMap[this.slotKey(evaluacion.numero, 'N')] = instancia.archivos.notaOriginal !== null;
      this.slotEnabledMap[this.slotKey(evaluacion.numero, 'R1')] = instancia.archivos.recuperatorio1 !== null;
      this.slotEnabledMap[this.slotKey(evaluacion.numero, 'R2')] = instancia.archivos.recuperatorio2 !== null;
    });

    this.refreshVisibleEvaluaciones();
  }

  private refreshVisibleEvaluaciones(): void {
    this.evaluacionesVisibles = this.tabActivo === 1
      ? this.evaluaciones.slice(0, 4)
      : this.evaluaciones.slice(4, 8);
    this.totalColumnasTabla = 2 + (this.evaluacionesVisibles.length * this.tiposCalificacion.length);
  }

  private recomputeDerivedState(): void {
    this.recomputeRowState();
    this.refreshTableState();
    this.recomputeEstadoAvisos();
  }

  private recomputeRowState(): void {
    const invalidCellMap: Record<string, boolean> = {};
    const rowHasAnyValueMap: Record<string, boolean> = {};
    const rowHasChangesMap: Record<string, boolean> = {};

    let cantidadSinNotas = 0;
    let cantidadConCambios = 0;
    let hasAnyDraftChanges = false;
    let hayNotasInvalidas = false;

    for (const estudiante of this.estudiantes) {
      let rowHasAnyValue = false;
      let rowHasChanges = false;

      for (const evaluacion of this.evaluaciones) {
        if (!evaluacion.instancia) {
          continue;
        }

        for (const tipo of this.tiposCalificacion) {
          const key = this.cellKey(estudiante.idEstudiante, evaluacion.numero, tipo);
          const savedValue = this.getSavedCellValue(estudiante.idEstudiante, evaluacion.numero, tipo);

          if (!this.modoEdicion) {
            if (savedValue !== null) {
              rowHasAnyValue = true;
            }
            continue;
          }

          const parsedValue = this.parseDraftValue(this.draftCells[key] ?? '');
          const slotEnabled = this.isSlotEnabled(evaluacion.numero, tipo);

          if (slotEnabled && parsedValue === 'invalid') {
            invalidCellMap[key] = true;
            rowHasChanges = true;
            hayNotasInvalidas = true;
            continue;
          }

          if (parsedValue !== null && parsedValue !== 'invalid') {
            rowHasAnyValue = true;
          }

          if (slotEnabled && parsedValue !== savedValue) {
            rowHasChanges = true;
          }
        }
      }

      rowHasAnyValueMap[estudiante.idEstudiante] = rowHasAnyValue;
      rowHasChangesMap[estudiante.idEstudiante] = rowHasChanges;

      if (!rowHasAnyValue) {
        cantidadSinNotas += 1;
      }

      if (this.modoEdicion && rowHasChanges) {
        cantidadConCambios += 1;
        hasAnyDraftChanges = true;
      }
    }

    this.invalidCellMap = invalidCellMap;
    this.rowHasAnyValueMap = rowHasAnyValueMap;
    this.rowHasChangesMap = rowHasChangesMap;
    this.cantidadSinNotas = cantidadSinNotas;
    this.cantidadConCambios = cantidadConCambios;
    this.cantidadNotasPersistidas = Object.values(this.savedCells).filter(value => value !== null).length;
    this.hayNotasInvalidas = hayNotasInvalidas;
    this.canSave = this.modoEdicion && !this.saving && hasAnyDraftChanges && !hayNotasInvalidas;
    this.updatedAtLabel = this.lastUpdatedAt
      ? `Ultima actualizacion ${new Date(this.lastUpdatedAt).toLocaleString('es-AR')}`
      : 'Sin notas persistidas';
  }

  private refreshTableState(): void {
    const texto = this.busqueda.trim().toLowerCase();

    this.filasFiltradas = this.estudiantes.filter(estudiante => {
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

    this.cantidadFiltrada = this.filasFiltradas.length;
    this.totalPaginas = Math.max(1, Math.ceil(this.cantidadFiltrada / this.pageSize));
    this.paginaActual = Math.min(this.pageIndex, this.totalPaginas - 1);
    this.pageIndex = this.paginaActual;

    const start = this.paginaActual * this.pageSize;
    this.filasPaginadas = this.filasFiltradas.slice(start, start + this.pageSize);

    if (this.cantidadFiltrada === 0) {
      this.rangoPaginaLabel = 'Sin resultados';
      return;
    }

    const rangoInicio = this.paginaActual * this.pageSize + 1;
    const rangoFin = Math.min(rangoInicio + this.filasPaginadas.length - 1, this.cantidadFiltrada);
    this.rangoPaginaLabel = `Mostrando ${rangoInicio}-${rangoFin} de ${this.cantidadFiltrada}`;
  }

  private applyAuditResponse(response: AuditoriaCalificacionesResponse, append: boolean): void {
    const mappedSessions = response.items.map(session => this.mapAuditSession(session));

    if (append) {
      const existentes = new Set(this.auditoria.map(session => session.id));
      this.auditoria = [
        ...this.auditoria,
        ...mappedSessions.filter(session => !existentes.has(session.id)),
      ];
    } else {
      this.auditoria = mappedSessions;
    }

    this.expandedAuditSessions = {
      ...Object.fromEntries(this.auditoria.map(session => [session.id, false])),
      ...this.expandedAuditSessions,
    };
    this.totalAuditSessions = response.totalSesiones;
    this.hasMoreAuditSessions = response.hasMore;
  }

  private applySaveResponse(
    cambios: GuardarCalificacionCambio[],
    response: GuardarCalificacionesManualResponse,
  ): void {
    if (response.cambiosAplicados === 0) {
      this.feedbackGuardado = 'No se detectaron cambios nuevos para guardar.';
      this.modoEdicion = false;
      this.draftCells = {};
      return;
    }

    this.applySavedChanges(cambios);
    this.lastUpdatedAt = response.sesionAuditoria?.timestamp ?? new Date().toISOString();
    this.recomputeDerivedState();

    if (response.sesionAuditoria) {
      const session = this.mapAuditSession(response.sesionAuditoria);
      const existed = this.auditoria.some(item => item.id === session.id);
      this.auditoria = [session, ...this.auditoria.filter(item => item.id !== session.id)];
      this.expandedAuditSessions = { ...this.expandedAuditSessions, [session.id]: false };
      if (!existed) {
        this.totalAuditSessions += 1;
      }
      this.hasMoreAuditSessions = this.auditoria.length < this.totalAuditSessions;
    }

    this.feedbackGuardado = response.cambiosAplicados === 1
      ? 'Se guardo 1 cambio en la base de datos.'
      : `Se guardaron ${response.cambiosAplicados} cambios en la base de datos.`;
    this.modoEdicion = false;
    this.draftCells = {};
    if (this.filtroActivo === 'changed') {
      this.filtroActivo = 'all';
    }
  }

  private applySavedChanges(cambios: GuardarCalificacionCambio[]): void {
    const nextCells: CellValueMap = { ...this.savedCells };

    cambios.forEach(cambio => {
      const evaluacion = this.instanciasById.get(cambio.idIE)?.nro;
      if (!evaluacion) {
        return;
      }

      nextCells[this.cellKey(cambio.idEstudiante, evaluacion, cambio.tipoCalificacion)] = cambio.puntaje;
    });

    this.savedCells = nextCells;
  }

  private buildSavePayload(): GuardarCalificacionCambio[] {
    const cambios: GuardarCalificacionCambio[] = [];

    for (const estudiante of this.estudiantes) {
      for (const evaluacion of this.evaluaciones) {
        if (!evaluacion.instancia) {
          continue;
        }

        for (const tipo of this.tiposCalificacion) {
          if (!this.isSlotEnabled(evaluacion.numero, tipo)) {
            continue;
          }

          const draft = this.parseDraftValue(
            this.draftCells[this.cellKey(estudiante.idEstudiante, evaluacion.numero, tipo)] ?? '',
          );
          const saved = this.getSavedCellValue(estudiante.idEstudiante, evaluacion.numero, tipo);

          if (draft === 'invalid' || draft === saved) {
            continue;
          }

          cambios.push({
            idIE: evaluacion.instancia.idIE,
            idEstudiante: estudiante.idEstudiante,
            tipoCalificacion: tipo,
            puntaje: draft,
          });
        }
      }
    }

    return cambios;
  }

  private parseDraftValue(rawValue: string): DraftParsedValue {
    const trimmed = rawValue.trim();
    if (!trimmed) return null;
    if (!/^\d+$/.test(trimmed)) return 'invalid';

    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10) {
      return 'invalid';
    }

    return parsed;
  }

  private recomputeEstadoAvisos(): void {
    const pendientesConNotas = this.instancias.filter(instancia =>
      instancia.estado !== 'Evaluada' && this.instanciaTieneNotas(instancia),
    ).length;
    const evaluadasSinNotas = this.instancias.filter(instancia =>
      instancia.estado === 'Evaluada' && !this.instanciaTieneNotas(instancia),
    ).length;

    this.estadoAvisoPendienteConNotas = pendientesConNotas > 0
      ? `Hay ${pendientesConNotas} IE${pendientesConNotas === 1 ? '' : 's'} con notas cargadas pero todavía no marcadas como evaluadas.`
      : '';

    this.estadoAvisoEvaluadaSinNotas = evaluadasSinNotas > 0
      ? `Hay ${evaluadasSinNotas} Instancia Evaluativa${evaluadasSinNotas === 1 ? '' : 's'} evaluada${evaluadasSinNotas === 1 ? '' : 's'} pero sin notas asociadas todavía.`
      : '';
  }

  private instanciaTieneNotas(instancia: InstanciaEvaluativaResumen): boolean {
    return this.estudiantes.some(estudiante =>
      this.tiposCalificacion.some(tipo => this.getSavedCellValue(estudiante.idEstudiante, instancia.nro, tipo) !== null),
    );
  }

  private cellKey(idEstudiante: string, evaluacion: number, tipo: TipoCalificacion): string {
    return `${idEstudiante}|${evaluacion}|${tipo}`;
  }

  private slotKey(evaluacion: number, tipo: TipoCalificacion): string {
    return `${evaluacion}|${tipo}`;
  }

  private getSavedCellValue(idEstudiante: string, evaluacion: number, tipo: TipoCalificacion): number | null {
    return this.getSavedCellValueByKey(this.cellKey(idEstudiante, evaluacion, tipo));
  }

  private getSavedCellValueByKey(key: string): number | null {
    return key in this.savedCells ? this.savedCells[key] : null;
  }

  private buildStudentRows(estudiantes: GestionManualEstudiante[]): CalificacionesStudentRow[] {
    return estudiantes.map(estudiante => {
      const nombreCompleto = `${estudiante.apellido}, ${estudiante.nombre}`;
      return {
        idEstudiante: estudiante.idEstudiante,
        nombreCompleto,
        documento: estudiante.documento,
        searchText: `${nombreCompleto} ${estudiante.documento}`.toLowerCase(),
      };
    });
  }

  private buildSavedCells(
    calificaciones: CalificacionVigente[],
    estudiantes: GestionManualEstudiante[],
  ): CellValueMap {
    const validStudentIds = new Set(estudiantes.map(estudiante => estudiante.idEstudiante));
    const cells: CellValueMap = {};

    calificaciones.forEach(calificacion => {
      const instancia = this.instanciasById.get(calificacion.idIE);
      if (!instancia || !validStudentIds.has(calificacion.idEstudiante)) {
        return;
      }

      cells[this.cellKey(calificacion.idEstudiante, instancia.nro, calificacion.tipoCalificacion)] = calificacion.puntaje;
    });

    return cells;
  }

  private computeLastUpdatedAt(calificaciones: CalificacionVigente[]): string | null {
    const timestamps = calificaciones
      .map(calificacion => Date.parse(calificacion.fechaCarga))
      .filter(timestamp => !Number.isNaN(timestamp));

    if (timestamps.length === 0) {
      return null;
    }

    return new Date(Math.max(...timestamps)).toISOString();
  }

  private toDraftCells(cells: CellValueMap): Record<string, string> {
    return Object.fromEntries(
      Object.entries(cells).map(([key, value]) => [key, value === null ? '' : String(value)]),
    );
  }

  private mapAuditSession(session: AuditoriaCalificacionSesionApi): CalificacionAuditSession {
    return {
      id: session.idSesionAuditoria,
      timestamp: session.timestamp,
      docente: session.docente,
      origen: session.origen,
      cantidadCambios: session.cantidadCambios,
      rutaArchivoImportacion: session.rutaArchivoImportacion,
      cambios: session.cambios.map(change => ({
        id: change.idDetalleAuditoria,
        idEstudiante: change.idEstudiante,
        estudiante: change.estudiante,
        documento: change.documento,
        evaluacion: change.evaluacion,
        tipo: change.tipoCalificacion,
        valorAnterior: change.valorAnterior,
        valorNuevo: change.valorNuevo,
      })),
    };
  }

  hasImportPdf(session: CalificacionAuditSession): boolean {
    return session.origen === 'Importacion' && !!session.rutaArchivoImportacion;
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      if (typeof error.error === 'string' && error.error.trim()) {
        return error.error;
      }

      if (error.error && typeof error.error === 'object') {
        const message = (error.error as { message?: unknown }).message;
        if (typeof message === 'string' && message.trim()) {
          return message;
        }
      }
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return fallback;
  }

  private buildDialogData(contexto: 'navigation' | 'cancel-edit'): CalificacionesCambiosPendientesDialogData {
    const permitirGuardar = this.canSave;
    const mensajeBase = permitirGuardar
      ? 'Tenés cambios sin guardar. Podés guardarlos o descartarlos.'
      : 'Tenés cambios sin guardar con notas inválidas. Corregilas o descartá los cambios.';

    if (contexto === 'cancel-edit') {
      return {
        titulo: 'Salir de edición',
        mensaje: `${mensajeBase} Si salís ahora, perderás lo editado.`,
        textoDescartar: 'Salir sin guardar',
        permitirGuardar,
      };
    }

    return {
      titulo: 'Salir de la pantalla',
      mensaje: `${mensajeBase} Si salís ahora, perderás lo editado.`,
      textoDescartar: 'Descartar cambios',
      permitirGuardar,
    };
  }
}
