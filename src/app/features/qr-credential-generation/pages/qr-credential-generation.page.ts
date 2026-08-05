import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { Subscription } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import {
  AlcanceGeneracionQr,
  OpcionCurso,
  ProgresoGeneracionQr,
  ResumenGeneracionQr
} from '../models/qr-credential-generation.models';
import { ServicioGeneracionCredencialesQr } from '../services/qr-credential-generation.service';
import {
  DatosConfirmacionGeneracionQr,
  DialogoConfirmacionGeneracionQrComponent
} from '../components/confirm-generation-dialog.component';
import { DialogoProgresoGeneracionQrComponent } from '../components/generation-progress-dialog.component';
import { DialogoResultadoGeneracionQrComponent } from '../components/generation-result-dialog.component';
import {
  DatosCancelacionGeneracionQr,
  DialogoCancelacionGeneracionQrComponent,
  ResultadoCancelacionGeneracionQr
} from '../components/cancel-generation-dialog.component';
import {
  DatosFeedbackGeneracionQr,
  DialogoFeedbackGeneracionQrComponent
} from '../components/generation-feedback-dialog.component';
import { QrCredentialsSyncService } from '../../../core/services/qr-credentials-sync.service';

@Component({
  selector: 'app-qr-credential-generation-page',
  standalone: true,
  host: {
    '[class.embedded-host]': 'embedded'
  },
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule
  ],
  template: `
    <div class="page-shell" [class.page-shell--embedded]="embedded">
      <section class="panel" [class.panel--embedded]="embedded">
        <div class="panel-header">
          <div>
            <h1>Generación masiva</h1>
            <p class="subtitle">
              Seleccione un curso, revise el estado actual y ejecute la generación.
            </p>
          </div>
        </div>

        <div class="controls">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Curso</mat-label>
            <mat-select
              [(ngModel)]="cursoSeleccionadoId"
              (selectionChange)="alCambiarCurso()"
              [disabled]="cursosCargando || ejecutandoJob"
              panelClass="qr-select-panel">
              <mat-option [value]="null">Seleccione un curso</mat-option>
              <mat-option *ngFor="let curso of cursos" [value]="curso.id">
                {{ curso.label }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Alcance</mat-label>
            <mat-select [(ngModel)]="alcanceSeleccionado" [disabled]="ejecutandoJob" panelClass="qr-select-panel">
              <mat-option [value]="null">Seleccione un alcance</mat-option>
              <mat-option value="ACTIVOS">Estudiantes activos</mat-option>
              <mat-option value="SIN_QR">Estudiantes sin QR</mat-option>
              <mat-option value="TODOS">Generar a todos</mat-option>
            </mat-select>
          </mat-form-field>

          <button
            mat-raised-button
            color="primary"
            class="primary-action"
            [disabled]="!puedeGenerar()"
            (click)="iniciarGeneracion()">
            <span class="button-content">
              <span class="mini-spinner mini-spinner--button" *ngIf="ejecutandoJob"></span>
              {{ ejecutandoJob ? 'Iniciando generación...' : 'Generar credenciales' }}
            </span>
          </button>
        </div>

        <div class="inline-loading" *ngIf="cursosCargando || cargandoResumen">
          <span class="mini-spinner"></span>
          {{ cursosCargando ? 'Cargando cursos...' : 'Consultando resumen de generación...' }}
        </div>

        <p class="hint" *ngIf="cursoSeleccionadoId && !alcanceSeleccionado">
          Seleccione el alcance de generación para habilitar la acción.
        </p>

        <p class="error" *ngIf="errorMensaje">{{ errorMensaje }}</p>

        <div class="summary-grid">
          <article class="summary-card">
            <span>Total estudiantes activos</span>
            <strong>{{ resumen?.totalAlumnosActivos ?? 0 }}</strong>
          </article>

          <article class="summary-card">
            <span>Total QR creados</span>
            <strong>{{ resumen?.totalQrActivos ?? 0 }}</strong>
          </article>

          <article class="summary-card">
            <span>Pendientes de generar</span>
            <strong>{{ resumen?.totalPendientesGenerar ?? 0 }}</strong>
          </article>
        </div>

      </section>
    </div>
  `,
  styleUrl: './qr-credential-generation.page.css'
})
export class PaginaGeneracionCredencialesQr implements OnInit {
  @Input() embedded = false;

  private readonly destroyRef = inject(DestroyRef);
  private pollingSubscription?: Subscription;
  private progressDialogRef?: MatDialogRef<DialogoProgresoGeneracionQrComponent>;
  private cancelDialogRef?: MatDialogRef<DialogoCancelacionGeneracionQrComponent>;
  private feedbackDialogRef?: MatDialogRef<DialogoFeedbackGeneracionQrComponent>;
  private closeProgressDialogTimeoutId?: number;
  private pauseDecisionIntervalId?: number;
  private currentJobId: string | null = null;

  cursos: OpcionCurso[] = [];
  cursoSeleccionadoId: string | null = null;
  alcanceSeleccionado: AlcanceGeneracionQr | null = null;
  resumen: ResumenGeneracionQr | null = null;
  progreso: ProgresoGeneracionQr | null = null;
  errorMensaje = '';
  cursosCargando = false;
  cargandoResumen = false;
  ejecutandoJob = false;
  pausaSolicitadaParaCancelacion = false;

  constructor(
    private servicio: ServicioGeneracionCredencialesQr,
    private dialog: MatDialog,
    private qrCredentialsSync: QrCredentialsSyncService
  ) {
    this.destroyRef.onDestroy(() => {
      this.detenerPolling();
      this.cancelarCierreDialogoProgresoPendiente();
      this.detenerIntentosPausaDecisionCancelacion();
      this.cerrarDialogoCancelacion();
      this.cerrarDialogoFeedback();
      this.cerrarDialogoProgreso();
    });
  }

  ngOnInit(): void {
    this.cursosCargando = true;

    this.servicio.obtenerCursos()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: cursos => {
          this.cursos = cursos;
          this.cursosCargando = false;
        },
        error: () => {
          this.cursosCargando = false;
          this.errorMensaje = 'No se pudieron cargar los cursos.';
        }
      });

    this.cargarResumen();
  }

  alCambiarCurso(): void {
    this.detenerPolling();
    this.cancelarCierreDialogoProgresoPendiente();
    this.detenerIntentosPausaDecisionCancelacion();
    this.cerrarDialogoCancelacion();
    this.cerrarDialogoProgreso();
    this.pausaSolicitadaParaCancelacion = false;
    this.progreso = null;
    this.errorMensaje = '';
    this.cargarResumen();
  }

  cargarResumen(): void {
    this.cargandoResumen = true;

    this.servicio.obtenerResumen(this.cursoSeleccionadoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: resumen => {
          this.resumen = resumen;
          this.cargandoResumen = false;
        },
        error: error => {
          this.errorMensaje = this.obtenerMensajeError(error, 'No se pudo obtener el resumen.');
          this.resumen = null;
          this.cargandoResumen = false;
        }
      });
  }

  iniciarGeneracion(): void {
    if (!this.cursoSeleccionadoId || !this.alcanceSeleccionado || this.ejecutandoJob || !this.resumen) {
      return;
    }

    const dialogRef = this.dialog.open(DialogoConfirmacionGeneracionQrComponent, {
      width: '480px',
      data: this.construirDatosConfirmacion(),
      panelClass: 'qr-generation-dialog'
    });

    dialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(confirmado => {
        if (confirmado) {
          this.iniciarJobGeneracion();
        }
      });
  }

  iniciarJobGeneracion(): void {
    if (!this.cursoSeleccionadoId || !this.alcanceSeleccionado || this.ejecutandoJob) {
      return;
    }

    const alcance = this.alcanceSeleccionado;
    this.errorMensaje = '';
    this.detenerPolling();
    this.cancelarCierreDialogoProgresoPendiente();
    this.detenerIntentosPausaDecisionCancelacion();
    this.progreso = null;
    this.ejecutandoJob = true;
    this.pausaSolicitadaParaCancelacion = false;

    this.servicio.iniciarJob({
      idCurso: this.cursoSeleccionadoId,
      alcance
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ jobId }) => {
          this.currentJobId = jobId;
          this.abrirDialogoProgreso();
          this.iniciarPolling(jobId);
        },
        error: error => {
          this.ejecutandoJob = false;
          this.errorMensaje = this.obtenerMensajeError(error, 'No se pudo iniciar la generación.');
        }
      });
  }

  iniciarPolling(jobId: string): void {
    this.detenerPolling();

    this.pollingSubscription = interval(1000)
      .pipe(
        startWith(0),
        switchMap(() => this.servicio.obtenerProgreso(jobId)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: progreso => {
          const progresoNormalizado = this.normalizarProgresoFinal(progreso);
          this.progreso = progresoNormalizado;
          this.actualizarDialogoProgreso(progresoNormalizado);

          if (this.cancelDialogRef && progresoNormalizado.estado === 'RUNNING') {
            this.solicitarPausaParaDecisionCancelacion();
          }

          if (
            progresoNormalizado.estado === 'COMPLETED' ||
            progresoNormalizado.estado === 'FAILED' ||
            progresoNormalizado.estado === 'CANCELLED'
          ) {
            this.detenerPolling();
            this.ejecutandoJob = false;
            this.pausaSolicitadaParaCancelacion = false;
            this.currentJobId = null;
            this.detenerIntentosPausaDecisionCancelacion();
            this.cerrarDialogoCancelacion();
            this.cerrarDialogoFeedback();
            this.programarCierreDialogoProgreso(progresoNormalizado);
          }
        },
        error: error => {
          this.detenerPolling();
          this.ejecutandoJob = false;
          this.pausaSolicitadaParaCancelacion = false;
          this.currentJobId = null;
          this.cancelarCierreDialogoProgresoPendiente();
          this.detenerIntentosPausaDecisionCancelacion();
          this.cerrarDialogoCancelacion();
          this.cerrarDialogoFeedback();
          this.cerrarDialogoProgreso();
          this.errorMensaje = this.obtenerMensajeError(error, 'No se pudo consultar el progreso del proceso.');
        }
      });
  }

  puedeGenerar(): boolean {
    return !!this.cursoSeleccionadoId
      && !!this.alcanceSeleccionado
      && !this.ejecutandoJob
      && !this.cargandoResumen;
  }

  construirSugerenciaResumen(resumen: ResumenGeneracionQr): string {
    if (resumen.totalAlumnosActivos === 0) {
      return 'No hay estudiantes activos en el filtro actual.';
    }

    if (resumen.totalQrActivos === 0) {
      return 'No existen QR creados. El alcance "Estudiantes activos" o "Estudiantes sin QR" debería cubrir el caso inicial.';
    }

    if (resumen.totalPendientesGenerar === 0) {
      return 'Todos los estudiantes activos ya tienen un QR creado. Utilice "Generar a todos" solo si necesita regenerarlos.';
    }

    return 'Hay estudiantes con y sin QR creado. "Estudiantes sin QR" evita regenerar los ya vigentes; "Generar a todos" reemplaza los actuales.';
  }

  private obtenerMensajeError(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      return typeof error.error === 'string' ? error.error : error.error?.message ?? fallback;
    }

    return fallback;
  }

  private detenerPolling(): void {
    this.pollingSubscription?.unsubscribe();
    this.pollingSubscription = undefined;
  }

  private construirDatosConfirmacion(): DatosConfirmacionGeneracionQr {
    const { etiquetaIntento, totalIntentos } = this.obtenerResumenIntentoGeneracion();

    return {
      curso: this.resumen?.cursoCodigo ?? this.obtenerLabelCursoSeleccionado(),
      alcance: this.obtenerLabelAlcance(this.alcanceSeleccionado),
      etiquetaIntento,
      totalIntentos
    };
  }

  private obtenerResumenIntentoGeneracion(): { etiquetaIntento: string; totalIntentos: number } {
    switch (this.alcanceSeleccionado) {
      case 'ACTIVOS':
        return {
          etiquetaIntento: 'Credenciales a generar',
          totalIntentos: this.resumen?.totalAlumnosActivos ?? 0
        };
      case 'SIN_QR':
        return {
          etiquetaIntento: 'Credenciales a generar',
          totalIntentos: this.resumen?.totalPendientesGenerar ?? 0
        };
      case 'TODOS':
        return {
          etiquetaIntento: 'Credenciales a generar',
          totalIntentos: this.resumen?.totalAlumnosActivos ?? 0
        };
      default:
        return {
          etiquetaIntento: 'Credenciales a generar',
          totalIntentos: 0
        };
    }
  }

  private abrirDialogoProgreso(): void {
    this.cerrarDialogoProgreso();

    this.progressDialogRef = this.dialog.open(DialogoProgresoGeneracionQrComponent, {
      width: '520px',
      disableClose: true,
      panelClass: 'qr-generation-dialog'
    });

    this.progressDialogRef.componentInstance.progress = this.progreso;
    this.progressDialogRef.componentInstance.solicitarCancelacion
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.confirmarCancelacion());
  }

  private actualizarDialogoProgreso(progreso: ProgresoGeneracionQr): void {
    if (this.progressDialogRef?.componentInstance) {
      this.progressDialogRef.componentInstance.progress = progreso;
    }
  }

  private cerrarDialogoProgreso(): void {
    this.cancelarCierreDialogoProgresoPendiente();
    this.progressDialogRef?.close();
    this.progressDialogRef = undefined;
  }

  private confirmarCancelacion(): void {
    if (!this.currentJobId || !this.esEstadoActivoParaDecision(this.progreso?.estado)) {
      return;
    }

    if (this.progreso?.estado === 'RUNNING') {
      this.solicitarPausaParaDecisionCancelacion();
    }

    this.abrirDialogoDecisionCancelacion();
  }

  private abrirDialogoDecisionCancelacion(): void {
    if (!this.currentJobId || !this.esEstadoActivoParaDecision(this.progreso?.estado)) {
      return;
    }

    this.cerrarDialogoCancelacion();

    this.cancelDialogRef = this.dialog.open(DialogoCancelacionGeneracionQrComponent, {
      width: '480px',
      disableClose: true,
      data: this.construirDatosCancelacion(),
      panelClass: 'qr-generation-dialog'
    });

    this.iniciarIntentosPausaDecisionCancelacion();

    this.cancelDialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((resultado?: ResultadoCancelacionGeneracionQr) => {
        this.cancelDialogRef = undefined;
        this.detenerIntentosPausaDecisionCancelacion();

        if (!resultado || !this.currentJobId) {
          return;
        }

        if (!this.esEstadoActivoParaDecision(this.progreso?.estado)) {
          return;
        }

        if (resultado.accion === 'resume') {
          this.reanudarGeneracion();
          return;
        }

        this.ejecutarCancelacion(resultado.mantenerGenerados);
      });
  }

  private reanudarGeneracion(): void {
    if (!this.currentJobId || this.progreso?.estado === 'RUNNING') {
      return;
    }

    this.servicio.reanudarJob(this.currentJobId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: progreso => {
          this.progreso = progreso;
          this.actualizarDialogoProgreso(progreso);
        },
        error: error => {
          this.dialog.open(DialogoFeedbackGeneracionQrComponent, {
            width: '430px',
            data: {
              titulo: 'No pudimos reanudar el proceso',
              mensaje: this.obtenerMensajeError(
                error,
                'Ocurrió un problema al intentar continuar la generación. Puede volver a intentarlo.'
              ),
              modo: 'error'
            } satisfies DatosFeedbackGeneracionQr,
            panelClass: 'qr-generation-dialog'
          });
        }
      });
  }

  private solicitarPausaParaDecisionCancelacion(): void {
    if (!this.currentJobId || this.pausaSolicitadaParaCancelacion || this.progreso?.estado !== 'RUNNING') {
      return;
    }

    this.pausaSolicitadaParaCancelacion = true;

    this.servicio.pausarJob(this.currentJobId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: progreso => {
          this.pausaSolicitadaParaCancelacion = false;
          this.progreso = progreso;
          this.actualizarDialogoProgreso(progreso);
        },
        error: () => {
          this.pausaSolicitadaParaCancelacion = false;
        }
      });
  }

  private programarCierreDialogoProgreso(progreso: ProgresoGeneracionQr): void {
    this.cancelarCierreDialogoProgresoPendiente();

    this.closeProgressDialogTimeoutId = window.setTimeout(() => {
      this.closeProgressDialogTimeoutId = undefined;
      this.cerrarDialogoProgreso();
      this.cargarResumen();

      if (this.cursoSeleccionadoId && (progreso.generados > 0 || progreso.desactivados > 0)) {
        this.qrCredentialsSync.notifyGenerationUpdated(this.cursoSeleccionadoId);
      }

      this.abrirDialogoResultado(progreso);
    }, 700);
  }

  private cancelarCierreDialogoProgresoPendiente(): void {
    if (this.closeProgressDialogTimeoutId !== undefined) {
      window.clearTimeout(this.closeProgressDialogTimeoutId);
      this.closeProgressDialogTimeoutId = undefined;
    }
  }

  private normalizarProgresoFinal(progreso: ProgresoGeneracionQr): ProgresoGeneracionQr {
    if (progreso.estado !== 'COMPLETED') {
      return progreso;
    }

    return {
      ...progreso,
      procesados: progreso.total
    };
  }

  private abrirDialogoResultado(progreso: ProgresoGeneracionQr): void {
    const datos = progreso.estado === 'FAILED'
      ? {
          titulo: 'Proceso fallido',
          mensaje: progreso.ultimoMensaje ?? 'La generación no pudo completarse.',
          icono: 'error',
          color: 'warn' as const
        }
      : progreso.estado === 'CANCELLED'
        ? {
            titulo: 'Proceso cancelado',
            mensaje: progreso.ultimoMensaje
              ?? (progreso.procesados >= progreso.total
                ? 'La solicitud de detención llegó cuando el proceso ya estaba finalizando. Revise el resumen final para confirmar el resultado.'
                : 'La generación se detuvo antes de completarse.'),
            icono: 'info',
            color: 'accent' as const
          }
      : progreso.errores > 0
        ? {
            titulo: 'Proceso finalizado con observaciones',
            mensaje: progreso.ultimoMensaje ?? 'La generación terminó pero hubo errores parciales.',
            icono: 'warning',
            color: 'accent' as const
          }
        : {
            titulo: 'Proceso finalizado',
            mensaje: progreso.ultimoMensaje ?? 'Las credenciales se generaron correctamente.',
            icono: 'check_circle',
            color: 'primary' as const
          };

    this.dialog.open(DialogoResultadoGeneracionQrComponent, {
      width: '460px',
      data: {
        ...datos,
        generados: progreso.generados,
        desactivados: progreso.desactivados,
        omitidos: progreso.omitidos,
        errores: progreso.errores
      },
      panelClass: 'qr-generation-dialog'
    });
  }

  private construirDatosCancelacion(): DatosCancelacionGeneracionQr {
    return {
      procesados: this.progreso?.procesados ?? 0,
      total: this.progreso?.total ?? 0,
      generados: this.progreso?.generados ?? 0
    };
  }

  private ejecutarCancelacion(mantenerGenerados: boolean): void {
    if (!this.currentJobId) {
      return;
    }

    this.pausaSolicitadaParaCancelacion = false;

    this.abrirDialogoFeedback({
      titulo: 'Estamos deteniendo la generación',
      mensaje: mantenerGenerados
        ? 'Se completará el estudiante en curso y se conservarán los QR generados hasta la última actualización.'
        : 'Se completará el estudiante en curso y luego se revertirán los QR generados hasta la última actualización.',
      modo: 'loading'
    });

    this.servicio.cancelarJob(this.currentJobId, { mantenerGenerados })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: progreso => {
          this.cerrarDialogoFeedback();
          this.progreso = progreso;
          this.actualizarDialogoProgreso(progreso);
        },
        error: error => {
          this.cerrarDialogoFeedback();
          this.dialog.open(DialogoFeedbackGeneracionQrComponent, {
            width: '430px',
            data: {
              titulo: 'No pudimos cancelar el proceso',
              mensaje: this.obtenerMensajeError(
                error,
                'Ocurrió un problema al intentar detener la generación. Puede volver a intentarlo.'
              ),
              modo: 'error'
            } satisfies DatosFeedbackGeneracionQr,
            panelClass: 'qr-generation-dialog'
          });
        }
      });
  }

  private abrirDialogoFeedback(data: DatosFeedbackGeneracionQr): void {
    this.cerrarDialogoFeedback();

    this.feedbackDialogRef = this.dialog.open(DialogoFeedbackGeneracionQrComponent, {
      width: '430px',
      disableClose: data.modo === 'loading',
      data,
      panelClass: 'qr-generation-dialog'
    });
  }

  private cerrarDialogoFeedback(): void {
    this.feedbackDialogRef?.close();
    this.feedbackDialogRef = undefined;
  }

  private cerrarDialogoCancelacion(): void {
    this.detenerIntentosPausaDecisionCancelacion();
    this.cancelDialogRef?.close();
    this.cancelDialogRef = undefined;
  }

  private iniciarIntentosPausaDecisionCancelacion(): void {
    this.detenerIntentosPausaDecisionCancelacion();

    this.pauseDecisionIntervalId = window.setInterval(() => {
      if (!this.cancelDialogRef || !this.currentJobId) {
        this.detenerIntentosPausaDecisionCancelacion();
        return;
      }

      if (this.progreso?.estado === 'RUNNING') {
        this.solicitarPausaParaDecisionCancelacion();
      }
    }, 250);
  }

  private detenerIntentosPausaDecisionCancelacion(): void {
    if (this.pauseDecisionIntervalId !== undefined) {
      window.clearInterval(this.pauseDecisionIntervalId);
      this.pauseDecisionIntervalId = undefined;
    }
  }

  private esEstadoActivoParaDecision(estado?: ProgresoGeneracionQr['estado']): boolean {
    return estado === 'RUNNING' || estado === 'PAUSING' || estado === 'PAUSED';
  }

  private obtenerLabelCursoSeleccionado(): string {
    return this.cursos.find(curso => curso.id === this.cursoSeleccionadoId)?.label ?? 'Curso seleccionado';
  }

  private obtenerLabelAlcance(alcance: AlcanceGeneracionQr | null): string {
    switch (alcance) {
      case 'ACTIVOS':
        return 'Estudiantes activos';
      case 'SIN_QR':
        return 'Estudiantes sin QR';
      case 'TODOS':
        return 'Generar a todos';
      default:
        return 'Alcance seleccionado';
    }
  }
}
