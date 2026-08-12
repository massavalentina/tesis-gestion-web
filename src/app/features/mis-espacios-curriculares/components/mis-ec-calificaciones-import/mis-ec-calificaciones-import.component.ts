import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { MisEcItem } from '../../models/mis-ec.model';
import {
  ConfirmarImportacionPayload,
  ConfirmarImportacionResponse,
  ImportacionAnalisis,
  ImportacionConfirmacionResumen,
  ImportacionIssue,
  ImportacionRevisionCell,
  ImportacionRevisionRow,
  ImportacionSlot,
  ImportacionStudentOption,
} from '../../models/calificaciones-importacion.model';
import { CalificacionesImportacionService } from '../../services/calificaciones-importacion.service';
import { MisEspaciosCurricularesService } from '../../services/mis-espacios-curriculares.service';

type WizardStage = 'load' | 'analysis' | 'review' | 'confirm' | 'success';
type ReviewFilter = 'all' | 'clean' | 'conflict';
type ReviewTab = 1 | 5;
type AnalysisStepStatus = 'pending' | 'active' | 'done' | 'error';

@Component({
  selector: 'app-mis-ec-calificaciones-import',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mis-ec-calificaciones-import.component.html',
  styleUrl: './mis-ec-calificaciones-import.component.scss',
})
export class MisEcCalificacionesImportComponent implements OnInit, OnDestroy {
  idEC = '';
  espacio: MisEcItem | null = null;

  loading = true;
  actionLoading = false;
  error = false;
  errorMessage = 'No se pudo abrir el importador de calificaciones.';

  stage: WizardStage = 'load';
  analysis: ImportacionAnalisis | null = null;
  confirmacionResumen: ImportacionConfirmacionResumen | null = null;
  success: ConfirmarImportacionResponse | null = null;

  selectedFile: File | null = null;
  selectedFileName = '';
  analyzeError = '';
  feedback = '';
  feedbackError = false;

  reviewFilter: ReviewFilter = 'all';
  reviewTab: ReviewTab = 1;
  reviewSearch = '';
  analysisAwaitingContinue = false;
  analysisChecklist = [
    { id: 'c1', label: 'Validando formato del PDF', status: 'pending' as AnalysisStepStatus },
    { id: 'c2', label: 'Leyendo encabezado académico', status: 'pending' as AnalysisStepStatus },
    { id: 'c3', label: 'Detectando estudiantes', status: 'pending' as AnalysisStepStatus },
    { id: 'c4', label: 'Detectando evaluaciones y notas', status: 'pending' as AnalysisStepStatus },
    { id: 'c5', label: 'Comparando contra datos existentes', status: 'pending' as AnalysisStepStatus },
  ];

  private analysisTimers: Array<ReturnType<typeof setTimeout>> = [];
  private analysisStartedAt = 0;
  private readonly analysisStepMs = 620;
  private readonly analysisMinDurationMs = 3600;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly misEcService: MisEspaciosCurricularesService,
    private readonly importService: CalificacionesImportacionService,
  ) {}

  ngOnInit(): void {
    this.idEC = this.route.snapshot.paramMap.get('idEC') ?? '';

    if (!this.idEC) {
      this.error = true;
      this.loading = false;
      this.errorMessage = 'No se encontró el espacio curricular desde el que desea importar.';
      return;
    }

    this.loadBaseContext();
  }

  ngOnDestroy(): void {
    this.clearAnalysisAnimation();
  }

  get stageIndex(): number {
    return {
      load: 1,
      analysis: 3,
      review: 4,
      confirm: 5,
      success: 5,
    }[this.stage];
  }

  get stageSubtitle(): string {
    switch (this.stage) {
      case 'load':
        return '1. Carga';
      case 'analysis':
        return '2. Análisis';
      case 'review':
        return '3. Preview y revisión';
      case 'confirm':
      case 'success':
        return '4. Confirmación';
      default:
        return '';
    }
  }

  get stageSlots(): ImportacionSlot[] {
    if (!this.analysis) return [];
    return this.analysis.slots.filter(slot =>
      this.reviewTab === 1 ? slot.evaluacionNumero <= 4 : slot.evaluacionNumero >= 5,
    );
  }

  get stageSlotGroups(): Array<{ evaluacionNumero: number; slots: ImportacionSlot[] }> {
    const groups = new Map<number, ImportacionSlot[]>();

    for (const slot of this.stageSlots) {
      const slots = groups.get(slot.evaluacionNumero) ?? [];
      slots.push(slot);
      groups.set(slot.evaluacionNumero, slots);
    }

    return Array.from(groups.entries())
      .sort(([left], [right]) => left - right)
      .map(([evaluacionNumero, slots]) => ({ evaluacionNumero, slots }));
  }

  get studentOptions(): ImportacionStudentOption[] {
    return this.analysis?.estudiantesCurso ?? [];
  }

  get filteredRows(): ImportacionRevisionRow[] {
    if (!this.analysis) return [];
    const query = this.reviewSearch.trim().toLowerCase();

    return this.analysis.rows.filter(row => {
      const filterOk = this.reviewFilter === 'all'
        || (this.reviewFilter === 'clean' && row.estado === 'clean')
        || (this.reviewFilter === 'conflict' && row.estado !== 'clean');
      if (!filterOk) return false;

      if (!query) return true;

      const associated = this.getStudentLabel(row.estudianteAsociadoId);
      return [
        row.estudiantePdf,
        associated,
        row.mensaje ?? '',
      ].join(' ').toLowerCase().includes(query);
    });
  }

  get canOpenConfirm(): boolean {
    return !!this.analysis?.puedeConfirmar;
  }

  get analysisHasFailure(): boolean {
    return this.analysisChecklist.some(step => step.status === 'error');
  }

  get visibleAnalysisChecklist(): Array<{ id: string; label: string; status: AnalysisStepStatus }> {
    if (this.analysisHasFailure) {
      return this.analysisChecklist.filter(step => step.status === 'error');
    }

    return this.analysisChecklist;
  }

  get analysisContinueLabel(): string {
    return 'Ver preview';
  }

  setTab(tab: ReviewTab): void {
    this.reviewTab = tab;
  }

  setFilter(filter: ReviewFilter): void {
    this.reviewFilter = filter;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile = file;
    this.selectedFileName = file?.name ?? '';
    this.analyzeError = '';
  }

  startAnalysis(): void {
    if (!this.selectedFile) {
      this.analyzeError = 'Seleccione un PDF exportado desde CiDi.';
      return;
    }

    this.stage = 'analysis';
    this.startAnalysisAnimation();
    this.actionLoading = true;
    this.analyzeError = '';
    this.feedback = '';
    this.feedbackError = false;

    this.importService.analizar(this.idEC, this.selectedFile).pipe(
      finalize(() => {
        this.actionLoading = false;
      }),
    ).subscribe({
      next: analysis => {
        this.finishAnalysisSuccess(analysis);
      },
      error: error => {
        this.finishAnalysisError(this.extractErrorMessage(
          error,
          'No se pudo analizar el PDF.',
        ));
      },
    });
  }

  reanalizar(): void {
    if (!this.selectedFile) {
      this.feedback = 'Seleccione nuevamente el PDF de CiDi para reanalizar.';
      this.feedbackError = true;
      this.resetToLoadStage();
      return;
    }

    this.stage = 'analysis';
    this.startAnalysisAnimation();
    this.actionLoading = true;
    this.feedback = '';
    this.feedbackError = false;
    this.analyzeError = '';

    this.importService.analizar(this.idEC, this.selectedFile).pipe(
      finalize(() => {
        this.actionLoading = false;
      }),
    ).subscribe({
      next: analysis => {
        this.finishAnalysisSuccess(analysis);
      },
      error: error => {
        this.finishAnalysisError(this.extractErrorMessage(
          error,
          'No se pudo volver a analizar el PDF.',
        ));
      },
    });
  }

  abrirConfirmacion(): void {
    if (!this.analysis) return;

    this.recomputeAnalysisStateLocally();
    if (!this.analysis.puedeConfirmar) {
      this.stage = 'review';
      this.feedback = 'Todavía quedan decisiones pendientes en la tabla. Revise las celdas marcadas antes de continuar.';
      this.feedbackError = true;
      return;
    }

    this.confirmacionResumen = this.analysis.resumenConfirmacionInicial;
    this.feedback = '';
    this.feedbackError = false;
    this.stage = 'confirm';
  }

  confirmarImportacion(): void {
    if (!this.analysis || !this.selectedFile) return;

    this.recomputeAnalysisStateLocally();
    if (!this.analysis.puedeConfirmar) {
      this.feedback = 'Todavía quedan conflictos o asociaciones pendientes por resolver.';
      this.feedbackError = true;
      this.stage = 'review';
      return;
    }

    this.actionLoading = true;
    this.feedback = '';
    this.feedbackError = false;

    this.importService.confirmar(this.idEC, this.selectedFile, this.buildConfirmPayload()).pipe(
      finalize(() => {
        this.actionLoading = false;
      }),
    ).subscribe({
      next: response => {
        this.success = response;
        this.stage = 'success';
      },
      error: error => {
        this.feedback = this.extractErrorMessage(
          error,
          'No se pudo completar la importación.',
        );
        this.feedbackError = true;
      },
    });
  }

  cancelarImportacion(): void {
    this.resetToLoadStage();
  }

  cancelarYReiniciar(): void {
    this.resetToLoadStage();
  }

  volverACalificaciones(): void {
    this.router.navigate(['/mis-espacios-curriculares', this.idEC, 'calificaciones']);
  }

  getStudentLabel(studentId: string | null): string {
    if (!studentId || !this.analysis) return 'Sin asociar';
    return this.analysis.estudiantesCurso.find(option => option.idEstudiante === studentId)?.label ?? 'Sin asociar';
  }

  getStudentOptionText(option: ImportacionStudentOption): string {
    return option.label;
  }

  getStudentOptionTitle(option: ImportacionStudentOption): string {
    return `${option.label} · DNI ${option.documento}`;
  }

  formatIssueSlot(issue: ImportacionIssue): string {
    return this.formatSlotKey(issue.slotKey);
  }

  continueAfterAnalysis(): void {
    if (!this.analysis) {
      return;
    }

    if (this.analysis.bloqueos.length > 0) {
      this.feedback = 'Corrija los bloqueos detectados y vuelva a analizar el PDF antes de continuar.';
      this.feedbackError = true;
      return;
    }

    this.analysisAwaitingContinue = false;
    this.stage = 'review';
    this.feedback = '';
    this.feedbackError = false;
  }

  getChecklistSymbol(status: AnalysisStepStatus): string {
    switch (status) {
      case 'done':
        return '✓';
      case 'error':
        return '✕';
      case 'active':
        return '…';
      case 'pending':
      default:
        return '';
    }
  }

  getRowCells(row: ImportacionRevisionRow): ImportacionRevisionCell[] {
    const visibleSlotKeys = new Set(this.stageSlots.map(slot => slot.slotKey));
    return row.cells.filter(cell => visibleSlotKeys.has(cell.slotKey));
  }

  getStudentOptionsForRow(row: ImportacionRevisionRow): ImportacionStudentOption[] {
    if (!this.analysis) return [];
    if (!row.requiereAsociacionManual) {
      return row.estudianteAsociadoId
        ? this.analysis.estudiantesCurso.filter(option => option.idEstudiante === row.estudianteAsociadoId)
        : [];
    }

    const candidateIds = new Set(row.candidatosEstudianteIds);
    return this.analysis.estudiantesCurso.filter(option => candidateIds.has(option.idEstudiante));
  }

  canEditStudentAssociation(row: ImportacionRevisionRow): boolean {
    return row.requiereAsociacionManual && this.getStudentOptionsForRow(row).length > 0;
  }

  getRowStatusClass(row: ImportacionRevisionRow): 'ok' | 'warn' | 'danger' {
    if (row.estado === 'clean') {
      return 'ok';
    }

    if (row.estado === 'review') {
      return 'warn';
    }

    return 'danger';
  }

  getRowStatusSymbol(row: ImportacionRevisionRow): string {
    return row.estado === 'clean' ? '✓' : '!';
  }

  getRowStatusTitle(row: ImportacionRevisionRow): string {
    switch (row.estado) {
      case 'clean':
        return 'Fila lista para importar';
      case 'review':
        return 'Fila con revisión pendiente';
      case 'blocking':
      default:
        return 'Fila con bloqueo pendiente';
    }
  }

  getRowStatusTooltip(row: ImportacionRevisionRow): string {
    const details = new Set<string>();

    if (row.mensaje) {
      details.add(row.mensaje);
    }

    for (const issue of row.issues ?? []) {
      if (issue.mensaje) {
        details.add(issue.mensaje);
      }
    }

    for (const cell of row.cells) {
      if ((cell.estado === 'review' || cell.estado === 'blocking' || cell.resolucion === 'pending') && cell.mensaje) {
        details.add(cell.mensaje);
      }
    }

    const status = this.getRowStatusTitle(row);
    const messages = Array.from(details);
    return messages.length > 0
      ? `${status}:\n- ${messages.join('\n- ')}`
      : status;
  }

  showRowMessage(row: ImportacionRevisionRow): boolean {
    return !!row.mensaje
      && row.mensaje.trim().toLowerCase() !== 'esta fila necesita revisión.';
  }

  getCellResolutionOptions(cell: ImportacionRevisionCell): Array<{ value: string; label: string }> {
    const options: Array<{ value: string; label: string }> = [];
    const current = (cell.resolucion?.trim().toLowerCase() ?? '');

    if (current === 'pending') {
      options.push({ value: 'pending', label: 'Elegir' });
    }

    if (cell.valorImportado !== null && (cell.valorDb === null || cell.valorImportado !== cell.valorDb)) {
      options.push({ value: 'use_imported', label: 'CiDi' });
    }

    if (cell.valorDb !== null) {
      options.push({ value: 'keep_db', label: 'Sistema' });
    }

    if (cell.valorImportado === null && cell.valorDb !== null) {
      options.push({ value: 'clear_db', label: 'Quitar' });
    }

    if (options.length === 0 && cell.valorDb === null && cell.valorImportado === null) {
      options.push({ value: 'keep_db', label: 'Sin cambios' });
    }

    return options;
  }

  canEditCellResolution(row: ImportacionRevisionRow, cell: ImportacionRevisionCell): boolean {
    if (!this.analysis) return false;
    if (!row.estudianteAsociadoId) return false;
    if (cell.estado === 'blocking') return false;
    return this.getCellResolutionOptions(cell).length > 1 || cell.resolucion === 'pending';
  }

  getCellDisplayValue(cell: ImportacionRevisionCell): number | null {
    switch (cell.resolucion?.trim().toLowerCase()) {
      case 'keep_db':
        return cell.valorDb;
      case 'use_imported':
        return cell.valorImportado;
      case 'clear_db':
        return null;
      default:
        return cell.valorFinal ?? cell.valorImportado ?? cell.valorDb ?? null;
    }
  }

  onResolutionChange(cell: ImportacionRevisionCell): void {
    switch (cell.resolucion) {
      case 'keep_db':
        cell.valorFinal = cell.valorDb;
        break;
      case 'use_imported':
        cell.valorFinal = cell.valorImportado;
        break;
      case 'clear_db':
        cell.valorFinal = null;
        break;
      default:
        break;
    }

    this.recomputeAnalysisStateLocally();
  }

  onRowStateChange(): void {
    this.recomputeAnalysisStateLocally();
  }

  trackByRowId(_: number, row: ImportacionRevisionRow): string {
    return row.rowId;
  }

  trackBySlotKey(_: number, slot: ImportacionSlot): string {
    return slot.slotKey;
  }

  trackBySlotGroup(_: number, group: { evaluacionNumero: number }): number {
    return group.evaluacionNumero;
  }

  private buildConfirmPayload(): ConfirmarImportacionPayload {
    return {
      hashArchivoSha256: this.analysis?.hashArchivoSha256 ?? '',
      rows: (this.analysis?.rows ?? []).map(row => ({
        rowId: row.rowId,
        estudianteAsociadoId: row.estudianteAsociadoId,
        cells: row.cells.map(cell => ({
          slotKey: cell.slotKey,
          resolucion: cell.resolucion,
          idCalificacionBase: cell.idCalificacionBase,
        })),
      })),
    };
  }

  private recomputeAnalysisStateLocally(): void {
    if (!this.analysis) {
      return;
    }

    for (const row of this.analysis.rows) {
      for (const cell of row.cells) {
        this.recomputeCellLocally(row, cell);
      }
    }

    this.applyLocalDuplicateConflicts(this.analysis.rows);
    this.recomputeLocalRowStates(this.analysis.rows);
    this.analysis.resumen = this.buildLocalResumen(this.analysis.rows, this.analysis.slots);
    this.analysis.resumenConfirmacionInicial = this.buildLocalConfirmacionResumen(this.analysis.rows);
    this.analysis.puedeConfirmar = this.analysis.bloqueos.length === 0 && !this.hasPendingRowsLocally(this.analysis.rows);
    this.confirmacionResumen = this.analysis.resumenConfirmacionInicial;
  }

  private recomputeCellLocally(row: ImportacionRevisionRow, cell: ImportacionRevisionCell): void {
    const slot = this.analysis?.slots.find(item => item.slotKey === cell.slotKey) ?? null;

    if (!!cell.valorImportadoRaw && cell.valorImportado === null) {
      cell.estado = 'blocking';
      cell.resolucion = 'pending';
      cell.mensaje = `El valor '${cell.valorImportadoRaw}' no se pudo interpretar como una nota válida.`;
      return;
    }

    if (!slot?.tieneEstructuraPrevia) {
      if (cell.valorImportado !== null) {
        cell.estado = 'blocking';
        cell.resolucion = 'pending';
        cell.mensaje = 'Antes de importar esta nota, debe cargar la evaluación correspondiente en la sección Evaluaciones.';
      } else {
        cell.estado = 'clean';
        cell.resolucion = 'keep_db';
        cell.valorFinal = cell.valorDb;
        cell.mensaje = null;
      }
      return;
    }

    if (!row.estudianteAsociadoId) {
      if (row.requiereAsociacionManual) {
        cell.estado = (cell.valorImportado !== null || cell.valorDb !== null) ? 'review' : 'clean';
        cell.resolucion = cell.estado === 'review' ? 'pending' : 'keep_db';
        cell.valorFinal = cell.valorImportado ?? cell.valorDb;
        cell.mensaje = cell.estado === 'review'
          ? 'Seleccione cuál de los homónimos del curso corresponde a esta fila.'
          : null;
      } else {
        cell.estado = (cell.valorImportado !== null || cell.valorDb !== null) ? 'blocking' : 'clean';
        cell.resolucion = cell.estado === 'blocking' ? 'pending' : 'keep_db';
        cell.valorFinal = cell.valorImportado ?? cell.valorDb;
        cell.mensaje = cell.estado === 'blocking'
          ? 'No se puede continuar con esta fila porque el estudiante del PDF no pertenece al curso.'
          : null;
      }
      return;
    }

    if (cell.valorImportado === null && cell.valorDb === null) {
      cell.estado = 'clean';
      cell.resolucion = 'keep_db';
      cell.valorFinal = null;
      cell.mensaje = null;
      return;
    }

    if (!slot.admiteCargaNotas && cell.valorImportado !== null) {
      if (cell.valorDb === cell.valorImportado) {
        cell.estado = 'clean';
        cell.resolucion = 'keep_db';
        cell.valorFinal = cell.valorDb;
        cell.mensaje = null;
      } else {
        cell.estado = 'blocking';
        cell.resolucion = 'pending';
        cell.valorFinal = cell.valorImportado;
        cell.mensaje = 'Antes de importar esta nota, debe marcar ese examen como evaluado en la sección Evaluaciones.';
      }
      return;
    }

    if (cell.valorImportado === null && cell.valorDb !== null) {
      switch (cell.resolucion) {
        case 'keep_db':
          cell.estado = 'clean';
          cell.valorFinal = cell.valorDb;
          cell.mensaje = null;
          break;
        case 'clear_db':
          cell.estado = 'clean';
          cell.valorFinal = null;
          cell.mensaje = null;
          break;
        default:
          cell.estado = 'review';
          cell.resolucion = 'pending';
          cell.valorFinal = cell.valorDb;
          cell.mensaje = 'CiDi no trae nota en esta celda y el sistema sí tiene una nota vigente.';
          break;
      }
      return;
    }

    if (cell.valorImportado !== null && cell.valorDb === null) {
      cell.estado = 'clean';
      cell.resolucion = 'use_imported';
      cell.valorFinal = cell.valorImportado;
      cell.mensaje = null;
      return;
    }

    if (cell.valorImportado === cell.valorDb) {
      cell.estado = 'clean';
      cell.resolucion = 'keep_db';
      cell.valorFinal = cell.valorDb;
      cell.mensaje = null;
      return;
    }

    switch (cell.resolucion) {
      case 'keep_db':
        cell.estado = 'clean';
        cell.valorFinal = cell.valorDb;
        cell.mensaje = null;
        break;
      case 'use_imported':
        cell.estado = 'clean';
        cell.valorFinal = cell.valorImportado;
        cell.mensaje = null;
        break;
      default:
        cell.estado = 'review';
        cell.resolucion = 'pending';
        cell.valorFinal = cell.valorImportado;
        cell.mensaje = `CiDi trae ${cell.valorImportado} y en el sistema ya hay cargado un ${cell.valorDb}.`;
        break;
    }
  }

  private applyLocalDuplicateConflicts(rows: ImportacionRevisionRow[]): void {
    for (const row of rows) {
      row.issues = row.issues.filter(issue =>
        issue.codigo !== 'student_duplicate_pdf_consistent' && issue.codigo !== 'student_duplicate_pdf_conflict',
      );
    }

    const duplicatedGroups = new Map<string, ImportacionRevisionRow[]>();

    for (const row of rows) {
      if (!row.estudianteAsociadoId) {
        continue;
      }

      const group = duplicatedGroups.get(row.estudianteAsociadoId) ?? [];
      group.push(row);
      duplicatedGroups.set(row.estudianteAsociadoId, group);
    }

    for (const group of duplicatedGroups.values()) {
      if (group.length < 2) {
        continue;
      }

      let hasConsistentDuplicate = false;
      const slotGroups = new Map<string, Array<{ row: ImportacionRevisionRow; cell: ImportacionRevisionCell }>>();

      for (const row of group) {
        for (const cell of row.cells) {
          const items = slotGroups.get(cell.slotKey) ?? [];
          items.push({ row, cell });
          slotGroups.set(cell.slotKey, items);
        }
      }

      for (const items of slotGroups.values()) {
        const hasImportedValueInGroup = items.some(item => this.hasPdfValue(item.cell));
        if (!hasImportedValueInGroup) {
          continue;
        }

        const finalValues = Array.from(new Set(items.map(item => this.getPdfDuplicateValue(item.cell))));

        if (finalValues.length > 1) {
          for (const item of items) {
            item.cell.estado = 'blocking';
            item.cell.resolucion = 'pending';
            item.cell.mensaje = 'El mismo estudiante aparece repetido en el PDF con valores distintos para esta evaluación.';
          }

          for (const row of group) {
            row.issues.push({
              codigo: 'student_duplicate_pdf_conflict',
              severidad: 'blocking',
              mensaje: 'El mismo estudiante aparece repetido en el PDF con notas distintas para la misma evaluación.',
              slotKey: null,
            });
          }
        } else if (items.length > 1 && finalValues.length === 1 && finalValues[0] !== null) {
          hasConsistentDuplicate = true;
        }
      }

      if (hasConsistentDuplicate) {
        for (const row of group) {
          row.issues.push({
            codigo: 'student_duplicate_pdf_consistent',
            severidad: 'info',
            mensaje: 'El mismo estudiante aparece repetido en el PDF con el mismo valor. Se consolidará automáticamente al confirmar.',
            slotKey: null,
          });
        }
      }
    }
  }

  private hasPdfValue(cell: ImportacionRevisionCell): boolean {
    return !!cell.valorImportadoRaw?.trim() || cell.valorImportado !== null;
  }

  private getPdfDuplicateValue(cell: ImportacionRevisionCell): number | null {
    return this.hasPdfValue(cell) ? cell.valorImportado : null;
  }

  private recomputeLocalRowStates(rows: ImportacionRevisionRow[]): void {
    for (const row of rows) {
      if (!row.estudianteAsociadoId) {
        const hasBlockingIssue = (row.issues ?? []).some(issue => issue.severidad === 'blocking');
        row.estado = hasBlockingIssue ? 'blocking' : row.requiereAsociacionManual ? 'review' : 'blocking';
        row.mensaje = hasBlockingIssue
          ? ''
          : row.requiereAsociacionManual
            ? 'Debe seleccionar a cuál de los homónimos del curso corresponde esta fila.'
            : 'No se pudo asociar esta fila a un estudiante del curso.';
        continue;
      }

      const hasBlockingIssue = (row.issues ?? []).some(issue => issue.severidad === 'blocking')
        || row.cells.some(cell => cell.estado === 'blocking');

      if (hasBlockingIssue) {
        row.estado = 'blocking';
        row.mensaje = '';
        continue;
      }

      const hasReviewIssue = row.cells.some(cell => cell.resolucion === 'pending' || cell.estado === 'review');
      row.estado = hasReviewIssue ? 'review' : 'clean';
      row.mensaje = hasReviewIssue ? 'Esta fila necesita revisión.' : null;
    }
  }

  private hasPendingRowsLocally(rows: ImportacionRevisionRow[]): boolean {
    return rows.some(row => row.estado !== 'clean');
  }

  private buildLocalResumen(rows: ImportacionRevisionRow[], slots: ImportacionSlot[]) {
    const noteCells = rows.flatMap(row => row.cells.map(cell => ({ row, cell })));

    return {
      estudiantesDetectados: rows.length,
      estudiantesSinConflicto: rows.filter(row => row.estado === 'clean').length,
      estudiantesConConflicto: rows.filter(row => row.estado !== 'clean').length,
      evaluacionesDetectadasConNotas: slots.filter(slot => slot.tieneNotasImportadas).length,
      notasNuevas: noteCells.filter(item => item.cell.valorImportado !== null && item.cell.valorDb === null).length,
      notasYaExistentes: noteCells.filter(item => item.cell.valorDb !== null).length,
      conflictosDeNotas: noteCells.filter(item => item.cell.estado !== 'clean' && (item.cell.valorImportado !== null || item.cell.valorDb !== null)).length,
      notasInvalidas: noteCells.filter(item => !!item.cell.valorImportadoRaw && item.cell.valorImportado === null).length,
      pendientesDeRevision: noteCells.filter(item => item.cell.resolucion === 'pending').length + rows.filter(row => row.estado === 'blocking').length,
    };
  }

  private buildLocalConfirmacionResumen(rows: ImportacionRevisionRow[]): ImportacionConfirmacionResumen {
    const noteCells = rows
      .filter(row => !!row.estudianteAsociadoId)
      .flatMap(row => row.cells);

    return {
      estudiantesValidados: rows.filter(row => !!row.estudianteAsociadoId).length,
      notasNuevas: noteCells.filter(cell => cell.resolucion === 'use_imported' && cell.valorDb === null && cell.valorImportado !== null).length,
      notasExistentesMantenidas: noteCells.filter(cell =>
        cell.resolucion === 'keep_db'
        && cell.valorDb !== null
        && (cell.valorImportado === null || cell.valorImportado !== cell.valorDb)).length,
      notasReemplazadas: noteCells.filter(cell => cell.resolucion === 'use_imported' && cell.valorDb !== null && cell.valorImportado !== null && cell.valorImportado !== cell.valorDb).length,
      notasQuitadas: noteCells.filter(cell => cell.resolucion === 'clear_db' && cell.valorDb !== null).length,
    };
  }

  private loadBaseContext(): void {
    this.loading = true;

    this.misEcService.getMisEspaciosCurriculares().pipe(
      catchError(() => of([])),
      finalize(() => {
        this.loading = false;
      }),
    ).subscribe(ecs => {
      this.espacio = ecs.find(item => item.idEC === this.idEC) ?? null;
      if (!this.espacio) {
        this.error = true;
        this.errorMessage = 'No se encontró el espacio curricular.';
        return;
      }

      this.stage = 'load';
    });
  }

  private resetToLoadStage(): void {
    this.clearAnalysisAnimation();
    this.analysis = null;
    this.confirmacionResumen = null;
    this.success = null;
    this.stage = 'load';
    this.selectedFile = null;
    this.selectedFileName = '';
    this.analyzeError = '';
    this.feedback = '';
    this.feedbackError = false;
    this.analysisAwaitingContinue = false;
    this.reviewFilter = 'all';
    this.reviewTab = 1;
    this.reviewSearch = '';
  }

  private startAnalysisAnimation(): void {
    this.clearAnalysisAnimation();
    this.analysisStartedAt = Date.now();
    this.analysisChecklist = this.analysisChecklist.map(item => ({ ...item, status: 'pending' as AnalysisStepStatus }));
    this.setChecklistActive(0);

    for (let index = 1; index < this.analysisChecklist.length; index++) {
      const timer = setTimeout(() => {
        this.setChecklistActive(index);
      }, this.analysisStepMs * index);

      this.analysisTimers.push(timer);
    }
  }

  private clearAnalysisAnimation(): void {
    for (const timer of this.analysisTimers) {
      clearTimeout(timer);
    }

    this.analysisTimers = [];
    this.analysisChecklist = this.analysisChecklist.map(item => ({ ...item, status: 'pending' as AnalysisStepStatus }));
  }

  private finishAnalysisSuccess(analysis: ImportacionAnalisis): void {
    const waitMs = Math.max(0, this.analysisMinDurationMs - (Date.now() - this.analysisStartedAt));

    const timer = setTimeout(() => {
      this.analysis = analysis;
      this.confirmacionResumen = analysis.resumenConfirmacionInicial;
      this.analyzeError = '';

      const failureStep = this.getFailureStepIndexFromDetail(analysis);
      if (failureStep !== null) {
        this.setChecklistError(failureStep);
      } else {
        this.markChecklistDone();
      }

      this.analysisAwaitingContinue = true;
      this.stage = 'analysis';
    }, waitMs);

    this.analysisTimers.push(timer);
  }

  private finishAnalysisError(message: string): void {
    const waitMs = Math.max(0, this.analysisMinDurationMs - (Date.now() - this.analysisStartedAt));

    const timer = setTimeout(() => {
      this.setChecklistError(this.getFailureStepIndexFromMessage(message));
      this.analyzeError = message;
      this.analysis = null;
      this.confirmacionResumen = null;
      this.analysisAwaitingContinue = false;
      this.stage = 'analysis';
    }, waitMs);

    this.analysisTimers.push(timer);
  }

  private setChecklistActive(index: number): void {
    this.analysisChecklist = this.analysisChecklist.map((item, currentIndex) => {
      if (currentIndex < index) {
        return { ...item, status: 'done' as AnalysisStepStatus };
      }

      if (currentIndex === index) {
        return { ...item, status: 'active' as AnalysisStepStatus };
      }

      return { ...item, status: 'pending' as AnalysisStepStatus };
    });
  }

  private setChecklistError(index: number): void {
    this.clearAnalysisTimersOnly();
    this.analysisChecklist = this.analysisChecklist.map((item, currentIndex) => {
      if (currentIndex < index) {
        return { ...item, status: 'done' as AnalysisStepStatus };
      }

      if (currentIndex === index) {
        return { ...item, status: 'error' as AnalysisStepStatus };
      }

      return { ...item, status: 'pending' as AnalysisStepStatus };
    });
  }

  private markChecklistDone(): void {
    this.clearAnalysisTimersOnly();
    this.analysisChecklist = this.analysisChecklist.map(item => ({ ...item, status: 'done' as AnalysisStepStatus }));
  }

  private clearAnalysisTimersOnly(): void {
    for (const timer of this.analysisTimers) {
      clearTimeout(timer);
    }

    this.analysisTimers = [];
  }

  private getFailureStepIndexFromDetail(analysis: ImportacionAnalisis): number | null {
    if (!analysis.bloqueos.length) {
      return null;
    }

    const joinedMessages = analysis.bloqueos
      .map(issue => `${issue.slotKey ?? ''} ${issue.mensaje}`)
      .join(' ')
      .toLowerCase();

    return this.getFailureStepIndexFromText(joinedMessages);
  }

  private getFailureStepIndexFromMessage(message: string): number {
    return this.getFailureStepIndexFromText(message.toLowerCase());
  }

  private getFailureStepIndexFromText(text: string): number {
    if (/(pdf|formato|archivo|cidi|encabezado)/.test(text)) {
      return 0;
    }

    if (/(curso|division|división|lectivo|espacio curricular|espacio|anio|año)/.test(text)) {
      return 1;
    }

    if (/(estudiante|alumno|fila|nomina|nómina)/.test(text)) {
      return 2;
    }

    if (/(evaluacion|evaluación|eval|nota invalida|nota inválida|columna|r1|r2|n\b)/.test(text)) {
      return 3;
    }

    return 4;
  }

  private formatSlotKey(slotKey: string | null): string {
    if (!slotKey) return '';

    const match = slotKey.match(/^E?(\d+)[_\-\s>]+(N|R1|R2)$/i);
    if (match) {
      return `E${match[1]} > ${match[2].toUpperCase()}`;
    }

    return slotKey.replace(/_/g, ' > ');
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      if (typeof error.error === 'string' && error.error.trim()) {
        return error.error;
      }

      const fetchText = error.error?.text;
      if (typeof fetchText === 'string' && fetchText.trim()) {
        return fetchText;
      }

      if (error.error?.message) {
        return error.error.message;
      }

      if (typeof error.message === 'string' && error.message.trim()) {
        const quotedTextMatch = error.message.match(/"([^"]+)"/);
        if (quotedTextMatch?.[1]) {
          return quotedTextMatch[1];
        }
      }
    }

    return fallback;
  }
}
