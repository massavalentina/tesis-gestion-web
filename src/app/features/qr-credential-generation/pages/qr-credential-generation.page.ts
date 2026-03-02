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
            <p class="eyebrow">Credenciales QR</p>
            <h1>Generación masiva</h1>
            <p class="subtitle">
              Seleccioná un curso, revisá el estado actual y ejecutá la generación.
            </p>
          </div>
        </div>

        <div class="controls">
          <mat-form-field appearance="outline">
            <mat-label>Curso</mat-label>
            <mat-select [(ngModel)]="cursoSeleccionadoId" (selectionChange)="alCambiarCurso()">
              <mat-option [value]="null">Todos los cursos</mat-option>
              <mat-option *ngFor="let curso of cursos" [value]="curso.id">
                {{ curso.label }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Alcance</mat-label>
            <mat-select [(ngModel)]="alcanceSeleccionado">
              <mat-option value="ACTIVOS">Estudiantes activos</mat-option>
              <mat-option value="SIN_QR">Estudiantes sin QR</mat-option>
              <mat-option value="TODOS">Generar a todos</mat-option>
            </mat-select>
          </mat-form-field>

          <button
            mat-raised-button
            color="primary"
            [disabled]="!puedeGenerar()"
            (click)="iniciarGeneracion()">
            Generar credenciales
          </button>
        </div>

        <p class="hint" *ngIf="!cursoSeleccionadoId">
          El resumen muestra todos los cursos. Para iniciar la generación tenés que elegir uno.
        </p>

        <p class="error" *ngIf="errorMensaje">{{ errorMensaje }}</p>

        <div class="summary-grid" *ngIf="resumen">
          <article class="summary-card">
            <span>Total alumnos activos</span>
            <strong>{{ resumen.totalAlumnosActivos }}</strong>
          </article>

          <article class="summary-card">
            <span>Total QR activos</span>
            <strong>{{ resumen.totalQrActivos }}</strong>
          </article>

          <article class="summary-card">
            <span>Pendientes de generar</span>
            <strong>{{ resumen.totalPendientesGenerar }}</strong>
          </article>
        </div>

        <div class="recommendation" *ngIf="resumen">
          <strong>Lectura sugerida:</strong> {{ construirSugerenciaResumen(resumen) }}
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
  private closeProgressDialogTimeoutId?: number;

  cursos: OpcionCurso[] = [];
  cursoSeleccionadoId: string | null = null;
  alcanceSeleccionado: AlcanceGeneracionQr = 'SIN_QR';
  resumen: ResumenGeneracionQr | null = null;
  progreso: ProgresoGeneracionQr | null = null;
  errorMensaje = '';
  cargandoResumen = false;
  ejecutandoJob = false;

  constructor(
    private servicio: ServicioGeneracionCredencialesQr,
    private dialog: MatDialog
  ) {
    this.destroyRef.onDestroy(() => {
      this.detenerPolling();
      this.cancelarCierreDialogoProgresoPendiente();
      this.cerrarDialogoProgreso();
    });
  }

  ngOnInit(): void {
    this.servicio.obtenerCursos()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: cursos => {
          this.cursos = cursos;
        },
        error: () => {
          this.errorMensaje = 'No se pudieron cargar los cursos.';
        }
      });

    this.cargarResumen();
  }

  alCambiarCurso(): void {
    this.detenerPolling();
    this.cancelarCierreDialogoProgresoPendiente();
    this.cerrarDialogoProgreso();
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
    if (!this.cursoSeleccionadoId || this.ejecutandoJob || !this.resumen) {
      return;
    }

    const dialogRef = this.dialog.open(DialogoConfirmacionGeneracionQrComponent, {
      width: '480px',
      data: this.construirDatosConfirmacion()
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
    if (!this.cursoSeleccionadoId || this.ejecutandoJob) {
      return;
    }

    this.errorMensaje = '';
    this.detenerPolling();
    this.cancelarCierreDialogoProgresoPendiente();
    this.progreso = null;
    this.ejecutandoJob = true;

    this.servicio.iniciarJob({
      idCurso: this.cursoSeleccionadoId,
      alcance: this.alcanceSeleccionado
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ jobId }) => {
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

          if (progresoNormalizado.estado === 'COMPLETED' || progresoNormalizado.estado === 'FAILED') {
            this.detenerPolling();
            this.ejecutandoJob = false;
            this.programarCierreDialogoProgreso(progresoNormalizado);
          }
        },
        error: error => {
          this.detenerPolling();
          this.ejecutandoJob = false;
          this.cancelarCierreDialogoProgresoPendiente();
          this.cerrarDialogoProgreso();
          this.errorMensaje = this.obtenerMensajeError(error, 'No se pudo consultar el progreso del job.');
        }
      });
  }

  puedeGenerar(): boolean {
    return !!this.cursoSeleccionadoId && !this.ejecutandoJob;
  }

  construirSugerenciaResumen(resumen: ResumenGeneracionQr): string {
    if (resumen.totalAlumnosActivos === 0) {
      return 'No hay estudiantes activos en el filtro actual.';
    }

    if (resumen.totalQrActivos === 0) {
      return 'No existen QRs activos. El alcance "Estudiantes activos" o "Estudiantes sin QR" debería cubrir el caso inicial.';
    }

    if (resumen.totalPendientesGenerar === 0) {
      return 'Todos los estudiantes activos ya tienen un QR activo. Usá "Generar a todos" solo si necesitás regenerarlos.';
    }

    return 'Hay alumnos con y sin QR activo. "Estudiantes sin QR" evita regenerar los ya vigentes; "Generar a todos" reemplaza los actuales.';
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
    return {
      curso: this.resumen?.cursoCodigo ?? this.obtenerLabelCursoSeleccionado(),
      alcance: this.obtenerLabelAlcance(this.alcanceSeleccionado),
      totalAlumnosActivos: this.resumen?.totalAlumnosActivos ?? 0,
      totalQrActivos: this.resumen?.totalQrActivos ?? 0,
      totalPendientesGenerar: this.resumen?.totalPendientesGenerar ?? 0
    };
  }

  private abrirDialogoProgreso(): void {
    this.cerrarDialogoProgreso();

    this.progressDialogRef = this.dialog.open(DialogoProgresoGeneracionQrComponent, {
      width: '520px',
      disableClose: true
    });

    this.progressDialogRef.componentInstance.progress = this.progreso;
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

  private programarCierreDialogoProgreso(progreso: ProgresoGeneracionQr): void {
    this.cancelarCierreDialogoProgresoPendiente();

    this.closeProgressDialogTimeoutId = window.setTimeout(() => {
      this.closeProgressDialogTimeoutId = undefined;
      this.cerrarDialogoProgreso();
      this.cargarResumen();
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
      }
    });
  }

  private obtenerLabelCursoSeleccionado(): string {
    return this.cursos.find(curso => curso.id === this.cursoSeleccionadoId)?.label ?? 'Curso seleccionado';
  }

  private obtenerLabelAlcance(alcance: AlcanceGeneracionQr): string {
    switch (alcance) {
      case 'ACTIVOS':
        return 'Estudiantes activos';
      case 'SIN_QR':
        return 'Estudiantes sin QR';
      case 'TODOS':
        return 'Generar a todos';
    }
  }
}
