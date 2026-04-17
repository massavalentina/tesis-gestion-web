import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, interval } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';
import {
  AlcanceEnvioQr,
  EstadoFilaEnvioQr,
  EstadoFiltroEnvioQr,
  FilaEstadoEnvioQr,
  OpcionCursoEnvioQr,
  ProgresoEnvioQr,
  ResumenEnvioQr
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
  DatosPreviewQrAlumno,
  DialogoPreviewQrAlumnoComponent
} from '../components/delivery-qr-preview-dialog.component';
import {
  DatosResultadoEnvioIndividualQr,
  DialogoResultadoEnvioIndividualQrComponent
} from '../components/single-delivery-result-dialog.component';
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
    MatIconModule,
    MatInputModule,
    MatSelectModule
  ],
  template: `
    <div class="page-shell" [class.page-shell--embedded]="embedded">
      <section class="panel" [class.panel--embedded]="embedded">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Credenciales QR</p>
            <h1>Envio masivo</h1>
            <p class="subtitle">
              Selecciona curso, revisa el estado actual y ejecuta el envio de credenciales.
            </p>
          </div>
        </div>

        <div class="controls">
          <mat-form-field appearance="outline">
            <mat-label>Curso</mat-label>
            <mat-select [(ngModel)]="cursoSeleccionadoId" (selectionChange)="alCambiarCurso()">
              <mat-option [value]="null">Selecciona un curso</mat-option>
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
          Para consultar resumen y estado, selecciona un curso.
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
            Candidatos segun alcance: <strong>{{ resumen.totalCandidatosSegunAlcance }}</strong>
            | Estimacion: <strong>{{ resumen.estimacionSegundos }}s</strong>
          </div>

          <button
            mat-raised-button
            color="primary"
            [disabled]="!puedeIniciarEnvio()"
            (click)="iniciarEnvio()">
            Iniciar envio
          </button>
        </div>

        <div class="table-section" *ngIf="cursoSeleccionadoId">
          <div class="table-header">
            <h3>Estado de credenciales por estudiante</h3>
          </div>

          <div class="table-filters">
            <mat-form-field appearance="outline">
              <mat-label>Estado</mat-label>
              <mat-select [(ngModel)]="estadoSeleccionado" (selectionChange)="aplicarFiltros()">
                <mat-option value="TODOS">Todos</mat-option>
                <mat-option value="PENDIENTE_ENVIO">Pendiente envio</mat-option>
                <mat-option value="ENVIADO">Enviado</mat-option>
                <mat-option value="SIN_QR">Sin QR</mat-option>
                <mat-option value="SIN_TUTOR_PRINCIPAL">Sin tutor principal</mat-option>
                <mat-option value="EMAIL_INVALIDO">Email invalido</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="search-field">
              <mat-label>Buscar</mat-label>
              <input
                matInput
                [(ngModel)]="busqueda"
                (keyup.enter)="aplicarFiltros()"
                placeholder="Nombre, DNI o email" />
            </mat-form-field>

            <button mat-stroked-button (click)="aplicarFiltros()">Buscar</button>
            <button mat-stroked-button (click)="limpiarBusqueda()">Limpiar</button>
          </div>

          <p class="hint" *ngIf="tablaCargando">Cargando estudiantes...</p>

          <div class="table-wrap" *ngIf="!tablaCargando">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>DNI</th>
                  <th>Tutor</th>
                  <th>Email tutor</th>
                  <th>Estado</th>
                  <th>Fecha QR</th>
                  <th class="actions-col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of alumnos">
                  <td>{{ row.nombreCompleto }}</td>
                  <td>{{ row.dni }}</td>
                  <td>{{ row.tutorPrincipalNombre || '-' }}</td>
                  <td>{{ row.tutorPrincipalEmail || '-' }}</td>
                  <td>
                    <span class="chip" [ngClass]="estadoClass(row.estado)">
                      {{ estadoLabel(row.estado) }}
                    </span>
                  </td>
                  <td>{{ formatearFecha(row.fechaGeneracionQr) }}</td>
                  <td class="actions-col">
                    <button
                      mat-icon-button
                      [disabled]="!puedeEnviarQr(row) || ejecutandoJob || enviandoAlumnoIds.has(row.idEstudiante)"
                      (click)="enviarQr(row)"
                      [title]="row.estado === 'ENVIADO' ? 'Reenviar QR por email' : 'Enviar QR por email'"
                      [attr.aria-label]="row.estado === 'ENVIADO' ? 'Reenviar QR' : 'Enviar QR'">
                      <mat-icon>{{ enviandoAlumnoIds.has(row.idEstudiante) ? 'hourglass_top' : 'send' }}</mat-icon>
                    </button>
                    <button
                      mat-icon-button
                      [disabled]="!puedeGestionarQr(row)"
                      (click)="previsualizarQr(row)"
                      title="Previsualizar QR"
                      aria-label="Previsualizar QR">
                      <mat-icon>visibility</mat-icon>
                    </button>
                    <button
                      mat-icon-button
                      [disabled]="!puedeGestionarQr(row)"
                      (click)="descargarQr(row)"
                      title="Descargar QR"
                      aria-label="Descargar QR">
                      <mat-icon>download</mat-icon>
                    </button>
                  </td>
                </tr>

                <tr *ngIf="alumnos.length === 0">
                  <td colspan="7" class="empty">No hay resultados para los filtros seleccionados.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="pagination" *ngIf="!tablaCargando && totalPaginas > 0">
            <button mat-stroked-button (click)="irPaginaAnterior()" [disabled]="!puedePaginaAnterior()">
              Anterior
            </button>
            <span>Pagina {{ paginaActual }} de {{ totalPaginas }}</span>
            <button mat-stroked-button (click)="irPaginaSiguiente()" [disabled]="!puedePaginaSiguiente()">
              Siguiente
            </button>
          </div>
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
  private objectUrls = new Set<string>();

  cursos: OpcionCursoEnvioQr[] = [];
  cursoSeleccionadoId: string | null = null;
  alcanceSeleccionado: AlcanceEnvioQr = 'PENDIENTES';
  estadoSeleccionado: EstadoFiltroEnvioQr = 'TODOS';

  resumen: ResumenEnvioQr | null = null;
  alumnos: FilaEstadoEnvioQr[] = [];

  paginaActual = 1;
  readonly pageSize = 20;
  totalPaginas = 0;
  totalItems = 0;

  busqueda = '';
  readonly rutaTemplateEjemplo = 'tesis-gestion-api/TesisGestorApi/Templates/qr-credential-email-template.example.html';

  resumenCargando = false;
  tablaCargando = false;
  ejecutandoJob = false;
  errorMensaje = '';

  progreso: ProgresoEnvioQr | null = null;
  currentJobId: string | null = null;
  enviandoAlumnoIds = new Set<string>();

  constructor(
    private servicio: ServicioEnvioCredencialesQr,
    private dialog: MatDialog,
    private qrCredentialsSync: QrCredentialsSyncService
  ) {
    this.destroyRef.onDestroy(() => {
      this.detenerPolling();
      this.cancelarCierreDialogoProgresoPendiente();
      this.cerrarDialogoProgreso();
      this.liberarTodosObjectUrls();
      this.enviandoAlumnoIds.clear();
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
        this.cargarAlumnos();
      });

    this.cargarCursos();
  }

  alCambiarCurso(): void {
    this.paginaActual = 1;
    this.estadoSeleccionado = 'TODOS';
    this.busqueda = '';
    this.errorMensaje = '';
    this.cargarDatosCurso();
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
          this.errorMensaje = this.obtenerMensajeError(error, 'No se pudo cargar el resumen de envio.');
        }
      });
  }

  aplicarFiltros(): void {
    this.paginaActual = 1;
    this.cargarAlumnos();
  }

  limpiarBusqueda(): void {
    this.busqueda = '';
    this.aplicarFiltros();
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

  irPaginaAnterior(): void {
    if (!this.puedePaginaAnterior()) {
      return;
    }

    this.paginaActual -= 1;
    this.cargarAlumnos();
  }

  irPaginaSiguiente(): void {
    if (!this.puedePaginaSiguiente()) {
      return;
    }

    this.paginaActual += 1;
    this.cargarAlumnos();
  }

  puedePaginaAnterior(): boolean {
    return this.paginaActual > 1;
  }

  puedePaginaSiguiente(): boolean {
    return this.totalPaginas > 0 && this.paginaActual < this.totalPaginas;
  }

  estadoLabel(estado: EstadoFilaEnvioQr): string {
    switch (estado) {
      case 'ENVIADO':
        return 'Enviado';
      case 'PENDIENTE_ENVIO':
        return 'Pendiente envio';
      case 'SIN_QR':
        return 'Sin QR';
      case 'SIN_TUTOR_PRINCIPAL':
        return 'Sin tutor principal';
      case 'EMAIL_INVALIDO':
        return 'Email invalido';
    }
  }

  estadoClass(estado: EstadoFilaEnvioQr): string {
    switch (estado) {
      case 'ENVIADO':
        return 'chip-ok';
      case 'PENDIENTE_ENVIO':
        return 'chip-pending';
      case 'SIN_QR':
        return 'chip-error';
      case 'SIN_TUTOR_PRINCIPAL':
        return 'chip-warning';
      case 'EMAIL_INVALIDO':
        return 'chip-warning';
    }
  }

  construirSugerenciaResumen(resumen: ResumenEnvioQr): string {
    if (resumen.totalQrPendientesEnvio === 0 && resumen.totalQrEnviados === 0) {
      return 'No hay credenciales listas para enviar en el curso seleccionado.';
    }

    if (resumen.totalQrPendientesEnvio === 0 && resumen.totalQrEnviados > 0) {
      return 'No hay pendientes en este momento. Solo se reenviaran credenciales si elegis alcance "Pendientes y ya enviados".';
    }

    if (resumen.totalSinQrGenerado > 0) {
      return 'Hay estudiantes sin QR generado. Si necesitás un envio completo, primero generá los QR faltantes.';
    }

    return 'Hay credenciales pendientes de envio. Con alcance "Solo pendientes" evitas reenviar las ya enviadas.';
  }

  puedeGestionarQr(row: FilaEstadoEnvioQr): boolean {
    return row.estado !== 'SIN_QR';
  }

  puedeEnviarQr(row: FilaEstadoEnvioQr): boolean {
    return row.estado === 'PENDIENTE_ENVIO' || row.estado === 'ENVIADO';
  }

  formatearFecha(fecha?: string | null): string {
    if (!fecha) {
      return '-';
    }

    const parsed = new Date(fecha);

    if (Number.isNaN(parsed.getTime())) {
      return '-';
    }

    return parsed.toLocaleDateString('es-AR');
  }

  previsualizarQr(row: FilaEstadoEnvioQr): void {
    if (!this.puedeGestionarQr(row)) {
      return;
    }

    this.servicio.obtenerImagenQrAlumno(row.idEstudiante)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: blob => {
          const imageUrl = this.crearObjectUrl(blob);
          const dialogRef = this.dialog.open(DialogoPreviewQrAlumnoComponent, {
            width: '460px',
            panelClass: 'qr-generation-dialog',
            data: {
              nombreCompleto: row.nombreCompleto,
              imageUrl
            } satisfies DatosPreviewQrAlumno
          });

          dialogRef.afterClosed()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
              this.liberarObjectUrl(imageUrl);
            });
        },
        error: error => {
          this.errorMensaje = this.obtenerMensajeError(error, 'No se pudo previsualizar el QR del alumno.');
        }
      });
  }

  descargarQr(row: FilaEstadoEnvioQr): void {
    if (!this.puedeGestionarQr(row)) {
      return;
    }

    this.servicio.obtenerImagenQrAlumno(row.idEstudiante)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: blob => {
          const imageUrl = this.crearObjectUrl(blob);
          const link = document.createElement('a');
          link.href = imageUrl;
          link.download = this.construirNombreArchivoQr(row);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.setTimeout(() => this.liberarObjectUrl(imageUrl), 0);
        },
        error: error => {
          this.errorMensaje = this.obtenerMensajeError(error, 'No se pudo descargar el QR del alumno.');
        }
      });
  }

  enviarQr(row: FilaEstadoEnvioQr): void {
    if (!this.cursoSeleccionadoId || !this.puedeEnviarQr(row) || this.enviandoAlumnoIds.has(row.idEstudiante)) {
      return;
    }

    const dialogRef = this.dialog.open(DialogoConfirmacionEnvioIndividualQrComponent, {
      width: '460px',
      panelClass: 'qr-generation-dialog',
      data: this.construirDatosConfirmacionIndividual(row)
    });

    dialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: confirmado => {
          if (confirmado) {
            this.ejecutarEnvioIndividual(row);
          }
        }
      });
  }

  private construirDatosConfirmacionIndividual(row: FilaEstadoEnvioQr): DatosConfirmacionEnvioIndividualQr {
    return {
      curso: this.resumen?.cursoCodigo ?? this.obtenerLabelCursoSeleccionado(),
      alumno: row.nombreCompleto,
      dni: row.dni,
      tutorEmail: row.tutorPrincipalEmail ?? '-',
      esReenvio: row.estado === 'ENVIADO'
    };
  }

  private ejecutarEnvioIndividual(row: FilaEstadoEnvioQr): void {
    if (!this.cursoSeleccionadoId || this.enviandoAlumnoIds.has(row.idEstudiante)) {
      return;
    }

    this.errorMensaje = '';
    this.enviandoAlumnoIds.add(row.idEstudiante);

    this.servicio.enviarAlumno(row.idEstudiante, {
      idCurso: this.cursoSeleccionadoId
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.enviandoAlumnoIds.delete(row.idEstudiante);
          this.cargarResumen();
          this.cargarAlumnos();
          this.abrirDialogoResultadoEnvioIndividual({
            titulo: row.estado === 'ENVIADO' ? 'Reenvío realizado' : 'Envío realizado',
            mensaje: response.mensaje || 'La credencial QR se envió correctamente.',
            destino: response.destino ?? row.tutorPrincipalEmail ?? null,
            modo: 'success'
          });
        },
        error: error => {
          this.enviandoAlumnoIds.delete(row.idEstudiante);
          const mensajeError = this.obtenerMensajeError(error, 'No se pudo enviar la credencial del alumno.');
          this.errorMensaje = mensajeError;
          this.abrirDialogoResultadoEnvioIndividual({
            titulo: 'No se pudo completar la operación',
            mensaje: mensajeError,
            destino: row.tutorPrincipalEmail ?? null,
            modo: 'error'
          });
        }
      });
  }

  private abrirDialogoResultadoEnvioIndividual(data: DatosResultadoEnvioIndividualQr): void {
    this.dialog.open(DialogoResultadoEnvioIndividualQrComponent, {
      width: '430px',
      panelClass: 'qr-generation-dialog',
      data
    });
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

          this.cargarDatosCurso();
        },
        error: error => {
          this.errorMensaje = this.obtenerMensajeError(error, 'No se pudieron cargar los cursos.');
        }
      });
  }

  private cargarDatosCurso(): void {
    this.cargarResumen();
    this.cargarAlumnos();
  }

  private cargarAlumnos(): void {
    if (!this.cursoSeleccionadoId) {
      this.alumnos = [];
      this.totalItems = 0;
      this.totalPaginas = 0;
      return;
    }

    this.tablaCargando = true;

    const paginaSolicitada = this.paginaActual;

    this.servicio.obtenerAlumnos({
      cursoId: this.cursoSeleccionadoId,
      estado: this.estadoSeleccionado,
      busqueda: this.busqueda,
      page: paginaSolicitada,
      pageSize: this.pageSize
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: page => {
          this.totalItems = page.totalItems;
          this.totalPaginas = page.totalPages;

          if (this.totalPaginas > 0 && paginaSolicitada > this.totalPaginas) {
            this.paginaActual = this.totalPaginas;
            this.cargarAlumnos();
            return;
          }

          this.alumnos = page.items;
          this.paginaActual = this.totalPaginas === 0 ? 1 : paginaSolicitada;
          this.tablaCargando = false;
        },
        error: error => {
          this.alumnos = [];
          this.totalItems = 0;
          this.totalPaginas = 0;
          this.tablaCargando = false;
          this.errorMensaje = this.obtenerMensajeError(error, 'No se pudo cargar la tabla de estados.');
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
          this.errorMensaje = this.obtenerMensajeError(error, 'No se pudo iniciar el envio.');
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
          const progresoNormalizado = this.normalizarProgresoFinal(progreso);
          this.progreso = progresoNormalizado;
          this.actualizarDialogoProgreso(progresoNormalizado);

          if (progresoNormalizado.estado === 'COMPLETED' || progresoNormalizado.estado === 'FAILED') {
            this.detenerPolling();
            this.ejecutandoJob = false;
            this.currentJobId = null;
            this.programarCierreDialogoProgreso(progresoNormalizado);
          }
        },
        error: error => {
          this.detenerPolling();
          this.ejecutandoJob = false;
          this.currentJobId = null;
          this.cancelarCierreDialogoProgresoPendiente();
          this.cerrarDialogoProgreso();
          this.errorMensaje = this.obtenerMensajeError(error, 'No se pudo consultar el progreso del envio.');
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

  private programarCierreDialogoProgreso(progreso: ProgresoEnvioQr): void {
    this.cancelarCierreDialogoProgresoPendiente();

    this.closeProgressDialogTimeoutId = window.setTimeout(() => {
      this.closeProgressDialogTimeoutId = undefined;
      this.cerrarDialogoProgreso();
      this.cargarResumen();
      this.cargarAlumnos();
      this.abrirDialogoResultado(progreso);
    }, 700);
  }

  private cancelarCierreDialogoProgresoPendiente(): void {
    if (this.closeProgressDialogTimeoutId !== undefined) {
      window.clearTimeout(this.closeProgressDialogTimeoutId);
      this.closeProgressDialogTimeoutId = undefined;
    }
  }

  private abrirDialogoResultado(progreso: ProgresoEnvioQr): void {
    const datos = progreso.estado === 'FAILED'
      ? {
          titulo: 'El envio fallo',
          mensaje: progreso.ultimoMensaje ?? 'El proceso no pudo completarse.',
          icono: 'error',
          color: 'warn' as const
        }
      : progreso.errores > 0
        ? {
            titulo: 'Envio finalizado con observaciones',
            mensaje: progreso.ultimoMensaje ?? 'El proceso termino con errores parciales.',
            icono: 'warning',
            color: 'accent' as const
          }
        : {
            titulo: 'Envio finalizado',
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

  private normalizarProgresoFinal(progreso: ProgresoEnvioQr): ProgresoEnvioQr {
    if (progreso.estado !== 'COMPLETED') {
      return progreso;
    }

    return {
      ...progreso,
      procesados: progreso.total
    };
  }

  private obtenerMensajeError(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      return typeof error.error === 'string' ? error.error : error.error?.message ?? fallback;
    }

    return fallback;
  }

  private crearObjectUrl(blob: Blob): string {
    const url = URL.createObjectURL(blob);
    this.objectUrls.add(url);
    return url;
  }

  private liberarObjectUrl(url: string): void {
    if (!this.objectUrls.has(url)) {
      return;
    }

    URL.revokeObjectURL(url);
    this.objectUrls.delete(url);
  }

  private liberarTodosObjectUrls(): void {
    for (const url of this.objectUrls) {
      URL.revokeObjectURL(url);
    }

    this.objectUrls.clear();
  }

  private construirNombreArchivoQr(row: FilaEstadoEnvioQr): string {
    const base = (row.dni || row.idEstudiante).replace(/[^a-zA-Z0-9_-]/g, '');
    return `credencial-${base || row.idEstudiante}.png`;
  }
}
