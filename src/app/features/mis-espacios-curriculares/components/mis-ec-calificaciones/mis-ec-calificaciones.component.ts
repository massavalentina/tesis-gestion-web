import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { catchError, finalize, forkJoin, lastValueFrom, map, of } from 'rxjs';
import { EChartsOption } from 'echarts';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { AuthService } from '../../../auth/services/auth.service';
import { PdfReporteService } from '../../../../core/services/pdf-reporte.service';
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
  ReporteAlumno,
  ReporteEstadoFinal,
  ReporteResumenGlobal,
  ReporteVariacionCalificacionesGlobal,
  buildCalificacionesVariacionReport,
  buildCalificacionesReport,
} from '../../utils/calificaciones-reporte.utils';
import {
  CalificacionesCambiosPendientesDialogComponent,
  CalificacionesCambiosPendientesDialogData,
  CalificacionesCambiosPendientesDialogResult,
} from '../calificaciones-cambios-pendientes-dialog/calificaciones-cambios-pendientes-dialog.component';
import { CalificacionesService } from '../../services/calificaciones.service';
import { MisEspaciosCurricularesService } from '../../services/mis-espacios-curriculares.service';

type FiltroEstado = 'all' | 'without-notes' | 'changed';
type TabId = 1 | 5;
type ViewMode = 'read' | 'edit' | 'report';
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
  resultadoOperacion: string;
  avisoBreve: string | null;
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

interface ReporteVariacionSerieVista {
  idEstudiante: string;
  nombreCompleto: string;
  label: string;
  color: string;
  valores: Array<number | null>;
}

const REPORT_VARIATION_COLORS = [
  '#173f85',
  '#1f5eb6',
  '#2f74d0',
  '#3f86dc',
  '#4e97e5',
  '#63a9ec',
  '#7bb9f1',
  '#94c8f6',
  '#aad6fa',
  '#bfdffb',
  '#d1e8fd',
  '#e2f0fe',
] as const;

echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  CanvasRenderer,
]);

@Component({
  selector: 'app-mis-ec-calificaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
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
  readonly reportLegendPrimaryItems = [
    { key: 'aprobado', label: 'Aprobado: Nota Final >= 7' },
    { key: 'desaprobado_tema', label: 'Desaprobado por Tema: Nota Final >= 7 pero alguna eval no supera 7' },
    { key: 'desaprobado', label: 'Desaprobado: Nota Final < 7' },
  ] as const;
  readonly reportLegendSecondaryItems = [
    { key: 'bloque_rojo', label: 'Bloque rojo claro: ninguna de las 3 notas supera el 7' },
    { key: 'bloque_gris', label: 'Bloque gris claro: evaluación con recuperatorio cargado' },
  ] as const;
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
  exportingPdf = false;
  idEC = '';
  errorMessage = 'No se pudieron cargar las calificaciones de este espacio curricular.';

  busqueda = '';
  filtroActivo: FiltroEstado = 'all';
  tabActivo: TabId = 1;
  viewMode: ViewMode = 'read';
  pageSize = 10;
  pageIndex = 0;
  auditPageIndex = 0;

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
  reportActionError = '';

  auditoria: CalificacionAuditSession[] = [];
  expandedAuditSessions: Record<string, boolean> = {};
  totalAuditSessions = 0;
  hasMoreAuditSessions = false;
  reportRowsByStudentId: Record<string, ReporteAlumno> = {};
  reportSummary: ReporteResumenGlobal | null = null;
  reportVariationSeries: ReporteVariacionSerieVista[] = [];
  reportVariationOptions: EChartsOption = {};
  reportVariationSubtitle = '';

  private savedCells: CellValueMap = {};
  private draftCells: Record<string, string> = {};
  private invalidCellMap: Record<string, boolean> = {};
  private rowHasAnyValueMap: Record<string, boolean> = {};
  private rowHasChangesMap: Record<string, boolean> = {};
  private slotEnabledMap: Record<string, boolean> = {};
  private lastUpdatedAt: string | null = null;
  private instanciasByNumero = new Map<number, InstanciaEvaluativaResumen>();
  private instanciasById = new Map<string, InstanciaEvaluativaResumen>();
  private reportChartInstance: any = null;
  private reportHoveredStudentId: string | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly misEcService: MisEspaciosCurricularesService,
    private readonly calificacionesService: CalificacionesService,
    private readonly dialog: MatDialog,
    private readonly pdfReporteService: PdfReporteService,
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

  get modoEdicion(): boolean {
    return this.viewMode === 'edit';
  }

  get modoReporte(): boolean {
    return this.viewMode === 'report';
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
    const start = this.auditPageIndex * this.auditSessionPageSize;
    return this.auditoria.slice(start, start + this.auditSessionPageSize);
  }

  get auditTotalPages(): number {
    return Math.max(1, Math.ceil(this.totalAuditSessions / this.auditSessionPageSize));
  }

  get auditRangeLabel(): string {
    if (this.totalAuditSessions === 0) {
      return 'Sin resultados';
    }

    const start = this.auditPageIndex * this.auditSessionPageSize + 1;
    const end = Math.min(start + this.sesionesAuditoriaVisibles.length - 1, this.totalAuditSessions);
    return `Mostrando ${start}-${end} de ${this.totalAuditSessions}`;
  }

  get canGoToNextAuditPage(): boolean {
    if (this.auditLoadingMore) {
      return false;
    }

    if (this.auditPageIndex < this.auditTotalPages - 1) {
      return true;
    }

    return false;
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
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  }

  formatAuditValue(value: number | null): string {
    return value === null ? '—' : String(value);
  }

  getAuditChangeLabel(change: CalificacionAuditChange, origen: string): string {
    const isImportacion = origen === 'Importacion';

    switch (change.resultadoOperacion) {
      case 'Alta':
        return isImportacion ? 'Nota nueva' : 'Primera carga';
      case 'Baja':
        return 'Nota quitada';
      case 'ConservadaConflicto':
        return 'Nota del sistema conservada';
      case 'Reemplazo':
        return isImportacion ? 'Nota CiDi aplicada' : 'Corrección';
      default:
        return 'Corrección';
    }
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

  toggleModoReporte(): void {
    if (this.modoReporte) {
      this.volverAVistaNormal();
      return;
    }

    void this.activarReporte();
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

  goToPreviousAuditPage(): void {
    if (this.auditPageIndex === 0 || this.auditLoadingMore) {
      return;
    }

    this.auditPageIndex -= 1;
  }

  async goToNextAuditPage(): Promise<void> {
    if (!this.canGoToNextAuditPage) {
      return;
    }

    const nextPageIndex = this.auditPageIndex + 1;
    const requiredLoadedItems = (nextPageIndex + 1) * this.auditSessionPageSize;

    if (this.auditoria.length < requiredLoadedItems && this.hasMoreAuditSessions) {
      const loaded = await this.loadMoreAuditSessions();
      if (!loaded && this.auditoria.length < requiredLoadedItems) {
        return;
      }
    }

    if (nextPageIndex < this.auditTotalPages) {
      this.auditPageIndex = nextPageIndex;
    }
  }

  activarEdicion(): void {
    this.viewMode = 'edit';
    this.feedbackGuardado = '';
    this.saveError = '';
    this.reportActionError = '';
    this.draftCells = this.toDraftCells(this.savedCells);
    if (this.filtroActivo === 'changed') {
      this.filtroActivo = 'all';
    }
    this.recomputeDerivedState();
  }

  async activarReporte(): Promise<void> {
    if (this.modoReporte) {
      return;
    }

    if (this.tieneCambiosSinGuardar()) {
      const puedeCambiar = await this.confirmarSalidaConCambios('switch-view');
      if (!puedeCambiar) {
        return;
      }

      if (this.modoEdicion) {
        return;
      }
    }

    this.viewMode = 'report';
    this.feedbackGuardado = '';
    this.saveError = '';
    this.reportActionError = '';
    this.recomputeDerivedState();
  }

  volverAVistaNormal(): void {
    if (!this.modoReporte) {
      return;
    }

    this.viewMode = 'read';
    this.reportActionError = '';
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

  async exportarReportePdf(): Promise<void> {
    if (!this.modoReporte || !this.espacio || this.estudiantes.length === 0 || !this.reportSummary || this.exportingPdf) {
      return;
    }

    this.exportingPdf = true;
    this.reportActionError = '';

    try {
      await this.pdfReporteService.exportarReporteCalificacionesEspacio({
        cursoLabel: this.formatCurso(this.espacio.anioNumero, this.espacio.division),
        nombreEspacio: this.espacio.nombreMateria,
        anioLectivo: this.espacio.anioLectivo,
        docenteLabel: this.docenteActualLabel,
        totalEstudiantes: this.estudiantes.length,
        evaluaciones: this.evaluaciones.map(evaluacion => ({
          numero: evaluacion.numero,
          label: evaluacion.label,
          tieneEstructura: this.evaluacionTieneEstructura(evaluacion.numero),
        })),
        estudiantes: this.estudiantes.map(estudiante => {
          const reporte = this.reportRowsByStudentId[estudiante.idEstudiante];
          return {
            estudiante: estudiante.nombreCompleto,
            documento: estudiante.documento,
            notaFinal: reporte?.notaFinal ?? null,
            estadoFinal: reporte?.estadoFinal ?? 'desaprobado',
            evaluaciones: this.evaluaciones.map(evaluacion => ({
              numero: evaluacion.numero,
              n: this.getSavedCellValue(estudiante.idEstudiante, evaluacion.numero, 'N'),
              r1: this.getSavedCellValue(estudiante.idEstudiante, evaluacion.numero, 'R1'),
              r2: this.getSavedCellValue(estudiante.idEstudiante, evaluacion.numero, 'R2'),
              mejorNota: reporte?.evaluaciones[evaluacion.numero]?.mejorNota ?? null,
              usoRecuperatorio: reporte?.evaluaciones[evaluacion.numero]?.usoRecuperatorio ?? false,
              apruebaTema: reporte?.evaluaciones[evaluacion.numero]?.apruebaTema ?? false,
              sinNotas: reporte?.evaluaciones[evaluacion.numero]?.sinNotas ?? true,
              tieneEstructura: reporte?.evaluaciones[evaluacion.numero]?.tieneEstructura ?? false,
            })),
          };
        }),
        summary: this.reportSummary,
      });
    } catch (error) {
      this.reportActionError = this.extractErrorMessage(
        error,
        'No se pudo exportar el PDF del reporte de calificaciones.',
      );
    } finally {
      this.exportingPdf = false;
    }
  }

  tieneCambiosSinGuardar(): boolean {
    return this.modoEdicion && Object.values(this.rowHasChangesMap).some(hasChanges => hasChanges);
  }

  async confirmarSalidaConCambios(contexto: 'navigation' | 'cancel-edit' | 'switch-view'): Promise<boolean> {
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
    this.viewMode = 'read';
    this.feedbackGuardado = '';
    this.saveError = '';
    this.reportActionError = '';
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

  getReportCellClasses(idEstudiante: string, evaluacion: number): Record<string, boolean> {
    if (!this.modoReporte) {
      return {};
    }

    const reporte = this.reportRowsByStudentId[idEstudiante]?.evaluaciones[evaluacion];
    if (!reporte?.tieneEstructura) {
      return {};
    }

    return {
      'report-grade-cell': true,
      'report-grade-cell--failed': !reporte.apruebaTema,
      'report-grade-cell--recovery': reporte.apruebaTema && reporte.usoRecuperatorio,
      'report-grade-cell--neutral': reporte.apruebaTema && !reporte.usoRecuperatorio,
    };
  }

  getReportFinalLabel(idEstudiante: string): string {
    return this.formatReportAverage(this.reportRowsByStudentId[idEstudiante]?.notaFinal ?? null);
  }

  getReportEstadoLabel(idEstudiante: string): string {
    return this.estadoReporteLabel(this.reportRowsByStudentId[idEstudiante]?.estadoFinal ?? 'desaprobado');
  }

  getReportEstadoClasses(idEstudiante: string): Record<string, boolean> {
    const estado = this.reportRowsByStudentId[idEstudiante]?.estadoFinal ?? 'desaprobado';
    return {
      'report-status': true,
      'report-status--approved': estado === 'aprobado',
      'report-status--topic': estado === 'desaprobado_tema',
      'report-status--failed': estado === 'desaprobado',
    };
  }

  getReportSummaryEvaluationValue(kind: 'average' | 'recoveries' | 'passing', evaluacion: number): string {
    if (!this.reportSummary || !this.evaluacionTieneEstructura(evaluacion)) {
      return '—';
    }

    switch (kind) {
      case 'average':
        return this.formatReportAverage(this.reportSummary.promedioPorEvaluacion[evaluacion] ?? null);
      case 'recoveries':
        return this.formatReportPercentage(this.reportSummary.porcentajeRecuperatoriosPorEvaluacion[evaluacion] ?? 0);
      case 'passing':
        return this.formatReportPercentage(this.reportSummary.porcentajeAprobadasPorEvaluacion[evaluacion] ?? 0);
      default:
        return '—';
    }
  }

  getReportSummaryFinalValue(kind: 'average' | 'recoveries' | 'passing'): string {
    if (!this.reportSummary) {
      return '—';
    }

    switch (kind) {
      case 'average':
        return this.formatReportAverage(this.reportSummary.promedioFinal);
      case 'recoveries':
        return this.formatReportPercentage(this.reportSummary.porcentajeRecuperatoriosFinal);
      case 'passing':
        return this.formatReportPercentage(this.reportSummary.porcentajeAprobadosFinal);
      default:
        return '—';
    }
  }

  getReportStudentColor(idEstudiante: string): string {
    return this.reportVariationSeries.find(serie => serie.idEstudiante === idEstudiante)?.color
      ?? REPORT_VARIATION_COLORS[0];
  }

  onReportChartInit(instance: any): void {
    this.reportChartInstance = instance;
  }

  onReportStudentHover(idEstudiante: string | null): void {
    if (!this.reportChartInstance) {
      return;
    }

    if (this.reportHoveredStudentId && this.reportHoveredStudentId !== idEstudiante) {
      const previous = this.reportVariationSeries.find(item => item.idEstudiante === this.reportHoveredStudentId);
      if (previous) {
        this.reportChartInstance.dispatchAction({
          type: 'downplay',
          seriesName: previous.label,
        });
      }
    }

    if (!idEstudiante) {
      if (this.reportHoveredStudentId) {
        const previous = this.reportVariationSeries.find(item => item.idEstudiante === this.reportHoveredStudentId);
        if (previous) {
          this.reportChartInstance.dispatchAction({
            type: 'downplay',
            seriesName: previous.label,
          });
        }
      }
      this.reportHoveredStudentId = null;
      return;
    }

    const serie = this.reportVariationSeries.find(item => item.idEstudiante === idEstudiante);
    if (!serie) {
      this.reportHoveredStudentId = null;
      return;
    }

    this.reportHoveredStudentId = idEstudiante;
    this.reportChartInstance.dispatchAction({
      type: 'highlight',
      seriesName: serie.label,
    });
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
    this.reportActionError = '';

    forkJoin({
      espacio: this.misEcService.getMisEspaciosCurriculares().pipe(
        map(espacios => espacios.find(espacio => espacio.idEC === this.idEC) ?? null),
      ),
      instancias: this.calificacionesService.getInstancias(this.idEC),
      estudiantes: this.calificacionesService.getEstudiantes(this.idEC),
      calificaciones: this.calificacionesService.getCalificacionesVigentes(this.idEC),
      auditoria: this.calificacionesService.getAuditoria(this.idEC, 0, this.auditSessionPageSize).pipe(
        catchError(() => {
          this.auditWarning = 'No se pudo cargar la auditoría persistida. Puede continuar trabajando con la tabla.';
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

      this.slotEnabledMap[this.slotKey(evaluacion.numero, 'N')] = instancia.archivos.notaOriginal?.puedeCargarNotas === true;
      this.slotEnabledMap[this.slotKey(evaluacion.numero, 'R1')] = instancia.archivos.recuperatorio1?.puedeCargarNotas === true;
      this.slotEnabledMap[this.slotKey(evaluacion.numero, 'R2')] = instancia.archivos.recuperatorio2?.puedeCargarNotas === true;
    });

    this.refreshVisibleEvaluaciones();
  }

  private refreshVisibleEvaluaciones(): void {
    this.evaluacionesVisibles = this.tabActivo === 1
      ? this.evaluaciones.slice(0, 4)
      : this.evaluaciones.slice(4, 8);
    this.totalColumnasTabla = 2 + (this.evaluacionesVisibles.length * this.tiposCalificacion.length) + (this.modoReporte ? 2 : 0);
  }

  private recomputeDerivedState(): void {
    this.refreshVisibleEvaluaciones();
    this.recomputeRowState();
    this.recomputeReportState();
    this.recomputeReportVariationState();
    this.refreshTableState();
    this.recomputeEstadoAvisos();
  }

  private recomputeReportState(): void {
    const report = buildCalificacionesReport(
      this.estudiantes,
      this.evaluaciones,
      (idEstudiante, evaluacion, tipo) => this.getSavedCellValue(idEstudiante, evaluacion, tipo),
      (evaluacion, tipo) => this.isSlotEnabled(evaluacion, tipo),
    );

    this.reportRowsByStudentId = report.rowsByStudentId;
    this.reportSummary = report.summary;
  }

  private recomputeReportVariationState(): void {
    const report = buildCalificacionesVariacionReport(
      this.estudiantes,
      this.evaluaciones,
      (idEstudiante, evaluacion, tipo) => this.getSavedCellValue(idEstudiante, evaluacion, tipo),
      (evaluacion, tipo) => this.isSlotEnabled(evaluacion, tipo),
    );

    this.reportVariationSeries = this.estudiantes.map((estudiante, index) => {
      const serie = report.seriesByStudentId[estudiante.idEstudiante];
      return {
        idEstudiante: estudiante.idEstudiante,
        nombreCompleto: estudiante.nombreCompleto,
        label: estudiante.nombreCompleto,
        color: REPORT_VARIATION_COLORS[index % REPORT_VARIATION_COLORS.length],
        valores: this.evaluaciones.map(evaluacion => serie?.valoresPorEvaluacion[evaluacion.numero] ?? null),
      };
    });

    this.reportVariationSubtitle = this.buildReportVariationSubtitle(report);
    this.reportVariationOptions = this.buildReportVariationOptions(report);
  }

  private buildReportVariationSubtitle(report: ReporteVariacionCalificacionesGlobal): string {
    const evaluacionesVisibles = this.evaluaciones.filter(evaluacion => this.evaluacionTieneEstructura(evaluacion.numero));
    const desvios = evaluacionesVisibles
      .map(evaluacion => report.desviacionPorEvaluacion[evaluacion.numero])
      .filter((value): value is number => value !== null);
    const promedioDesvio = desvios.length > 0
      ? desvios.reduce((total, value) => total + value, 0) / desvios.length
      : 0;

    return `Serie por estudiante sobre ${evaluacionesVisibles.length} IE con banda de promedio ± desviación estándar media de ${promedioDesvio.toFixed(2)}.`;
  }

  private buildReportVariationOptions(report: ReporteVariacionCalificacionesGlobal): EChartsOption {
    const evaluacionesVisibles = this.evaluaciones.filter(evaluacion => this.evaluacionTieneEstructura(evaluacion.numero));
    const categories = evaluacionesVisibles.map(evaluacion => `IE ${evaluacion.numero}`);
    const promedioData = evaluacionesVisibles.map(evaluacion => report.promedioPorEvaluacion[evaluacion.numero] ?? null);
    const bandaInferiorData = evaluacionesVisibles.map(evaluacion => report.bandaInferiorPorEvaluacion[evaluacion.numero] ?? null);
    const bandaSuperiorData = evaluacionesVisibles.map(evaluacion => report.bandaSuperiorPorEvaluacion[evaluacion.numero] ?? null);

    const studentSeries = this.reportVariationSeries.map(serie => ({
      name: serie.nombreCompleto,
      type: 'line' as const,
      data: serie.valores,
      smooth: true,
      symbol: 'circle' as const,
      symbolSize: 4,
      showSymbol: false,
      connectNulls: false,
      lineStyle: {
        width: 1.5,
        color: serie.color,
        opacity: 0.58,
      },
      itemStyle: {
        color: serie.color,
      },
      emphasis: {
        focus: 'series' as const,
        lineStyle: {
          width: 2.5,
          opacity: 1,
        },
      },
      z: 2,
    }));

    return {
      color: this.reportVariationSeries.map(serie => serie.color),
      tooltip: {
        trigger: 'axis',
        triggerOn: 'mousemove',
        axisPointer: {
          type: 'line',
        },
        confine: true,
        backgroundColor: 'rgba(255, 255, 255, .98)',
        borderColor: '#d8e1ec',
        borderWidth: 1,
        textStyle: {
          color: '#1e293b',
          fontFamily: 'Open Sans, sans-serif',
        },
        formatter: (params: any) => {
          const items = Array.isArray(params) ? params : [params];
          const studentItem = items.find((item: any) => item?.seriesName && item.seriesName !== 'Promedio' && item.seriesName !== 'Banda');
          const axisIndex = Array.isArray(studentItem?.dataIndex) ? studentItem.dataIndex[0] : studentItem?.dataIndex;
          const evaluacion = typeof axisIndex === 'number' ? evaluacionesVisibles[axisIndex] : null;
          const value = typeof studentItem?.data === 'number' ? studentItem.data : null;
          const promedio = evaluacion ? report.promedioPorEvaluacion[evaluacion.numero] : null;
          const desvio = evaluacion ? report.desviacionPorEvaluacion[evaluacion.numero] : null;
          const bandaInferior = evaluacion ? report.bandaInferiorPorEvaluacion[evaluacion.numero] : null;
          const bandaSuperior = evaluacion ? report.bandaSuperiorPorEvaluacion[evaluacion.numero] : null;
          const title = studentItem?.seriesName ?? 'Alumno';

          return [
            `<strong>${title}</strong>`,
            evaluacion ? `IE: ${evaluacion.label}` : 'IE: —',
            value === null ? 'Nota: —' : `Nota: ${value.toFixed(2)}`,
            promedio === null ? 'Promedio: —' : `Promedio: ${promedio.toFixed(2)}`,
            desvio === null ? 'Desviacion: —' : `Desviacion estandar: ${desvio.toFixed(2)}`,
            bandaInferior === null || bandaSuperior === null
              ? 'Banda: —'
              : `Banda: ${bandaInferior.toFixed(2)} - ${bandaSuperior.toFixed(2)}`,
          ].join('<br/>');
        },
      },
      grid: {
        left: 46,
        right: 28,
        top: 28,
        bottom: 52,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: categories,
        boundaryGap: true,
        axisLine: { lineStyle: { color: '#cfd8e3' } },
        axisTick: { alignWithLabel: true },
        axisLabel: {
          color: '#64748b',
          fontSize: 11,
          margin: 12,
        },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 10,
        interval: 1,
        axisLine: { lineStyle: { color: '#cfd8e3' } },
        axisTick: { show: false },
        axisLabel: {
          color: '#64748b',
          fontSize: 11,
        },
        splitLine: {
          lineStyle: {
            color: '#e5edf5',
            type: 'dashed',
          },
        },
      },
      legend: {
        show: true,
        bottom: 0,
        left: 'center',
        icon: 'roundRect',
        itemWidth: 14,
        itemHeight: 3,
        textStyle: {
          color: '#64748b',
          fontFamily: 'Open Sans, sans-serif',
          fontSize: 11,
        },
        data: ['Promedio', 'Banda'],
      },
      series: [
        {
          name: 'Banda',
          type: 'line' as const,
          stack: 'band',
          data: bandaInferiorData,
          symbol: 'none' as const,
          lineStyle: { opacity: 0 },
          itemStyle: { opacity: 0 },
          areaStyle: { opacity: 0 },
          silent: true,
          emphasis: { disabled: true },
          z: 1,
        },
        {
          name: 'Banda',
          type: 'line' as const,
          stack: 'band',
          data: bandaSuperiorData.map((upper, index) => {
            const lower = bandaInferiorData[index];
            if (upper === null || lower === null) {
              return null;
            }

            return Math.max(0, upper - lower);
          }),
          symbol: 'none' as const,
          lineStyle: { opacity: 0 },
          itemStyle: { opacity: 0 },
          areaStyle: { color: 'rgba(60, 120, 180, .14)' },
          silent: true,
          emphasis: { disabled: true },
          z: 1,
        },
        {
          name: 'Promedio',
          type: 'line' as const,
          data: promedioData,
          smooth: true,
          symbol: 'circle' as const,
          symbolSize: 6,
          lineStyle: {
            width: 3,
            color: '#111111',
          },
          itemStyle: {
            color: '#111111',
          },
          showSymbol: true,
          z: 3,
        },
        ...studentSeries,
      ],
    };
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
      ? `Última actualización ${new Intl.DateTimeFormat('es-AR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(this.lastUpdatedAt))}`
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
    this.auditPageIndex = Math.min(this.auditPageIndex, Math.max(0, this.auditTotalPages - 1));
  }

  private applySaveResponse(
    cambios: GuardarCalificacionCambio[],
    response: GuardarCalificacionesManualResponse,
  ): void {
    if (response.cambiosAplicados === 0) {
      this.feedbackGuardado = 'No se detectaron cambios nuevos para guardar.';
      this.viewMode = 'read';
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
      ? 'Se guardó 1 cambio en la base de datos.'
      : `Se guardaron ${response.cambiosAplicados} cambios en la base de datos.`;
    this.viewMode = 'read';
    this.draftCells = {};
    if (this.filtroActivo === 'changed') {
      this.filtroActivo = 'all';
    }
  }

  private async loadMoreAuditSessions(): Promise<boolean> {
    if (this.auditLoadingMore || !this.hasMoreAuditSessions) {
      return false;
    }

    this.auditLoadingMore = true;
    this.auditWarning = '';

    try {
      const response = await lastValueFrom(
        this.calificacionesService.getAuditoria(
          this.idEC,
          this.auditoria.length,
          this.auditSessionPageSize,
        ),
      );
      this.applyAuditResponse(response, true);
      return true;
    } catch {
      this.auditWarning = 'No se pudo cargar más historial de cambios.';
      return false;
    } finally {
      this.auditLoadingMore = false;
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
      (instancia.estadoGeneralIe ?? instancia.estado) !== 'Evaluada' && this.instanciaTieneNotas(instancia),
    ).length;
    const evaluadasSinNotas = this.instancias.filter(instancia =>
      (instancia.estadoGeneralIe ?? instancia.estado) === 'Evaluada' && !this.instanciaTieneNotas(instancia),
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
        resultadoOperacion: change.resultadoOperacion,
        avisoBreve: change.avisoBreve,
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

  private formatReportAverage(value: number | null): string {
    return value === null ? '—' : value.toFixed(2);
  }

  private formatReportPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  private estadoReporteLabel(estado: ReporteEstadoFinal): string {
    switch (estado) {
      case 'aprobado':
        return 'Aprobado';
      case 'desaprobado_tema':
        return 'Desaprobado por Tema';
      default:
        return 'Desaprobado';
    }
  }

  private evaluacionTieneEstructura(evaluacion: number): boolean {
    return this.tiposCalificacion.some(tipo => this.isSlotEnabled(evaluacion, tipo));
  }

  private buildDialogData(contexto: 'navigation' | 'cancel-edit' | 'switch-view'): CalificacionesCambiosPendientesDialogData {
    const permitirGuardar = this.canSave;
    const mensajeBase = permitirGuardar
      ? 'Tenés cambios sin guardar. Podés guardarlos o descartarlos.'
      : 'Tenés cambios sin guardar con notas inválidas. Corregilas o descartá los cambios.';

    if (contexto === 'cancel-edit') {
      return {
        titulo: 'Salir de edición',
        mensaje: `${mensajeBase} Si sale ahora, perderá lo editado.`,
        textoDescartar: 'Salir sin guardar',
        permitirGuardar,
      };
    }

    if (contexto === 'switch-view') {
      return {
        titulo: 'Cambiar de vista',
        mensaje: `${mensajeBase} Si cambiás a la vista reporte, perderás lo editado.`,
        textoDescartar: 'Cambiar sin guardar',
        permitirGuardar,
      };
    }

    return {
      titulo: 'Salir de la pantalla',
      mensaje: `${mensajeBase} Si sale ahora, perderá lo editado.`,
      textoDescartar: 'Descartar cambios',
      permitirGuardar,
    };
  }
}
