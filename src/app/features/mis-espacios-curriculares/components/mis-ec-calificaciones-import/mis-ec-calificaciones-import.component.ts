import { CommonModule, Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, finalize, of, switchMap } from 'rxjs';
import { MisEcItem } from '../../models/mis-ec.model';
import {
  ActualizarImportacionRevisionRequest,
  ConfirmarImportacionResponse,
  ImportacionCalificacionesDetalle,
  ImportacionConfirmacion,
  ImportacionIssue,
  ImportacionRevision,
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
  idImportacion: string | null = null;
  espacio: MisEcItem | null = null;

  loading = true;
  actionLoading = false;
  error = false;
  errorMessage = 'No pudimos abrir el importador de calificaciones.';

  stage: WizardStage = 'load';
  detail: ImportacionCalificacionesDetalle | null = null;
  revision: ImportacionRevision | null = null;
  confirmacion: ImportacionConfirmacion | null = null;
  success: ConfirmarImportacionResponse | null = null;

  selectedFile: File | null = null;
  selectedFileName = '';
  analyzeError = '';
  feedback = '';

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
    private readonly location: Location,
    private readonly misEcService: MisEspaciosCurricularesService,
    private readonly importService: CalificacionesImportacionService,
  ) {}

  ngOnInit(): void {
    this.idEC = this.route.snapshot.paramMap.get('idEC') ?? '';
    this.idImportacion = this.route.snapshot.paramMap.get('idImportacion');

    if (!this.idEC) {
      this.error = true;
      this.loading = false;
      this.errorMessage = 'No se encontró el espacio curricular desde el que querés importar.';
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
        return '3. Revisión';
      case 'confirm':
        return '4. Confirmación';
      case 'success':
        return '4. Confirmación';
      default:
        return '';
    }
  }

  get stageSlots(): ImportacionSlot[] {
    if (!this.revision) return [];
    return this.revision.slots.filter(slot =>
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
    return this.revision?.estudiantesCurso ?? [];
  }

  get filteredRows(): ImportacionRevisionRow[] {
    if (!this.revision) return [];
    const query = this.reviewSearch.trim().toLowerCase();

    return this.revision.rows.filter(row => {
      const filterOk = this.reviewFilter === 'all'
        || (this.reviewFilter === 'clean' && row.estado === 'clean')
        || (this.reviewFilter === 'conflict' && (row.estado === 'review' || row.estado === 'blocking'));
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
    return !!this.revision?.puedeConfirmar && !this.hasInvalidManualGrades();
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
    if (this.detail?.puedeConfirmar) {
      return 'Ver resumen final';
    }

    return 'Ir a tabla editable';
  }

  get allReviewRowsPayload(): ActualizarImportacionRevisionRequest {
    return {
      rows: (this.revision?.rows ?? []).map(row => ({
        rowId: row.rowId,
        estudianteAsociadoId: row.estudianteAsociadoId,
        omitida: row.omitida,
        cells: row.cells.map(cell => ({
          slotKey: cell.slotKey,
          resolucion: cell.resolucion,
          valorFinal: cell.valorFinal,
        })),
      })),
    };
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
      this.analyzeError = 'Seleccioná un PDF exportado desde CiDi.';
      return;
    }

    this.stage = 'analysis';
    this.startAnalysisAnimation();
    this.actionLoading = true;
    this.analyzeError = '';
    this.feedback = '';

    this.importService.analizar(this.idEC, this.selectedFile).pipe(
      finalize(() => {
        this.actionLoading = false;
      }),
    ).subscribe({
      next: detail => {
        this.idImportacion = detail.idImportacionCalificaciones;
        this.replaceImportSessionUrl(detail.idImportacionCalificaciones);
        this.finishAnalysisSuccess(detail);
      },
      error: error => {
        this.finishAnalysisError(this.extractErrorMessage(
          error,
          'No pudimos analizar el PDF.',
        ));
      },
    });
  }

  reanalizar(): void {
    if (!this.idImportacion) return;

    this.stage = 'analysis';
    this.startAnalysisAnimation();
    this.actionLoading = true;
    this.feedback = '';
    this.analyzeError = '';

    this.importService.reanalizar(this.idImportacion).pipe(
      finalize(() => {
        this.actionLoading = false;
      }),
    ).subscribe({
      next: detail => {
        this.finishAnalysisSuccess(detail);
      },
      error: error => {
        this.finishAnalysisError(this.extractErrorMessage(
          error,
          'No pudimos volver a analizar el PDF.',
        ));
      },
    });
  }

  guardarRevision(): void {
    if (!this.idImportacion || !this.revision) return;
    if (this.hasInvalidManualGrades()) {
      this.feedback = 'Revisá las notas editadas manualmente: solo se permiten números enteros del 1 al 10.';
      return;
    }

    this.actionLoading = true;
    this.feedback = '';

    this.importService.guardarRevision(this.idImportacion, this.allReviewRowsPayload).pipe(
      finalize(() => {
        this.actionLoading = false;
      }),
    ).subscribe({
      next: revision => {
        this.revision = revision;
        this.feedback = revision.puedeConfirmar
          ? 'La revisión quedó lista para confirmar.'
          : 'La revisión se guardó.';
      },
      error: error => {
        this.feedback = this.extractErrorMessage(
          error,
          'No pudimos guardar los cambios realizados en la revisión.',
        );
      },
    });
  }

  abrirConfirmacion(): void {
    if (!this.idImportacion || !this.revision) return;
    if (this.hasInvalidManualGrades()) {
      this.feedback = 'Revisá las notas editadas manualmente: solo se permiten números enteros del 1 al 10.';
      return;
    }

    this.actionLoading = true;
    this.feedback = '';

    this.importService.guardarRevision(this.idImportacion, this.allReviewRowsPayload).pipe(
      switchMap(revision => {
        this.revision = revision;
        if (!revision.puedeConfirmar) {
          this.stage = 'review';
          this.feedback = 'Todavía quedan decisiones pendientes en la tabla. Revisá las celdas marcadas antes de continuar.';
          return of(null);
        }

        return this.importService.getConfirmacion(this.idImportacion!);
      }),
      finalize(() => {
        this.actionLoading = false;
      }),
    ).subscribe({
      next: confirmacion => {
        if (!confirmacion) {
          return;
        }

        this.confirmacion = confirmacion;
        this.stage = 'confirm';
      },
      error: error => {
        this.feedback = this.extractErrorMessage(
          error,
          'No pudimos preparar el resumen final de la importación.',
        );
      },
    });
  }

  confirmarImportacion(): void {
    if (!this.idImportacion) return;

    this.actionLoading = true;
    this.feedback = '';

    this.importService.confirmar(this.idImportacion).pipe(
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
          'No pudimos completar la importación.',
        );
      },
    });
  }

  cancelarImportacion(): void {
    if (!this.idImportacion) {
      this.resetToLoadStage();
      return;
    }

    this.actionLoading = true;
    this.importService.cancelar(this.idImportacion).pipe(
      finalize(() => {
        this.actionLoading = false;
      }),
    ).subscribe({
      next: () => {
        this.resetToLoadStage();
      },
      error: error => {
        this.feedback = this.extractErrorMessage(
          error,
          'No pudimos cancelar la importación.',
        );
      },
    });
  }

  cancelarYReiniciar(): void {
    this.cancelarImportacion();
  }

  volverACalificaciones(): void {
    this.router.navigate(['/mis-espacios-curriculares', this.idEC, 'calificaciones']);
  }

  getStudentLabel(studentId: string | null): string {
    if (!studentId || !this.revision) return 'Sin asociar';
    return this.revision.estudiantesCurso.find(option => option.idEstudiante === studentId)?.label ?? 'Sin asociar';
  }

  getStudentOptionText(option: ImportacionStudentOption): string {
    return option.label;
  }

  getStudentOptionTitle(option: ImportacionStudentOption): string {
    return `${option.label} · DNI ${option.documento}`;
  }

  continueAfterAnalysis(): void {
    if (!this.detail) {
      return;
    }

    this.analysisAwaitingContinue = false;
    this.handleDetail(this.detail, false);
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

  isManualValueInvalid(cell: ImportacionRevisionCell): boolean {
    if (cell.resolucion !== 'manual_edit') {
      return false;
    }

    return typeof cell.valorFinal !== 'number'
      || !Number.isInteger(cell.valorFinal)
      || cell.valorFinal < 1
      || cell.valorFinal > 10;
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
        return 'Fila con observaciones';
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
      && row.mensaje.trim().toLowerCase() !== 'la fila requiere revisión antes de confirmar.';
  }

  getCellResolutionOptions(cell: ImportacionRevisionCell): Array<{ value: string; label: string }> {
    const options: Array<{ value: string; label: string }> = [];

    if ((cell.resolucion?.trim().toLowerCase() ?? '') === 'pending') {
      options.push({ value: 'pending', label: 'Elegir' });
    }

    if (cell.valorImportado !== null) {
      options.push({ value: 'use_imported', label: 'PDF' });
    }

    if (cell.valorDb !== null) {
      options.push({ value: 'keep_db', label: 'Sistema' });
    }

    options.push({ value: 'manual_edit', label: 'Manual' });
    options.push({ value: 'omit', label: 'Omitir' });
    return options;
  }

  isManualEdit(cell: ImportacionRevisionCell): boolean {
    return cell.resolucion === 'manual_edit';
  }

  getCellDisplayValue(cell: ImportacionRevisionCell): number | null {
    const resolution = cell.resolucion?.trim().toLowerCase();

    switch (resolution) {
      case 'keep_db':
        return cell.valorDb;
      case 'use_imported':
        return cell.valorImportado;
      case 'omit':
        return null;
      case 'manual_edit':
        return cell.valorFinal;
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
      case 'omit':
        cell.valorFinal = null;
        break;
      case 'manual_edit':
        cell.valorFinal ??= cell.valorImportado ?? cell.valorDb ?? null;
        break;
      default:
        break;
    }

    this.recomputeRevisionStateLocally();
  }

  onManualValueChange(cell: ImportacionRevisionCell, value: number | string | null): void {
    if (value === '' || value === null || value === undefined) {
      cell.valorFinal = null;
      this.recomputeRevisionStateLocally();
      return;
    }

    const parsed = Number(value);
    cell.valorFinal = Number.isNaN(parsed) ? parsed : parsed;
    this.recomputeRevisionStateLocally();
  }

  onRowStateChange(): void {
    this.recomputeRevisionStateLocally();
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

  private hasInvalidManualGrades(): boolean {
    return (this.revision?.rows ?? []).some(row =>
      row.cells.some(cell => this.isManualValueInvalid(cell)),
    );
  }

  private recomputeRevisionStateLocally(): void {
    if (!this.revision) {
      return;
    }

    for (const row of this.revision.rows) {
      for (const cell of row.cells) {
        this.applyLocalDecision(cell);
      }
    }

    this.applyLocalDuplicateConflicts(this.revision.rows);
    this.recomputeLocalRowStates(this.revision.rows);
    this.revision.resumen = this.buildLocalResumen(this.revision.rows, this.revision.slots);
    this.revision.puedeConfirmar = this.revision.bloqueos.length === 0 && !this.hasPendingRowsLocally(this.revision.rows);
  }

  private applyLocalDecision(cell: ImportacionRevisionCell): void {
    const resolution = cell.resolucion?.trim().toLowerCase() ?? '';

    switch (resolution) {
      case 'keep_db':
        cell.estado = 'clean';
        cell.valorFinal = cell.valorDb;
        cell.mensaje = null;
        return;
      case 'omit':
        cell.estado = 'clean';
        cell.valorFinal = null;
        cell.mensaje = null;
        return;
      case 'use_imported':
        if (cell.valorImportado === null) {
          cell.estado = 'review';
          cell.resolucion = 'pending';
          cell.mensaje = 'Tenés que decidir qué hacer con esta nota antes de continuar.';
          return;
        }

        cell.estado = 'clean';
        cell.valorFinal = cell.valorImportado;
        cell.mensaje = null;
        return;
      case 'manual_edit':
        if (cell.valorFinal === null || !Number.isInteger(cell.valorFinal) || cell.valorFinal < 1 || cell.valorFinal > 10) {
          cell.estado = 'blocking';
          cell.resolucion = 'pending';
          cell.mensaje = 'Ingresá una nota válida del 1 al 10.';
          return;
        }

        cell.estado = 'clean';
        cell.mensaje = null;
        return;
      default:
        cell.estado = cell.valorDb !== null || cell.valorImportado !== null ? 'review' : 'clean';
        cell.resolucion = cell.estado === 'review' ? 'pending' : 'omit';
        cell.mensaje = cell.estado === 'review'
          ? 'Tenés que decidir qué hacer con esta nota antes de continuar.'
          : null;
    }
  }

  private applyLocalDuplicateConflicts(rows: ImportacionRevisionRow[]): void {
    const duplicatedGroups = new Map<string, ImportacionRevisionRow[]>();

    for (const row of rows) {
      if (row.omitida || !row.estudianteAsociadoId) {
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

      const slotGroups = new Map<string, Array<{ row: ImportacionRevisionRow; cell: ImportacionRevisionCell }>>();

      for (const row of group) {
        for (const cell of row.cells) {
          if (String(cell.resolucion).toLowerCase() === 'omit') {
            continue;
          }

          const items = slotGroups.get(cell.slotKey) ?? [];
          items.push({ row, cell });
          slotGroups.set(cell.slotKey, items);
        }
      }

      for (const items of slotGroups.values()) {
        const finalValues = Array.from(new Set(
          items
            .map(item => item.cell.resolucion === 'keep_db' ? item.cell.valorDb : item.cell.valorFinal)
            .filter(value => value !== null),
        ));

        if (finalValues.length > 1) {
          for (const item of items) {
            item.cell.estado = 'blocking';
            item.cell.resolucion = 'pending';
            item.cell.mensaje = 'Este estudiante aparece repetido en el PDF con notas distintas para la misma evaluación.';
          }
        }
      }
    }
  }

  private recomputeLocalRowStates(rows: ImportacionRevisionRow[]): void {
    for (const row of rows) {
      if (row.omitida) {
        row.estado = 'clean';
        row.mensaje = 'Esta fila fue omitida en la importación.';
        continue;
      }

      if (!row.estudianteAsociadoId) {
        row.estado = 'blocking';
        row.mensaje = 'Tenés que elegir a qué estudiante corresponde esta fila o bien omitirla.';
        continue;
      }

      const hasBlockingIssue = (row.issues ?? []).some(issue => issue.severidad === 'blocking')
        || row.cells.some(cell => cell.estado === 'blocking');

      if (hasBlockingIssue) {
        row.estado = 'blocking';
        row.mensaje = 'Esta fila tiene un problema que tenés que resolver antes de continuar.';
        continue;
      }

      const hasReviewIssue = (row.issues ?? []).some(issue => issue.severidad === 'review')
        || row.cells.some(cell => cell.resolucion === 'pending' || cell.estado === 'review');

      row.estado = hasReviewIssue ? 'review' : 'clean';
      row.mensaje = hasReviewIssue ? 'Esta fila necesita revisión.' : null;
    }
  }

  private hasPendingRowsLocally(rows: ImportacionRevisionRow[]): boolean {
    return rows.some(row =>
      !row.omitida
      && (row.estado !== 'clean'
        || row.cells.some(cell => cell.resolucion === 'pending' || cell.estado === 'blocking')),
    );
  }

  private buildLocalResumen(rows: ImportacionRevisionRow[], slots: ImportacionSlot[]) {
    const noteCells = rows.flatMap(row => row.cells.map(cell => ({ row, cell })));

    return {
      estudiantesDetectados: rows.length,
      estudiantesSinConflicto: rows.filter(row => row.estado === 'clean').length,
      estudiantesConConflicto: rows.filter(row => row.estado !== 'clean').length,
      evaluacionesDetectadasConNotas: slots.filter(slot => slot.tieneNotasImportadas).length,
      notasNuevas: noteCells.filter(item => !item.row.omitida && item.cell.valorImportado !== null && item.cell.valorDb === null).length,
      notasYaExistentes: noteCells.filter(item => !item.row.omitida && item.cell.valorDb !== null).length,
      conflictosDeNotas: noteCells.filter(item => item.cell.estado !== 'clean' && item.cell.valorImportadoRaw !== null).length,
      notasInvalidas: noteCells.filter(item => !!item.cell.valorImportadoRaw && item.cell.valorImportado === null).length,
      pendientesDeRevision: noteCells.filter(item => item.cell.resolucion === 'pending').length + rows.filter(row => row.estado === 'blocking').length,
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

      if (this.idImportacion) {
        this.loadExistingSession(this.idImportacion);
        return;
      }

      this.importService.getActiva(this.idEC).subscribe({
        next: detail => {
          if (detail) {
            this.idImportacion = detail.idImportacionCalificaciones;
            this.handleDetail(detail, true);
            return;
          }

          this.stage = 'load';
        },
        error: () => {
          this.stage = 'load';
        },
      });
    });
  }

  private loadExistingSession(idImportacion: string): void {
    this.loading = true;
    this.importService.getDetalle(idImportacion).pipe(
      finalize(() => {
        this.loading = false;
      }),
    ).subscribe({
      next: detail => {
        this.handleDetail(detail, true);
      },
      error: error => {
        this.error = true;
        this.errorMessage = this.extractErrorMessage(
          error,
          'No pudimos recuperar la importación que habías dejado pendiente.',
        );
      },
    });
  }

  private handleDetail(detail: ImportacionCalificacionesDetalle, showResumeMessage = false): void {
    this.detail = detail;
    this.idImportacion = detail.idImportacionCalificaciones;
    this.analyzeError = '';
    this.feedback = showResumeMessage && detail.tieneSesionPendiente
      ? 'Se retomó una importación que había quedado pendiente.'
      : '';
    this.analysisAwaitingContinue = false;

    if (detail.bloqueos.length > 0 && !detail.puedeRevisar) {
      this.stage = 'analysis';
      this.revision = null;
      this.confirmacion = null;
      return;
    }

    if (detail.puedeConfirmar) {
      this.importService.getConfirmacion(detail.idImportacionCalificaciones).subscribe({
        next: confirmacion => {
          this.confirmacion = confirmacion;
          this.stage = 'confirm';
        },
        error: () => {
          this.loadRevision(detail.idImportacionCalificaciones);
        },
      });
      return;
    }

    if (detail.puedeRevisar) {
      this.loadRevision(detail.idImportacionCalificaciones);
      return;
    }

    this.stage = 'analysis';
  }

  private loadRevision(idImportacion: string): void {
    this.loading = true;
    this.importService.getRevision(idImportacion).pipe(
      finalize(() => {
        this.loading = false;
      }),
    ).subscribe({
      next: revision => {
        this.revision = revision;
        this.confirmacion = null;
        this.stage = 'review';
      },
      error: error => {
        this.error = true;
        this.errorMessage = this.extractErrorMessage(
          error,
          'No pudimos cargar la revisión de la importación.',
        );
      },
    });
  }

  private navigateToSession(idImportacion: string): void {
    this.router.navigate(
      ['/mis-espacios-curriculares', this.idEC, 'calificaciones', 'importar', idImportacion],
      { replaceUrl: true },
    );
    this.loadExistingSession(idImportacion);
  }

  private resetToLoadStage(): void {
    this.clearAnalysisAnimation();
    this.idImportacion = null;
    this.detail = null;
    this.revision = null;
    this.confirmacion = null;
    this.success = null;
    this.stage = 'load';
    this.selectedFile = null;
    this.selectedFileName = '';
    this.analyzeError = '';
    this.feedback = '';
    this.analysisAwaitingContinue = false;
    this.reviewFilter = 'all';
    this.reviewTab = 1;
    this.reviewSearch = '';
    this.router.navigate(
      ['/mis-espacios-curriculares', this.idEC, 'calificaciones', 'importar'],
      { replaceUrl: true },
    );
  }

  private replaceImportSessionUrl(idImportacion: string): void {
    this.location.replaceState(
      `/mis-espacios-curriculares/${this.idEC}/calificaciones/importar/${idImportacion}`,
    );
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

  private finishAnalysisSuccess(detail: ImportacionCalificacionesDetalle): void {
    const waitMs = Math.max(0, this.analysisMinDurationMs - (Date.now() - this.analysisStartedAt));

    const timer = setTimeout(() => {
      this.detail = detail;
      this.idImportacion = detail.idImportacionCalificaciones;
      this.analyzeError = '';

      const failureStep = this.getFailureStepIndexFromDetail(detail);
      if (failureStep !== null) {
        this.setChecklistError(failureStep);
        this.analysisAwaitingContinue = false;
        this.handleDetail(detail, false);
        return;
      }

      this.markChecklistDone();
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
      this.detail = null;
      this.revision = null;
      this.confirmacion = null;
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

  private getFailureStepIndexFromDetail(detail: ImportacionCalificacionesDetalle): number | null {
    if (!detail.bloqueos.length) {
      return null;
    }

    const joinedMessages = detail.bloqueos
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

    if (/(evaluacion|evaluación|eval|nota invalida|nota inválida|columna|r1|r2|n\\b)/.test(text)) {
      return 3;
    }

    return 4;
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
