import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, interval } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';
import {
  AlcanceEnvioQr,
  FilaEstadoEnvioQr,
  OpcionCursoEnvioQr,
  ProgresoEnvioQr,
  ResumenEnvioQr,
  TrabajoActivoEnvioQr
} from '../models/qr-credential-delivery.models';
import { ServicioEnvioCredencialesQr } from '../services/qr-credential-delivery.service';
import {
  DatosConfirmacionEnvioQr,
  DialogoConfirmacionEnvioQrComponent
} from '../components/confirm-delivery-dialog.component';
import {
  DatosConfirmacionEnvioIndividualQr,
  DialogoConfirmacionEnvioIndividualQrComponent
} from '../components/confirm-single-delivery-dialog.component';
import { DialogoProgresoEnvioQrComponent } from '../components/delivery-progress-dialog.component';
import { DialogoResultadoEnvioQrComponent } from '../components/delivery-result-dialog.component';
import {
  DatosCancelacionEnvioQr,
  DialogoCancelacionEnvioQrComponent
} from '../components/cancel-delivery-dialog.component';
import {
  DatosResultadoEnvioIndividualQr,
  DialogoResultadoEnvioIndividualQrComponent
} from '../components/single-delivery-result-dialog.component';
import { QrCredentialsSyncService } from '../../../core/services/qr-credentials-sync.service';
import { ObjectUrlRegistry } from '../../../utils/object-url-registry';

@Component({
  selector: 'app-qr-credential-delivery-page',
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
            <h1>Envío masivo</h1>
            <p class="subtitle">
              Seleccione un curso, revise el estado actual y ejecute el envío de credenciales.
            </p>
          </div>
        </div>

        <div class="controls">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Curso</mat-label>
            <mat-select
              [(ngModel)]="cursoSeleccionadoId"
              (selectionChange)="alCambiarCurso()"
              [disabled]="cursosCargando || iniciandoJob || tieneJobActivoSeleccionado()"
              panelClass="qr-select-panel">
              <mat-option [value]="null">Seleccione un curso</mat-option>
              <mat-option *ngFor="let curso of cursos" [value]="curso.id">
                {{ curso.label }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Alcance</mat-label>
            <mat-select
              [(ngModel)]="alcanceSeleccionado"
              (selectionChange)="cargarResumen()"
              [disabled]="!cursoSeleccionadoId || iniciandoJob || tieneJobActivoSeleccionado()"
              panelClass="qr-select-panel">
              <mat-option [value]="null">Seleccione un alcance</mat-option>
              <mat-option value="PENDIENTES">Solo pendientes</mat-option>
              <mat-option value="TODOS">Pendientes y ya enviados</mat-option>
            </mat-select>
          </mat-form-field>

          <button
            mat-raised-button
            color="primary"
            class="primary-action"
            [disabled]="botonPrincipalDeshabilitado()"
            (click)="manejarAccionPrincipal()">
            <span class="button-content">
              <span class="mini-spinner mini-spinner--button" *ngIf="mostrarSpinnerBotonPrincipal()"></span>
              {{ obtenerEtiquetaBotonPrincipal() }}
            </span>
          </button>
        </div>

        <div class="inline-loading" *ngIf="cursosCargando || resumenCargando">
          <span class="mini-spinner"></span>
          {{ cursosCargando ? 'Cargando cursos...' : 'Consultando resumen de envío...' }}
        </div>

        <p class="hint" *ngIf="cursoSeleccionadoId && !alcanceSeleccionado && !resumenCargando && !tieneJobActivoSeleccionado()">
          Seleccione el alcance del envío para habilitar la acción.
        </p>

        <p class="error" *ngIf="errorMensaje">{{ errorMensaje }}</p>

        <div class="summary-grid">
          <article class="summary-card">
            <span>Total tutores activos</span>
            <strong>{{ resumen?.totalTutoresPrincipales ?? 0 }}</strong>
          </article>

          <article class="summary-card">
            <span>Total QR enviados</span>
            <strong>{{ resumen?.totalQrEnviados ?? 0 }}</strong>
          </article>

          <article class="summary-card">
            <span>Pendientes de enviar</span>
            <strong>{{ resumen?.totalQrPendientesEnvio ?? 0 }}</strong>
          </article>
        </div>

      </section>
    </div>
  `,
  styleUrl: './qr-credential-delivery.page.css'
})
export class PaginaEnvioCredencialesQr implements OnInit {
  @Input() embedded = false;

  private readonly destroyRef = inject(DestroyRef);
  private pollingSubscription?: Subscription;
  private progressDialogRef?: MatDialogRef<DialogoProgresoEnvioQrComponent>;
  private cancelDialogRef?: MatDialogRef<DialogoCancelacionEnvioQrComponent>;
  private closeProgressDialogTimeoutId?: number;
  private readonly objectUrls = new ObjectUrlRegistry();

  cursos: OpcionCursoEnvioQr[] = [];
  cursoSeleccionadoId: string | null = null;
  alcanceSeleccionado: AlcanceEnvioQr | null = null;

  resumen: ResumenEnvioQr | null = null;
  cursosCargando = false;
  resumenCargando = false;
  iniciandoJob = false;
  ejecutandoJob = false;
  errorMensaje = '';

  jobsActivos: TrabajoActivoEnvioQr[] = [];
  progreso: ProgresoEnvioQr | null = null;
  currentJobId: string | null = null;
  currentJobCursoId: string | null = null;
  currentJobCursoCodigo: string | null = null;
  currentJobAlcance: AlcanceEnvioQr | null = null;
  enviandoAlumnoIds = new Set<string>();
  cancelacionSolicitada = false;
  pausaSolicitadaParaDecision = false;
  decisionCancelacionPendiente = false;

  constructor(
    private servicio: ServicioEnvioCredencialesQr,
    private dialog: MatDialog,
    private qrCredentialsSync: QrCredentialsSyncService
  ) {
    this.destroyRef.onDestroy(() => {
      this.detenerPolling();
      this.cancelarCierreDialogoProgresoPendiente();
      this.cerrarDialogoCancelacion();
      this.cerrarDialogoProgreso();
      this.liberarTodosObjectUrls();
      this.enviandoAlumnoIds.clear();
    });
  }

  ngOnInit(): void {
    this.qrCredentialsSync.generationUpdated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(cursoId => {
        if (this.cursoSeleccionadoId && this.cursoSeleccionadoId !== cursoId) {
          return;
        }

        this.cargarResumen();
    });

    this.cargarCursos();
    this.cargarJobsActivos(true);
    this.cargarResumen();
  }

  alCambiarCurso(): void {
    this.errorMensaje = '';

    if (!this.cursoSeleccionadoId) {
      this.alcanceSeleccionado = null;
    }

    const jobActivo = this.buscarJobActivoPorCursoSeleccionado();
    if (jobActivo) {
      this.alcanceSeleccionado = jobActivo.alcance;
      this.retomarJobActivo(jobActivo, false);
    }

    this.cargarResumen();
  }

  cargarResumen(): void {
    this.resumenCargando = true;

    this.servicio.obtenerResumen(this.cursoSeleccionadoId, this.alcanceSeleccionado)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: resumen => {
          this.resumen = resumen;
          this.resumenCargando = false;
        },
        error: error => {
          this.resumen = null;
          this.resumenCargando = false;
          this.errorMensaje = this.obtenerMensajeError(error, 'No se pudo cargar el resumen de envío.');
        }
      });
  }

  puedeIniciarEnvio(): boolean {
    return !!this.cursoSeleccionadoId
      && !!this.alcanceSeleccionado
      && !!this.resumen?.puedeIniciarEnvio
      && !this.resumenCargando
      && !this.iniciandoJob
      && !this.tieneJobActivoSeleccionado();
  }

  botonPrincipalDeshabilitado(): boolean {
    return this.iniciandoJob || (!this.tieneJobActivoSeleccionado() && !this.puedeIniciarEnvio());
  }

  mostrarSpinnerBotonPrincipal(): boolean {
    if (this.iniciandoJob) {
      return true;
    }

    return this.tieneJobActivoSeleccionado() && this.progreso?.estado !== 'PAUSED';
  }

  obtenerEtiquetaBotonPrincipal(): string {
    if (this.iniciandoJob) {
      return 'Iniciando envío...';
    }

    if (!this.tieneJobActivoSeleccionado()) {
      return 'Iniciar envío';
    }

    switch (this.progreso?.estado) {
      case 'PAUSED':
        return 'Ver envío pausado';
      case 'CANCELLING':
        return 'Ver cancelación en curso';
      default:
        return 'Ver envío en curso';
    }
  }

  manejarAccionPrincipal(): void {
    const jobActivo = this.buscarJobActivoPorCursoSeleccionado();

    if (jobActivo) {
      this.retomarJobActivo(jobActivo, true);
      return;
    }

    this.iniciarEnvio();
  }

  tieneJobActivoSeleccionado(): boolean {
    return !!this.cursoSeleccionadoId
      && !!this.currentJobId
      && this.currentJobCursoId === this.cursoSeleccionadoId
      && this.esEstadoJobActivo(this.progreso?.estado);
  }

  private iniciarEnvio(): void {
    if (!this.puedeIniciarEnvio() || !this.resumen) {
      return;
    }

    const dialogRef = this.dialog.open(DialogoConfirmacionEnvioQrComponent, {
      width: '500px',
      panelClass: 'qr-generation-dialog',
      data: this.construirDatosConfirmacion()
    });

    dialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(confirmado => {
        if (confirmado) {
          this.iniciarJobEnvio();
        }
      });
  }

  construirSugerenciaResumen(resumen: ResumenEnvioQr): string {
    if (resumen.totalQrPendientesEnvio === 0 && resumen.totalQrEnviados === 0) {
      return 'No hay credenciales listas para enviar en el curso seleccionado.';
    }

    if (resumen.totalQrPendientesEnvio === 0 && resumen.totalQrEnviados > 0) {
      return 'No hay pendientes en este momento. Solo se reenviarán credenciales si elige el alcance "Pendientes y ya enviados".';
    }

    if (resumen.totalSinQrGenerado > 0) {
      return 'Hay estudiantes sin QR generado. Si necesita un envío completo, primero genere los QR faltantes.';
    }

    return 'Hay credenciales pendientes de envío. Con el alcance "Solo pendientes" se evita reenviar las ya enviadas.';
  }

  private cargarCursos(): void {
    this.cursosCargando = true;

    this.servicio.obtenerCursos()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: cursos => {
          this.cursos = cursos;
          this.cursosCargando = false;

          if (this.cursos.length === 0) {
            this.errorMensaje = 'No hay cursos disponibles para enviar credenciales.';
            return;
          }
        },
        error: error => {
          this.cursosCargando = false;
          this.errorMensaje = this.obtenerMensajeError(error, 'No se pudieron cargar los cursos.');
        }
      });
  }

  private cargarJobsActivos(reconectar: boolean): void {
    this.servicio.obtenerJobsActivos()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: jobs => {
          this.jobsActivos = jobs;

          if (!reconectar) {
            return;
          }

          const jobActivo = this.resolverJobActivoParaReconectar(jobs);
          if (!jobActivo) {
            return;
          }

          const debeRecargarResumen = this.cursoSeleccionadoId !== jobActivo.idCurso || this.alcanceSeleccionado !== jobActivo.alcance;
          this.cursoSeleccionadoId = jobActivo.idCurso;
          this.alcanceSeleccionado = jobActivo.alcance;
          this.retomarJobActivo(jobActivo, false);

          if (debeRecargarResumen) {
            this.cargarResumen();
          }
        },
        error: () => {
          // Esta consulta solo intenta reenganchar un job existente.
          // Si falla, el módulo debe seguir usable sin mostrar un error bloqueante.
          this.jobsActivos = [];
        }
      });
  }

  private iniciarJobEnvio(): void {
    if (!this.cursoSeleccionadoId || !this.alcanceSeleccionado) {
      return;
    }

    const alcance = this.alcanceSeleccionado;
    this.errorMensaje = '';
    this.iniciandoJob = true;
    this.cancelacionSolicitada = false;
    this.pausaSolicitadaParaDecision = false;
    this.decisionCancelacionPendiente = false;
    this.cancelarCierreDialogoProgresoPendiente();
    this.cerrarDialogoCancelacion();

    this.servicio.iniciarJob({
      idCurso: this.cursoSeleccionadoId,
      alcance
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ jobId }) => {
          this.iniciandoJob = false;
          this.retomarJobActivo({
            jobId,
            idCurso: this.cursoSeleccionadoId!,
            cursoCodigo: this.resumen?.cursoCodigo ?? this.obtenerLabelCursoSeleccionado(),
            alcance,
            estado: 'RUNNING',
            total: this.obtenerTotalIntentosSegunAlcance(alcance),
            procesados: 0,
            enviados: 0,
            omitidos: 0,
            errores: 0,
            ultimoMensaje: 'Proceso iniciado.',
            inicio: new Date().toISOString()
          }, true);
        },
        error: error => {
          this.iniciandoJob = false;

          const jobActivo = this.obtenerJobActivoDesdeConflicto(error);
          if (jobActivo) {
            this.jobsActivos = this.reemplazarJobActivo(jobActivo);
            this.cursoSeleccionadoId = jobActivo.idCurso;
            this.alcanceSeleccionado = jobActivo.alcance;
            this.retomarJobActivo(jobActivo, true);
            return;
          }

          this.errorMensaje = this.obtenerMensajeError(error, 'No se pudo iniciar el envío.');
        }
      });
  }

  private iniciarPolling(jobId: string): void {
    this.detenerPolling();

    this.pollingSubscription = interval(1000)
      .pipe(
        startWith(0),
        switchMap(() => this.servicio.obtenerProgreso(jobId)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: progreso => {
          this.progreso = progreso;
          this.actualizarSnapshotJobActivo(progreso);
          this.actualizarDialogoProgreso(progreso);

          if (this.decisionCancelacionPendiente && progreso.estado === 'PAUSED') {
            this.abrirDialogoDecisionCancelacion();
          }

          if (progreso.estado === 'COMPLETED' || progreso.estado === 'FAILED' || progreso.estado === 'CANCELLED') {
            this.detenerPolling();
            this.ejecutandoJob = false;
            this.pausaSolicitadaParaDecision = false;
            this.decisionCancelacionPendiente = false;
            this.cerrarDialogoCancelacion();
            this.limpiarContextoJobActivo();
            this.programarCierreDialogoProgreso(progreso);
          }
        },
        error: error => {
          this.detenerPolling();
          this.iniciandoJob = false;
          this.ejecutandoJob = false;
          this.cancelacionSolicitada = false;
          this.pausaSolicitadaParaDecision = false;
          this.decisionCancelacionPendiente = false;
          this.cancelarCierreDialogoProgresoPendiente();
          this.cerrarDialogoCancelacion();
          this.cerrarDialogoProgreso();
          this.limpiarContextoJobActivo();
          this.errorMensaje = this.obtenerMensajeError(error, 'No se pudo consultar el progreso del envío.');
        }
      });
  }

  private abrirDialogoProgreso(): void {
    this.cerrarDialogoProgreso();

    this.progressDialogRef = this.dialog.open(DialogoProgresoEnvioQrComponent, {
      width: '520px',
      disableClose: true,
      panelClass: 'qr-generation-dialog'
    });

    this.progressDialogRef.componentInstance.progress = this.progreso;
    this.progressDialogRef.componentInstance.solicitarCancelacion
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.confirmarCancelacionEnvio());
  }

  private actualizarDialogoProgreso(progreso: ProgresoEnvioQr): void {
    if (this.progressDialogRef?.componentInstance) {
      this.progressDialogRef.componentInstance.progress = progreso;
    }
  }

  private cerrarDialogoProgreso(): void {
    this.progressDialogRef?.close();
    this.progressDialogRef = undefined;
  }

  private cerrarDialogoCancelacion(): void {
    this.cancelDialogRef?.close();
    this.cancelDialogRef = undefined;
  }

  private confirmarCancelacionEnvio(): void {
    if (!this.currentJobId || !this.progreso || this.cancelacionSolicitada) {
      return;
    }

    if (!this.esEstadoActivoParaDecision(this.progreso.estado)) {
      return;
    }

    this.decisionCancelacionPendiente = true;

    if (this.progreso.estado === 'RUNNING') {
      this.solicitarPausaParaDecisionCancelacion();
      return;
    }

    if (this.progreso.estado === 'PAUSED') {
      this.abrirDialogoDecisionCancelacion();
    }
  }

  private solicitarPausaParaDecisionCancelacion(): void {
    if (!this.currentJobId || this.pausaSolicitadaParaDecision || this.progreso?.estado !== 'RUNNING') {
      return;
    }

    this.pausaSolicitadaParaDecision = true;

    this.servicio.pausarJob(this.currentJobId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: progreso => {
          this.pausaSolicitadaParaDecision = false;
          this.progreso = progreso;
          this.actualizarDialogoProgreso(progreso);

          if (this.decisionCancelacionPendiente && progreso.estado === 'PAUSED') {
            this.abrirDialogoDecisionCancelacion();
          }
        },
        error: error => {
          this.pausaSolicitadaParaDecision = false;
          this.decisionCancelacionPendiente = false;
          this.errorMensaje = this.obtenerMensajeError(error, 'No se pudo pausar el envío para decidir la cancelación.');
        }
      });
  }

  private abrirDialogoDecisionCancelacion(): void {
    if (!this.currentJobId || !this.progreso || this.progreso.estado !== 'PAUSED') {
      return;
    }

    if (this.cancelDialogRef) {
      return;
    }

    const pendientesCancelar = Math.max(this.progreso.total - this.progreso.procesados, 0);
    this.cancelDialogRef = this.dialog.open(DialogoCancelacionEnvioQrComponent, {
      width: '500px',
      disableClose: true,
      panelClass: 'qr-generation-dialog',
      data: {
        procesados: this.progreso.procesados,
        total: this.progreso.total,
        enviados: this.progreso.enviados,
        pendientesCancelar
      } satisfies DatosCancelacionEnvioQr
    });

    this.cancelDialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(confirmado => {
        this.cancelDialogRef = undefined;
        this.decisionCancelacionPendiente = false;

        if (!this.currentJobId || !this.progreso || !this.esEstadoActivoParaDecision(this.progreso.estado)) {
          return;
        }

        if (confirmado) {
          this.ejecutarCancelacionEnvio();
          return;
        }

        this.reanudarEnvio();
      });
  }

  private reanudarEnvio(): void {
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
          this.errorMensaje = this.obtenerMensajeError(error, 'No se pudo reanudar el envío.');
        }
      });
  }

  private ejecutarCancelacionEnvio(): void {
    if (!this.currentJobId || this.cancelacionSolicitada) {
      return;
    }

    this.cancelacionSolicitada = true;
    this.pausaSolicitadaParaDecision = false;
    this.decisionCancelacionPendiente = false;

    this.servicio.cancelarJob(this.currentJobId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: progreso => {
          this.progreso = progreso;
          this.actualizarDialogoProgreso(progreso);
        },
        error: error => {
          this.cancelacionSolicitada = false;
          this.errorMensaje = this.obtenerMensajeError(error, 'No se pudo solicitar la cancelación del envío.');
        }
      });
  }

  private programarCierreDialogoProgreso(progreso: ProgresoEnvioQr): void {
    this.cancelarCierreDialogoProgresoPendiente();

    this.closeProgressDialogTimeoutId = window.setTimeout(() => {
      this.closeProgressDialogTimeoutId = undefined;
      this.cerrarDialogoProgreso();
      this.cargarResumen();
      this.cargarJobsActivos(false);

      if (this.cursoSeleccionadoId) {
        this.qrCredentialsSync.notifyDeliveryUpdated(this.cursoSeleccionadoId);
      }

      this.abrirDialogoResultado(progreso);
      this.cancelacionSolicitada = false;
      this.pausaSolicitadaParaDecision = false;
      this.decisionCancelacionPendiente = false;
    }, 700);
  }

  private cancelarCierreDialogoProgresoPendiente(): void {
    if (this.closeProgressDialogTimeoutId !== undefined) {
      window.clearTimeout(this.closeProgressDialogTimeoutId);
      this.closeProgressDialogTimeoutId = undefined;
    }
  }

  private abrirDialogoResultado(progreso: ProgresoEnvioQr): void {
    const fueCancelado = progreso.estado === 'CANCELLED';

    const datos = progreso.estado === 'FAILED'
      ? {
          titulo: 'El envío falló',
          mensaje: progreso.ultimoMensaje ?? 'El proceso no pudo completarse.',
          icono: 'error',
          color: 'warn' as const
        }
      : fueCancelado
        ? {
            titulo: 'Envío cancelado',
            mensaje: progreso.ultimoMensaje ?? 'El proceso se detuvo por solicitud del usuario.',
            icono: 'info',
            color: 'accent' as const
          }
        : progreso.errores > 0
          ? {
              titulo: 'Envío finalizado con observaciones',
              mensaje: progreso.ultimoMensaje ?? 'El proceso terminó con errores parciales.',
              icono: 'warning',
              color: 'accent' as const
            }
          : {
              titulo: 'Envío finalizado',
              mensaje: progreso.ultimoMensaje ?? 'Las credenciales se enviaron correctamente.',
              icono: 'check_circle',
              color: 'primary' as const
            };

    this.dialog.open(DialogoResultadoEnvioQrComponent, {
      width: '460px',
      panelClass: 'qr-generation-dialog',
      data: {
        ...datos,
        enviados: progreso.enviados,
        omitidos: progreso.omitidos,
        errores: progreso.errores,
        detallesErrores: (progreso.detallesErrores ?? []).slice(-10)
      }
    });
  }

  private detenerPolling(): void {
    this.pollingSubscription?.unsubscribe();
    this.pollingSubscription = undefined;
  }

  private esEstadoActivoParaDecision(estado?: ProgresoEnvioQr['estado']): boolean {
    return estado === 'RUNNING' || estado === 'PAUSING' || estado === 'PAUSED';
  }

  private esEstadoJobActivo(estado?: ProgresoEnvioQr['estado'] | TrabajoActivoEnvioQr['estado']): boolean {
    return estado === 'RUNNING' || estado === 'PAUSING' || estado === 'PAUSED' || estado === 'CANCELLING';
  }

  private buscarJobActivoPorCursoSeleccionado(): TrabajoActivoEnvioQr | null {
    if (!this.cursoSeleccionadoId) {
      return null;
    }

    return this.jobsActivos.find(job => job.idCurso === this.cursoSeleccionadoId) ?? null;
  }

  private resolverJobActivoParaReconectar(jobs: TrabajoActivoEnvioQr[]): TrabajoActivoEnvioQr | null {
    if (this.cursoSeleccionadoId) {
      return jobs.find(job => job.idCurso === this.cursoSeleccionadoId) ?? null;
    }

    return jobs[0] ?? null;
  }

  private retomarJobActivo(job: TrabajoActivoEnvioQr, abrirDialogo: boolean): void {
    const mismoJob = this.currentJobId === job.jobId;

    this.iniciandoJob = false;
    this.currentJobId = job.jobId;
    this.currentJobCursoId = job.idCurso;
    this.currentJobCursoCodigo = job.cursoCodigo;
    this.currentJobAlcance = job.alcance;
    this.ejecutandoJob = true;
    this.progreso = this.crearProgresoDesdeJobActivo(job);

    if (!mismoJob || !this.pollingSubscription) {
      this.iniciarPolling(job.jobId);
    }

    if (abrirDialogo) {
      this.abrirDialogoProgreso();
    }
  }

  private crearProgresoDesdeJobActivo(job: TrabajoActivoEnvioQr): ProgresoEnvioQr {
    return {
      jobId: job.jobId,
      estado: job.estado,
      total: job.total,
      procesados: job.procesados,
      enviados: job.enviados,
      omitidos: job.omitidos,
      errores: job.errores,
      ultimoMensaje: job.ultimoMensaje ?? null,
      ultimoDestino: null,
      ultimoEstudiante: null,
      detallesErrores: null,
      inicio: job.inicio,
      fin: null
    };
  }

  private actualizarSnapshotJobActivo(progreso: ProgresoEnvioQr): void {
    if (!this.currentJobId || !this.currentJobCursoId || !this.currentJobAlcance) {
      return;
    }

    const snapshot: TrabajoActivoEnvioQr = {
      jobId: progreso.jobId,
      idCurso: this.currentJobCursoId,
      cursoCodigo: this.currentJobCursoCodigo ?? this.obtenerLabelCursoSeleccionado(),
      alcance: this.currentJobAlcance,
      estado: progreso.estado as TrabajoActivoEnvioQr['estado'],
      total: progreso.total,
      procesados: progreso.procesados,
      enviados: progreso.enviados,
      omitidos: progreso.omitidos,
      errores: progreso.errores,
      ultimoMensaje: progreso.ultimoMensaje ?? null,
      inicio: progreso.inicio
    };

    this.jobsActivos = this.jobsActivos.filter(job => job.jobId !== progreso.jobId);

    if (this.esEstadoJobActivo(progreso.estado)) {
      this.jobsActivos = [snapshot, ...this.jobsActivos];
    }
  }

  private limpiarContextoJobActivo(): void {
    if (this.currentJobId) {
      this.jobsActivos = this.jobsActivos.filter(job => job.jobId !== this.currentJobId);
    }

    this.currentJobId = null;
    this.currentJobCursoId = null;
    this.currentJobCursoCodigo = null;
    this.currentJobAlcance = null;
  }

  private obtenerTotalIntentosSegunAlcance(alcance: AlcanceEnvioQr): number {
    return alcance === 'TODOS'
      ? (this.resumen?.totalQrPendientesEnvio ?? 0) + (this.resumen?.totalQrEnviados ?? 0)
      : this.resumen?.totalQrPendientesEnvio ?? 0;
  }

  private obtenerJobActivoDesdeConflicto(error: unknown): TrabajoActivoEnvioQr | null {
    if (!(error instanceof HttpErrorResponse) || error.status !== 409) {
      return null;
    }

    return error.error?.activeJob ?? null;
  }

  private reemplazarJobActivo(jobActivo: TrabajoActivoEnvioQr): TrabajoActivoEnvioQr[] {
    return [
      jobActivo,
      ...this.jobsActivos.filter(job => job.jobId !== jobActivo.jobId)
    ];
  }

  private construirDatosConfirmacion(): DatosConfirmacionEnvioQr {
    const { etiquetaIntento, totalIntentos, mensajeAlcance } = this.obtenerResumenIntentoEnvio();

    return {
      curso: this.resumen?.cursoCodigo ?? this.obtenerLabelCursoSeleccionado(),
      alcance: this.obtenerLabelAlcance(this.alcanceSeleccionado),
      etiquetaIntento,
      totalIntentos,
      sinQr: this.resumen?.totalSinQrGenerado ?? 0,
      sinTutor: this.resumen?.totalSinTutorPrincipal ?? 0,
      emailInvalido: this.resumen?.totalEmailInvalido ?? 0,
      mensajeAlcance
    };
  }

  private obtenerResumenIntentoEnvio(): {
    etiquetaIntento: string;
    totalIntentos: number;
    mensajeAlcance: string;
  } {
    switch (this.alcanceSeleccionado) {
      case 'TODOS':
        return {
          etiquetaIntento: 'Se intentará enviar',
          totalIntentos: (this.resumen?.totalQrPendientesEnvio ?? 0) + (this.resumen?.totalQrEnviados ?? 0),
          mensajeAlcance: 'Se enviarán las credenciales pendientes y también las que ya han sido enviadas disponibles.'
        };
      case 'PENDIENTES':
        return {
          etiquetaIntento: 'Se intentará enviar',
          totalIntentos: this.resumen?.totalQrPendientesEnvio ?? 0,
          mensajeAlcance: 'Solo se enviarán las credenciales pendientes. Las ya enviadas no se reenviarán en este alcance.'
        };
      default:
        return {
          etiquetaIntento: 'Se intentará enviar',
          totalIntentos: 0,
          mensajeAlcance: 'Revise el alcance antes de iniciar el envío.'
        };
    }
  }

  private obtenerLabelCursoSeleccionado(): string {
    return this.cursos.find(curso => curso.id === this.cursoSeleccionadoId)?.label ?? 'Curso seleccionado';
  }

  private obtenerLabelAlcance(alcance: AlcanceEnvioQr | null): string {
    switch (alcance) {
      case 'TODOS':
        return 'Pendientes y enviados';
      case 'PENDIENTES':
        return 'Solo pendientes';
      default:
        return 'Alcance seleccionado';
    }
  }

  private obtenerMensajeError(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      return typeof error.error === 'string' ? error.error : error.error?.message ?? fallback;
    }

    return fallback;
  }

  private crearObjectUrl(blob: Blob): string {
    return this.objectUrls.create(blob);
  }

  private liberarObjectUrl(url: string): void {
    this.objectUrls.revoke(url);
  }

  private liberarTodosObjectUrls(): void {
    this.objectUrls.clear();
  }

  private construirNombreArchivoQr(row: FilaEstadoEnvioQr): string {
    const base = (row.dni || row.idEstudiante).replace(/[^a-zA-Z0-9_-]/g, '');
    return `credencial-${base || row.idEstudiante}.png`;
  }
}
