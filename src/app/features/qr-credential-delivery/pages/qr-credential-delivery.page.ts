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
  OpcionCursoEnvioQr,
  ProgresoEnvioQr,
  ResumenEnvioQr
} from '../models/qr-credential-delivery.models';
import { ServicioEnvioCredencialesQr } from '../services/qr-credential-delivery.service';
import {
  DatosConfirmacionEnvioQr,
  DialogoConfirmacionEnvioQrComponent
} from '../components/confirm-delivery-dialog.component';
import { DialogoProgresoEnvioQrComponent } from '../components/delivery-progress-dialog.component';
import { DialogoResultadoEnvioQrComponent } from '../components/delivery-result-dialog.component';
import {
  DatosCancelacionEnvioQr,
  DialogoCancelacionEnvioQrComponent
} from '../components/cancel-delivery-dialog.component';
import { QrCredentialsSyncService } from '../../../core/services/qr-credentials-sync.service';

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
            <p class="eyebrow">Credenciales QR</p>
            <h1>Envío masivo</h1>
            <p class="subtitle">
              Seleccioná curso, revisá el estado actual y ejecutá el envío de credenciales.
            </p>
          </div>
        </div>

        <div class="controls">
          <mat-form-field appearance="outline">
            <mat-label>Curso</mat-label>
            <mat-select [(ngModel)]="cursoSeleccionadoId" (selectionChange)="alCambiarCurso()">
              <mat-option [value]="null">Seleccioná un curso</mat-option>
              <mat-option *ngFor="let curso of cursos" [value]="curso.id">
                {{ curso.label }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Alcance</mat-label>
            <mat-select [(ngModel)]="alcanceSeleccionado" (selectionChange)="cargarResumen()">
              <mat-option value="PENDIENTES">Solo pendientes</mat-option>
              <mat-option value="TODOS">Pendientes y ya enviados</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <p class="hint" *ngIf="!cursoSeleccionadoId">
          Para consultar resumen y ejecutar el envío, seleccioná un curso.
        </p>

        <p class="error" *ngIf="errorMensaje">{{ errorMensaje }}</p>

        <p class="hint" *ngIf="resumenCargando">Cargando resumen...</p>

        <div class="summary-grid" *ngIf="resumen">
          <article class="summary-card">
            <span>Total tutores activos</span>
            <strong>{{ resumen.totalTutoresPrincipales }}</strong>
          </article>

          <article class="summary-card">
            <span>QRs pendientes de enviar</span>
            <strong>{{ resumen.totalQrPendientesEnvio }}</strong>
          </article>

          <article class="summary-card">
            <span>Total QRs enviados</span>
            <strong>{{ resumen.totalQrEnviados }}</strong>
          </article>
        </div>

        <div class="recommendation" *ngIf="resumen">
          <strong>Lectura sugerida:</strong> {{ construirSugerenciaResumen(resumen) }}
        </div>

        <div class="footer" *ngIf="resumen">
          <div class="meta">
            Candidatos según alcance: <strong>{{ resumen.totalCandidatosSegunAlcance }}</strong>
            | Estimación: <strong>{{ resumen.estimacionSegundos }}s</strong>
          </div>

          <button
            mat-raised-button
            color="primary"
            [disabled]="!puedeIniciarEnvio()"
            (click)="iniciarEnvio()">
            Iniciar envío
          </button>
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
  private closeProgressDialogTimeoutId?: number;

  cursos: OpcionCursoEnvioQr[] = [];
  cursoSeleccionadoId: string | null = null;
  alcanceSeleccionado: AlcanceEnvioQr = 'PENDIENTES';

  resumen: ResumenEnvioQr | null = null;
  resumenCargando = false;
  ejecutandoJob = false;
  errorMensaje = '';

  progreso: ProgresoEnvioQr | null = null;
  currentJobId: string | null = null;
  cancelacionSolicitada = false;

  constructor(
    private servicio: ServicioEnvioCredencialesQr,
    private dialog: MatDialog,
    private qrCredentialsSync: QrCredentialsSyncService
  ) {
    this.destroyRef.onDestroy(() => {
      this.detenerPolling();
      this.cancelarCierreDialogoProgresoPendiente();
      this.cerrarDialogoProgreso();
    });
  }

  ngOnInit(): void {
    this.qrCredentialsSync.generationUpdated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(cursoId => {
        if (!this.cursoSeleccionadoId || this.cursoSeleccionadoId !== cursoId) {
          return;
        }

        this.cargarResumen();
      });

    this.cargarCursos();
  }

  alCambiarCurso(): void {
    this.errorMensaje = '';
    this.cargarResumen();
  }

  cargarResumen(): void {
    if (!this.cursoSeleccionadoId) {
      this.resumen = null;
      return;
    }

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
    return !!this.cursoSeleccionadoId && !!this.resumen?.puedeIniciarEnvio && !this.ejecutandoJob;
  }

  iniciarEnvio(): void {
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
      return 'No hay pendientes en este momento. Solo se reenviarán credenciales si elegís alcance "Pendientes y ya enviados".';
    }

    if (resumen.totalSinQrGenerado > 0) {
      return 'Hay estudiantes sin QR generado. Si necesitás un envío completo, primero generá los QR faltantes.';
    }

    return 'Hay credenciales pendientes de envío. Con alcance "Solo pendientes" evitás reenviar las ya enviadas.';
  }

  private cargarCursos(): void {
    this.servicio.obtenerCursos()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: cursos => {
          this.cursos = cursos;

          if (this.cursos.length === 0) {
            this.errorMensaje = 'No hay cursos disponibles para enviar credenciales.';
            return;
          }

          if (!this.cursoSeleccionadoId) {
            this.cursoSeleccionadoId = this.cursos[0].id;
          }

          this.cargarResumen();
        },
        error: error => {
          this.errorMensaje = this.obtenerMensajeError(error, 'No se pudieron cargar los cursos.');
        }
      });
  }

  private iniciarJobEnvio(): void {
    if (!this.cursoSeleccionadoId) {
      return;
    }

    this.errorMensaje = '';
    this.ejecutandoJob = true;
    this.progreso = null;
    this.cancelacionSolicitada = false;
    this.detenerPolling();
    this.cancelarCierreDialogoProgresoPendiente();

    this.servicio.iniciarJob({
      idCurso: this.cursoSeleccionadoId,
      alcance: this.alcanceSeleccionado
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
          this.actualizarDialogoProgreso(progreso);

          if (progreso.estado === 'COMPLETED' || progreso.estado === 'FAILED') {
            this.detenerPolling();
            this.ejecutandoJob = false;
            this.currentJobId = null;
            this.programarCierreDialogoProgreso(progreso);
          }
        },
        error: error => {
          this.detenerPolling();
          this.ejecutandoJob = false;
          this.currentJobId = null;
          this.cancelacionSolicitada = false;
          this.cancelarCierreDialogoProgresoPendiente();
          this.cerrarDialogoProgreso();
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

  private confirmarCancelacionEnvio(): void {
    if (!this.currentJobId || !this.progreso || this.progreso.estado !== 'RUNNING' || this.cancelacionSolicitada) {
      return;
    }

    const pendientesCancelar = Math.max(this.progreso.total - this.progreso.procesados, 0);
    const dialogRef = this.dialog.open(DialogoCancelacionEnvioQrComponent, {
      width: '500px',
      panelClass: 'qr-generation-dialog',
      data: {
        procesados: this.progreso.procesados,
        total: this.progreso.total,
        enviados: this.progreso.enviados,
        pendientesCancelar
      } satisfies DatosCancelacionEnvioQr
    });

    dialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(confirmado => {
        if (confirmado) {
          this.ejecutarCancelacionEnvio();
        }
      });
  }

  private ejecutarCancelacionEnvio(): void {
    if (!this.currentJobId || this.cancelacionSolicitada) {
      return;
    }

    this.cancelacionSolicitada = true;

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

      if (this.cursoSeleccionadoId) {
        this.qrCredentialsSync.notifyDeliveryUpdated(this.cursoSeleccionadoId);
      }

      this.abrirDialogoResultado(progreso);
      this.cancelacionSolicitada = false;
    }, 700);
  }

  private cancelarCierreDialogoProgresoPendiente(): void {
    if (this.closeProgressDialogTimeoutId !== undefined) {
      window.clearTimeout(this.closeProgressDialogTimeoutId);
      this.closeProgressDialogTimeoutId = undefined;
    }
  }

  private abrirDialogoResultado(progreso: ProgresoEnvioQr): void {
    const fueCancelado = (progreso.ultimoMensaje ?? '').toUpperCase().includes('CANCEL');

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

  private construirDatosConfirmacion(): DatosConfirmacionEnvioQr {
    return {
      curso: this.resumen?.cursoCodigo ?? this.obtenerLabelCursoSeleccionado(),
      alcance: this.obtenerLabelAlcance(this.alcanceSeleccionado),
      totalCandidatos: this.resumen?.totalCandidatosSegunAlcance ?? 0,
      pendientes: this.resumen?.totalQrPendientesEnvio ?? 0,
      enviados: this.resumen?.totalQrEnviados ?? 0,
      sinQr: this.resumen?.totalSinQrGenerado ?? 0,
      sinTutor: this.resumen?.totalSinTutorPrincipal ?? 0,
      emailInvalido: this.resumen?.totalEmailInvalido ?? 0
    };
  }

  private obtenerLabelCursoSeleccionado(): string {
    return this.cursos.find(curso => curso.id === this.cursoSeleccionadoId)?.label ?? 'Curso seleccionado';
  }

  private obtenerLabelAlcance(alcance: AlcanceEnvioQr): string {
    switch (alcance) {
      case 'TODOS':
        return 'Pendientes y enviados';
      case 'PENDIENTES':
        return 'Solo pendientes';
    }
  }

  private obtenerMensajeError(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      return typeof error.error === 'string' ? error.error : error.error?.message ?? fallback;
    }

    return fallback;
  }
}
