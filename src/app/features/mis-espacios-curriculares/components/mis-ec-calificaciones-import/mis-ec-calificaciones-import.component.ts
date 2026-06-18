import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
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
type ReviewFilter = 'all' | 'clean' | 'review' | 'blocking';
type ReviewTab = 1 | 5;

@Component({
  selector: 'app-mis-ec-calificaciones-import',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mis-ec-calificaciones-import.component.html',
  styleUrl: './mis-ec-calificaciones-import.component.scss',
})
export class MisEcCalificacionesImportComponent implements OnInit {
  idEC = '';
  idImportacion: string | null = null;
  espacio: MisEcItem | null = null;

  loading = true;
  actionLoading = false;
  error = false;
  errorMessage = 'No se pudo cargar el importador de calificaciones.';

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

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly misEcService: MisEspaciosCurricularesService,
    private readonly importService: CalificacionesImportacionService,
  ) {}

  ngOnInit(): void {
    this.idEC = this.route.snapshot.paramMap.get('idEC') ?? '';
    this.idImportacion = this.route.snapshot.paramMap.get('idImportacion');

    if (!this.idEC) {
      this.error = true;
      this.loading = false;
      this.errorMessage = 'No se indicó un espacio curricular válido.';
      return;
    }

    this.loadBaseContext();
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

  get stageSlots(): ImportacionSlot[] {
    if (!this.revision) return [];
    return this.revision.slots.filter(slot =>
      this.reviewTab === 1 ? slot.evaluacionNumero <= 4 : slot.evaluacionNumero >= 5,
    );
  }

  get studentOptions(): ImportacionStudentOption[] {
    return this.revision?.estudiantesCurso ?? [];
  }

  get filteredRows(): ImportacionRevisionRow[] {
    if (!this.revision) return [];
    const query = this.reviewSearch.trim().toLowerCase();

    return this.revision.rows.filter(row => {
      const filterOk = this.reviewFilter === 'all' || row.estado === this.reviewFilter;
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
    return !!this.revision?.puedeConfirmar;
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
        this.navigateToSession(detail.idImportacionCalificaciones);
      },
      error: error => {
        this.analyzeError = this.extractErrorMessage(
          error,
          'No se pudo analizar el PDF de CiDi.',
        );
      },
    });
  }

  reanalizar(): void {
    if (!this.idImportacion) return;

    this.actionLoading = true;
    this.feedback = '';
    this.analyzeError = '';

    this.importService.reanalizar(this.idImportacion).pipe(
      finalize(() => {
        this.actionLoading = false;
      }),
    ).subscribe({
      next: detail => {
        this.handleDetail(detail, false);
      },
      error: error => {
        this.analyzeError = this.extractErrorMessage(
          error,
          'No se pudo reanalizar la importación.',
        );
      },
    });
  }

  guardarRevision(): void {
    if (!this.idImportacion || !this.revision) return;

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
          'No se pudo guardar la revisión.',
        );
      },
    });
  }

  abrirConfirmacion(): void {
    if (!this.idImportacion) return;

    this.actionLoading = true;
    this.feedback = '';

    this.importService.getConfirmacion(this.idImportacion).pipe(
      finalize(() => {
        this.actionLoading = false;
      }),
    ).subscribe({
      next: confirmacion => {
        this.confirmacion = confirmacion;
        this.stage = 'confirm';
      },
      error: error => {
        this.feedback = this.extractErrorMessage(
          error,
          'No se pudo preparar la confirmación.',
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
          'No se pudo confirmar la importación.',
        );
      },
    });
  }

  cancelarImportacion(): void {
    if (!this.idImportacion) {
      this.volverACalificaciones();
      return;
    }

    this.actionLoading = true;
    this.importService.cancelar(this.idImportacion).pipe(
      finalize(() => {
        this.actionLoading = false;
      }),
    ).subscribe({
      next: () => {
        this.volverACalificaciones();
      },
      error: error => {
        this.feedback = this.extractErrorMessage(
          error,
          'No se pudo cancelar la importación.',
        );
      },
    });
  }

  volverACalificaciones(): void {
    this.router.navigate(['/mis-espacios-curriculares', this.idEC, 'calificaciones']);
  }

  getStudentLabel(studentId: string | null): string {
    if (!studentId || !this.revision) return 'Sin asociar';
    return this.revision.estudiantesCurso.find(option => option.idEstudiante === studentId)?.label ?? 'Sin asociar';
  }

  getRowCells(row: ImportacionRevisionRow): ImportacionRevisionCell[] {
    const visibleSlotKeys = new Set(this.stageSlots.map(slot => slot.slotKey));
    return row.cells.filter(cell => visibleSlotKeys.has(cell.slotKey));
  }

  getCellResolutionOptions(cell: ImportacionRevisionCell): Array<{ value: string; label: string }> {
    const options = [{ value: 'omit', label: 'Omitir' }];

    if (cell.valorDb !== null) {
      options.unshift({ value: 'keep_db', label: 'Mantener DB' });
    }

    if (cell.valorImportado !== null) {
      options.unshift({ value: 'use_imported', label: 'Usar PDF' });
    }

    options.push({ value: 'manual_edit', label: 'Editar manualmente' });
    return options;
  }

  isManualEdit(cell: ImportacionRevisionCell): boolean {
    return cell.resolucion === 'manual_edit';
  }

  trackByRowId(_: number, row: ImportacionRevisionRow): string {
    return row.rowId;
  }

  trackBySlotKey(_: number, slot: ImportacionSlot): string {
    return slot.slotKey;
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
          'No se pudo recuperar la sesión de importación.',
        );
      },
    });
  }

  private handleDetail(detail: ImportacionCalificacionesDetalle, showResumeMessage = false): void {
    this.detail = detail;
    this.idImportacion = detail.idImportacionCalificaciones;
    this.analyzeError = '';
    this.feedback = showResumeMessage && detail.tieneSesionPendiente
      ? 'Se retomó una sesión de importación pendiente.'
      : '';

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
          'No se pudo cargar la revisión de la importación.',
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
