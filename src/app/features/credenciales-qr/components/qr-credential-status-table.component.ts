import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ServicioEnvioCredencialesQr } from '../../qr-credential-delivery/services/qr-credential-delivery.service';
import {
  EstadoFilaEnvioQr,
  EstadoFiltroEnvioQr,
  FilaEstadoEnvioQr,
  OpcionCursoEnvioQr
} from '../../qr-credential-delivery/models/qr-credential-delivery.models';
import {
  DatosPreviewQrAlumno,
  DialogoPreviewQrAlumnoComponent
} from '../../qr-credential-delivery/components/delivery-qr-preview-dialog.component';
import { QrCredentialsSyncService } from '../../../core/services/qr-credentials-sync.service';

@Component({
  selector: 'app-qr-credential-status-table',
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
            <h1>Estado por estudiante</h1>
            <p class="subtitle">
              Vista consolidada de credenciales, independiente de generación y envío.
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
        </div>

        <p class="hint" *ngIf="!cursoSeleccionadoId">
          Selecciona un curso para ver el estado de credenciales.
        </p>

        <p class="error" *ngIf="errorMensaje">{{ errorMensaje }}</p>

        <div class="table-section" *ngIf="cursoSeleccionadoId">
          <div class="table-header">
            <h3>Estado de credenciales por estudiante</h3>
          </div>

          <div class="table-filters">
            <mat-form-field appearance="outline">
              <mat-label>Estado</mat-label>
              <mat-select [(ngModel)]="estadoSeleccionado" (selectionChange)="aplicarFiltros()">
                <mat-option value="TODOS">Todos</mat-option>
                <mat-option value="PENDIENTE_ENVIO">Pendiente envío</mat-option>
                <mat-option value="ENVIADO">Enviado</mat-option>
                <mat-option value="SIN_QR">Sin QR</mat-option>
                <mat-option value="SIN_TUTOR_PRINCIPAL">Sin tutor principal</mat-option>
                <mat-option value="EMAIL_INVALIDO">Email inválido</mat-option>
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
            <span>Página {{ paginaActual }} de {{ totalPaginas }}</span>
            <button mat-stroked-button (click)="irPaginaSiguiente()" [disabled]="!puedePaginaSiguiente()">
              Siguiente
            </button>
          </div>
        </div>
      </section>
    </div>
  `,
  styleUrl: './qr-credential-status-table.component.css'
})
export class QrCredentialStatusTableComponent implements OnInit {
  @Input() embedded = false;

  private readonly destroyRef = inject(DestroyRef);
  private objectUrls = new Set<string>();

  cursos: OpcionCursoEnvioQr[] = [];
  cursoSeleccionadoId: string | null = null;
  estadoSeleccionado: EstadoFiltroEnvioQr = 'TODOS';

  alumnos: FilaEstadoEnvioQr[] = [];

  paginaActual = 1;
  readonly pageSize = 20;
  totalPaginas = 0;
  totalItems = 0;

  busqueda = '';
  tablaCargando = false;
  errorMensaje = '';

  constructor(
    private servicio: ServicioEnvioCredencialesQr,
    private dialog: MatDialog,
    private qrCredentialsSync: QrCredentialsSyncService
  ) {
    this.destroyRef.onDestroy(() => {
      this.liberarTodosObjectUrls();
    });
  }

  ngOnInit(): void {
    this.qrCredentialsSync.generationUpdated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(cursoId => {
        if (cursoId && cursoId === this.cursoSeleccionadoId) {
          this.cargarAlumnos();
        }
      });

    this.qrCredentialsSync.deliveryUpdated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(cursoId => {
        if (cursoId && cursoId === this.cursoSeleccionadoId) {
          this.cargarAlumnos();
        }
      });

    this.cargarCursos();
  }

  alCambiarCurso(): void {
    this.paginaActual = 1;
    this.estadoSeleccionado = 'TODOS';
    this.busqueda = '';
    this.errorMensaje = '';
    this.cargarAlumnos();
  }

  aplicarFiltros(): void {
    this.paginaActual = 1;
    this.cargarAlumnos();
  }

  limpiarBusqueda(): void {
    this.busqueda = '';
    this.aplicarFiltros();
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
        return 'Pendiente envío';
      case 'SIN_QR':
        return 'Sin QR';
      case 'SIN_TUTOR_PRINCIPAL':
        return 'Sin tutor principal';
      case 'EMAIL_INVALIDO':
        return 'Email inválido';
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

  puedeGestionarQr(row: FilaEstadoEnvioQr): boolean {
    return row.estado !== 'SIN_QR';
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

  private cargarCursos(): void {
    this.servicio.obtenerCursos()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: cursos => {
          this.cursos = cursos;

          if (this.cursos.length === 0) {
            this.errorMensaje = 'No hay cursos disponibles para consultar credenciales.';
            return;
          }

          if (!this.cursoSeleccionadoId) {
            this.cursoSeleccionadoId = this.cursos[0].id;
          }

          this.cargarAlumnos();
        },
        error: error => {
          this.errorMensaje = this.obtenerMensajeError(error, 'No se pudieron cargar los cursos.');
        }
      });
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
