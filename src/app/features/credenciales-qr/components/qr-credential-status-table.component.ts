import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, Inject, Input, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ServicioEnvioCredencialesQr } from '../../qr-credential-delivery/services/qr-credential-delivery.service';
import {
  CampoOrdenTablaQr,
  DireccionOrdenTablaQr,
  EstadoFilaEnvioQr,
  EstadoFiltroEnvioQr,
  FilaEstadoEnvioQr,
  OpcionCursoEnvioQr
} from '../../qr-credential-delivery/models/qr-credential-delivery.models';
import {
  DatosPreviewQrAlumno,
  DialogoPreviewQrAlumnoComponent
} from '../../qr-credential-delivery/components/delivery-qr-preview-dialog.component';
import { ServicioGeneracionCredencialesQr } from '../../qr-credential-generation/services/qr-credential-generation.service';
import {
  DatosConfirmacionEnvioIndividualQr,
  DialogoConfirmacionEnvioIndividualQrComponent
} from '../../qr-credential-delivery/components/confirm-single-delivery-dialog.component';
import {
  DatosResultadoEnvioIndividualQr,
  DialogoResultadoEnvioIndividualQrComponent
} from '../../qr-credential-delivery/components/single-delivery-result-dialog.component';
import { QrCredentialsSyncService } from '../../../core/services/qr-credentials-sync.service';

interface DatosConfirmacionCredencialIndividualQr {
  estudiante: string;
  dni: string;
  esRegeneracion: boolean;
}

@Component({
  selector: 'app-confirm-single-generation-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <div class="single-generation-dialog">
      <div class="dialog-icon">
        <mat-icon>{{ data.esRegeneracion ? 'sync' : 'qr_code' }}</mat-icon>
      </div>

      <h2>{{ data.esRegeneracion ? 'Confirmar regeneración' : 'Confirmar generación' }}</h2>
      <p>
        {{
          data.esRegeneracion
            ? 'Se emitirá una nueva credencial QR para el estudiante y la credencial anterior quedará inactiva.'
            : 'Se generará una credencial QR para el estudiante seleccionado.'
        }}
      </p>


      <mat-dialog-actions class="dialog-actions">
        <button mat-stroked-button class="btn-ghost" (click)="cancelar()">Cancelar</button>
        <button mat-raised-button class="btn-primary" (click)="confirmar()">
          {{ data.esRegeneracion ? 'Regenerar' : 'Generar' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .single-generation-dialog {
      color: #0f2f4b;
      max-width: 92vw;
      padding: 8px 4px 4px;
      text-align: center;
      font-family: 'Open Sans', sans-serif;
    }
    .dialog-icon {
      width: 56px;
      height: 56px;
      margin: 0 auto 12px;
      display: grid;
      place-items: center;
      border-radius: 16px;
      background: #eef5fb;
      color: #3c78b4;
      border: 1px solid #d7e6f4;
    }
    .dialog-icon mat-icon {
      font-size: 30px;
      width: 30px;
      height: 30px;
    }
    h2 {
      margin: 0;
      font-size: 20px;
      line-height: 1.2;
      font-weight: 700;
      color: #0f2f4b;
    }
    p {
      margin: 10px 0 0;
      color: #4b647a;
      font-size: 13.5px;
      line-height: 1.45;
    }
    .dialog-panel {
      margin-top: 16px;
      padding: 14px !important;
      border-radius: 14px;
      border: 1px solid #dce8f3;
      background: #f8fbff;
      text-align: left;
    }
    .row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 8px;
      font-size: 13px;
    }
    .row:last-child {
      margin-bottom: 0;
    }
    .row span {
      color: #64748b;
      font-weight: 600;
    }
    .row strong {
      color: #0f2f4b;
      font-weight: 600;
      text-align: right;
    }
    .dialog-actions {
      display: flex;
      justify-content: center;
      gap: 10px;
      margin-top: 18px;
      padding: 0;
    }
    .btn-primary {
      background-color: #3c78b4 !important;
      color: #fff !important;
      border-radius: 12px !important;
      font-weight: 600 !important;
    }
    .btn-ghost {
      border-color: #c7d9eb !important;
      color: #3c78b4 !important;
      border-radius: 12px !important;
      font-weight: 600 !important;
    }
  `]
})
class DialogoConfirmacionCredencialIndividualQrComponent {
  constructor(
    private dialogRef: MatDialogRef<DialogoConfirmacionCredencialIndividualQrComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DatosConfirmacionCredencialIndividualQr
  ) {}

  confirmar(): void {
    this.dialogRef.close(true);
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}

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
            <h1>Estado de credenciales</h1>
            <p class="subtitle">Visualice el estado de las credenciales personales de cada estudiante.</p>
          </div>
        </div>

        <div class="table-filters">
          <mat-form-field appearance="outline" class="filter-course" subscriptSizing="dynamic">
            <mat-label>Curso</mat-label>
            <mat-select
              [(ngModel)]="cursoSeleccionadoId"
              (selectionChange)="alCambiarCurso()"
              [disabled]="cursosCargando"
              panelClass="qr-select-panel">
              <mat-option [value]="null">Seleccione un curso</mat-option>
              <mat-option *ngFor="let curso of cursos" [value]="curso.id">
                {{ curso.label }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="filter-state" subscriptSizing="dynamic">
            <mat-label>Estado</mat-label>
            <mat-select
              [(ngModel)]="estadoSeleccionado"
              (selectionChange)="aplicarFiltros()"
              [disabled]="!cursoSeleccionadoId"
              panelClass="qr-select-panel">
              <mat-option value="TODOS">Todos</mat-option>
              <mat-option value="PENDIENTE_ENVIO">Pendiente de envío</mat-option>
              <mat-option value="ENVIADO">Enviado</mat-option>
              <mat-option value="SIN_QR">Sin QR</mat-option>
              <mat-option value="SIN_TUTOR_PRINCIPAL">Sin tutor principal</mat-option>
              <mat-option value="EMAIL_INVALIDO">Email inválido</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="search-field" subscriptSizing="dynamic">
            <mat-label>Buscar</mat-label>
            <input
              matInput
              [(ngModel)]="busqueda"
              (keyup.enter)="aplicarFiltros()"
              [disabled]="!cursoSeleccionadoId"
              placeholder="Nombre, DNI o email" />
          </mat-form-field>

          <div class="filter-actions">
            <button
              mat-flat-button
              color="primary"
              class="primary-search"
              (click)="aplicarFiltros()"
              [disabled]="!cursoSeleccionadoId">
              <mat-icon>search</mat-icon>
              Buscar
            </button>
            <button mat-stroked-button (click)="limpiarBusqueda()" [disabled]="!cursoSeleccionadoId && !busqueda">
              <mat-icon>close</mat-icon>
              Limpiar
            </button>
          </div>
        </div>

        <p class="hint" *ngIf="!cursoSeleccionadoId && !cursosCargando">
          Seleccione un curso para ver el estado de credenciales.
        </p>

        <div class="inline-loading" *ngIf="cursosCargando">
          <span class="mini-spinner"></span>
          Cargando cursos...
        </div>

        <p class="error" *ngIf="errorMensaje">{{ errorMensaje }}</p>

        <div class="table-section" *ngIf="cursoSeleccionadoId">

          <div class="inline-loading" *ngIf="tablaCargando && alumnos.length === 0">
            <span class="mini-spinner"></span>
            Cargando estudiantes...
          </div>

          <div class="table-wrap" *ngIf="!tablaCargando || alumnos.length > 0">
            <div class="table-loading-overlay" *ngIf="tablaCargando">
              <span class="mini-spinner"></span>
              Actualizando tabla...
            </div>

            <table [class.table-busy]="tablaCargando">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>DNI</th>
                  <th>Tutor</th>
                  <th>Email tutor</th>
                  <th>Estado</th>
                  <th class="sortable-col">
                    <button
                      type="button"
                      class="sort-btn"
                      (click)="alternarOrdenFechaQr()"
                      [attr.aria-label]="descripcionOrdenFechaQr()"
                      [attr.title]="descripcionOrdenFechaQr()">
                      <span class="sort-label">Fecha generación</span>
                      <span class="sort-indicator" [class.sort-indicator--active]="ordenCampo === 'FECHA_QR'">
                        <mat-icon aria-hidden="true">{{ iconoOrdenFechaQr() }}</mat-icon>
                      </span>
                    </button>
                  </th>
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
                      class="action-btn"
                      [disabled]="operacionActiva(row)"
                      (click)="solicitarGeneracionCredencial(row)"
                      [attr.title]="accionGeneracionLabel(row)"
                      [attr.aria-label]="accionGeneracionLabel(row)">
                      <span class="action-spinner" *ngIf="generandoAlumnoIds.has(row.idEstudiante)"></span>
                      <mat-icon *ngIf="!generandoAlumnoIds.has(row.idEstudiante)">
                        {{ row.estado === 'SIN_QR' ? 'qr_code' : 'sync' }}
                      </mat-icon>
                    </button>
                    <button
                      mat-icon-button
                      class="action-btn"
                      [disabled]="!puedeEnviarCredencial(row)"
                      (click)="solicitarEnvioCredencial(row)"
                      [attr.title]="accionEnvioLabel(row)"
                      [attr.aria-label]="accionEnvioLabel(row)">
                      <span class="action-spinner" *ngIf="enviandoAlumnoIds.has(row.idEstudiante)"></span>
                      <mat-icon *ngIf="!enviandoAlumnoIds.has(row.idEstudiante)">send</mat-icon>
                    </button>
                    <button
                      mat-icon-button
                      class="action-btn"
                      [disabled]="!puedeGestionarQr(row)"
                      (click)="previsualizarQr(row)"
                      title="Previsualizar QR"
                      aria-label="Previsualizar QR">
                      <span class="action-spinner" *ngIf="previsualizandoAlumnoIds.has(row.idEstudiante)"></span>
                      <mat-icon *ngIf="!previsualizandoAlumnoIds.has(row.idEstudiante)">visibility</mat-icon>
                    </button>
                    <button
                      mat-icon-button
                      class="action-btn"
                      [disabled]="!puedeGestionarQr(row)"
                      (click)="descargarQr(row)"
                      title="Descargar QR"
                      aria-label="Descargar QR">
                      <span class="action-spinner" *ngIf="descargandoAlumnoIds.has(row.idEstudiante)"></span>
                      <mat-icon *ngIf="!descargandoAlumnoIds.has(row.idEstudiante)">download</mat-icon>
                    </button>
                  </td>
                </tr>

                <tr *ngIf="!tablaCargando && alumnos.length === 0">
                  <td colspan="7" class="empty">No hay resultados para los filtros seleccionados.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="pagination" *ngIf="totalPaginas > 0">
            <div class="page-size-control">
              <span>Registros por página</span>
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-select
                  [(ngModel)]="pageSize"
                  (selectionChange)="cambiarTamanoPagina()"
                  [disabled]="tablaCargando"
                  panelClass="qr-select-panel">
                  <mat-option *ngFor="let opcion of pageSizeOptions" [value]="opcion">
                    {{ opcion }}
                  </mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <button mat-stroked-button (click)="irPaginaAnterior()" [disabled]="!puedePaginaAnterior()">
              Anterior
            </button>
            <span class="pagination-status">
              <span class="mini-spinner mini-spinner--pagination" *ngIf="tablaCargando"></span>
              Página {{ paginaActual }} de {{ totalPaginas }}
            </span>
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
  ordenCampo: CampoOrdenTablaQr = 'NOMBRE';
  ordenDireccion: DireccionOrdenTablaQr = 'ASC';

  alumnos: FilaEstadoEnvioQr[] = [];

  paginaActual = 1;
  pageSize = 5;
  readonly pageSizeOptions = [5, 10, 20];
  totalPaginas = 0;
  totalItems = 0;

  busqueda = '';
  cursosCargando = false;
  tablaCargando = false;
  errorMensaje = '';
  generandoAlumnoIds = new Set<string>();
  enviandoAlumnoIds = new Set<string>();
  previsualizandoAlumnoIds = new Set<string>();
  descargandoAlumnoIds = new Set<string>();

  constructor(
    private servicio: ServicioEnvioCredencialesQr,
    private servicioGeneracion: ServicioGeneracionCredencialesQr,
    private dialog: MatDialog,
    private qrCredentialsSync: QrCredentialsSyncService
  ) {
    this.destroyRef.onDestroy(() => {
      this.liberarTodosObjectUrls();
      this.generandoAlumnoIds.clear();
      this.enviandoAlumnoIds.clear();
      this.previsualizandoAlumnoIds.clear();
      this.descargandoAlumnoIds.clear();
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

  alternarOrdenFechaQr(): void {
    if (this.ordenCampo !== 'FECHA_QR') {
      this.ordenCampo = 'FECHA_QR';
      this.ordenDireccion = 'DESC';
    } else {
      this.ordenDireccion = this.ordenDireccion === 'DESC' ? 'ASC' : 'DESC';
    }

    this.paginaActual = 1;
    this.cargarAlumnos();
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

  cambiarTamanoPagina(): void {
    this.paginaActual = 1;
    this.cargarAlumnos();
  }

  puedePaginaAnterior(): boolean {
    return !this.tablaCargando && this.paginaActual > 1;
  }

  puedePaginaSiguiente(): boolean {
    return !this.tablaCargando && this.totalPaginas > 0 && this.paginaActual < this.totalPaginas;
  }

  estadoLabel(estado: EstadoFilaEnvioQr): string {
    switch (estado) {
      case 'ENVIADO':
        return 'Enviado';
      case 'PENDIENTE_ENVIO':
        return 'Pendiente de envío';
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
    return row.estado !== 'SIN_QR' && !this.operacionActiva(row);
  }

  puedeEnviarCredencial(row: FilaEstadoEnvioQr): boolean {
    return !!this.cursoSeleccionadoId
      && !this.operacionActiva(row)
      && (row.estado === 'PENDIENTE_ENVIO' || row.estado === 'ENVIADO');
  }

  operacionActiva(row: FilaEstadoEnvioQr): boolean {
    return this.generandoAlumnoIds.has(row.idEstudiante)
      || this.enviandoAlumnoIds.has(row.idEstudiante)
      || this.previsualizandoAlumnoIds.has(row.idEstudiante)
      || this.descargandoAlumnoIds.has(row.idEstudiante);
  }

  accionGeneracionLabel(row: FilaEstadoEnvioQr): string {
    return row.estado === 'SIN_QR' ? 'Generar credencial QR' : 'Regenerar credencial QR';
  }

  accionEnvioLabel(row: FilaEstadoEnvioQr): string {
    return row.estado === 'ENVIADO' ? 'Reenviar credencial QR' : 'Enviar credencial QR';
  }

  formatearFecha(fecha?: string | null): string {
    if (!fecha) {
      return '-';
    }

    const parsed = new Date(fecha);

    if (Number.isNaN(parsed.getTime())) {
      return '-';
    }

    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(parsed);
  }

  iconoOrdenFechaQr(): string {
    if (this.ordenCampo !== 'FECHA_QR') {
      return 'unfold_more';
    }

    return this.ordenDireccion === 'DESC' ? 'arrow_downward' : 'arrow_upward';
  }

  descripcionOrdenFechaQr(): string {
    if (this.ordenCampo !== 'FECHA_QR') {
      return 'Ordenar por Fecha generación';
    }

    return this.ordenDireccion === 'DESC'
      ? 'Fecha generación ordenada de más reciente a más antigua'
      : 'Fecha generación ordenada de más antigua a más reciente';
  }

  previsualizarQr(row: FilaEstadoEnvioQr): void {
    if (!this.puedeGestionarQr(row)) {
      return;
    }

    this.previsualizandoAlumnoIds.add(row.idEstudiante);

    this.servicio.obtenerImagenQrAlumno(row.idEstudiante)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: blob => {
          this.previsualizandoAlumnoIds.delete(row.idEstudiante);
          const imageUrl = this.crearObjectUrl(blob);
          const dialogRef = this.dialog.open(DialogoPreviewQrAlumnoComponent, {
            width: '390px',
            panelClass: 'qr-generation-dialog',
            data: {
              nombreCompleto: row.nombreCompleto,
              dni: row.dni,
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
          this.previsualizandoAlumnoIds.delete(row.idEstudiante);
          this.errorMensaje = this.obtenerMensajeError(error, 'No se pudo previsualizar el QR del estudiante.');
        }
      });
  }

  descargarQr(row: FilaEstadoEnvioQr): void {
    if (!this.puedeGestionarQr(row)) {
      return;
    }

    this.descargandoAlumnoIds.add(row.idEstudiante);

    this.servicio.obtenerImagenQrAlumno(row.idEstudiante)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: blob => {
          this.descargandoAlumnoIds.delete(row.idEstudiante);
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
          this.descargandoAlumnoIds.delete(row.idEstudiante);
          this.errorMensaje = this.obtenerMensajeError(error, 'No se pudo descargar el QR del estudiante.');
        }
      });
  }

  solicitarGeneracionCredencial(row: FilaEstadoEnvioQr): void {
    if (this.operacionActiva(row)) {
      return;
    }

    const dialogRef = this.dialog.open(DialogoConfirmacionCredencialIndividualQrComponent, {
      width: '440px',
      panelClass: 'qr-generation-dialog',
      data: {
        estudiante: row.nombreCompleto,
        dni: row.dni,
        esRegeneracion: row.estado !== 'SIN_QR'
      } satisfies DatosConfirmacionCredencialIndividualQr
    });

    dialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(confirmado => {
        if (confirmado) {
          this.ejecutarGeneracionIndividual(row);
        }
      });
  }

  solicitarEnvioCredencial(row: FilaEstadoEnvioQr): void {
    if (!this.puedeEnviarCredencial(row) || !this.cursoSeleccionadoId) {
      return;
    }

    const dialogRef = this.dialog.open(DialogoConfirmacionEnvioIndividualQrComponent, {
      width: '460px',
      panelClass: 'qr-generation-dialog',
      data: {
        curso: this.obtenerLabelCursoSeleccionado(),
        alumno: row.nombreCompleto,
        dni: row.dni,
        tutorEmail: row.tutorPrincipalEmail ?? '-',
        esReenvio: row.estado === 'ENVIADO'
      } satisfies DatosConfirmacionEnvioIndividualQr
    });

    dialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(confirmado => {
        if (confirmado) {
          this.ejecutarEnvioIndividual(row);
        }
      });
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
            this.errorMensaje = 'No hay cursos disponibles para consultar credenciales.';
            return;
          }

          if (!this.cursoSeleccionadoId) {
            this.cursoSeleccionadoId = this.cursos[0].id;
          }

          this.cargarAlumnos();
        },
        error: error => {
          this.cursosCargando = false;
          this.errorMensaje = this.obtenerMensajeError(error, 'No se pudieron cargar los cursos.');
        }
      });
  }

  private ejecutarGeneracionIndividual(row: FilaEstadoEnvioQr): void {
    if (this.operacionActiva(row)) {
      return;
    }

    this.errorMensaje = '';
    this.generandoAlumnoIds.add(row.idEstudiante);

    this.servicioGeneracion.regenerarAlumno(row.idEstudiante)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.generandoAlumnoIds.delete(row.idEstudiante);

          if (this.cursoSeleccionadoId) {
            this.qrCredentialsSync.notifyGenerationUpdated(this.cursoSeleccionadoId);
          }

          this.abrirResultadoIndividual({
            titulo: row.estado === 'SIN_QR' ? 'Credencial generada' : 'Credencial regenerada',
            mensaje: response.mensaje,
            modo: 'success'
          });
        },
        error: error => {
          this.generandoAlumnoIds.delete(row.idEstudiante);
          const mensaje = this.obtenerMensajeError(error, 'No se pudo generar la credencial QR.');
          this.errorMensaje = mensaje;
          this.abrirResultadoIndividual({
            titulo: 'No se pudo generar la credencial',
            mensaje,
            modo: 'error'
          });
        }
      });
  }

  private ejecutarEnvioIndividual(row: FilaEstadoEnvioQr): void {
    if (!this.cursoSeleccionadoId || this.operacionActiva(row)) {
      return;
    }

    const cursoId = this.cursoSeleccionadoId;
    this.errorMensaje = '';
    this.enviandoAlumnoIds.add(row.idEstudiante);

    this.servicio.enviarAlumno(row.idEstudiante, { idCurso: cursoId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.enviandoAlumnoIds.delete(row.idEstudiante);
          this.qrCredentialsSync.notifyDeliveryUpdated(cursoId);
          this.abrirResultadoIndividual({
            titulo: row.estado === 'ENVIADO' ? 'Credencial reenviada' : 'Credencial enviada',
            mensaje: response.mensaje,
            destino: response.destino,
            modo: 'success'
          });
        },
        error: error => {
          this.enviandoAlumnoIds.delete(row.idEstudiante);
          const mensaje = this.obtenerMensajeError(error, 'No se pudo enviar la credencial QR.');
          this.errorMensaje = mensaje;
          this.abrirResultadoIndividual({
            titulo: 'No se pudo enviar la credencial',
            mensaje,
            modo: 'error'
          });
        }
      });
  }

  private abrirResultadoIndividual(data: DatosResultadoEnvioIndividualQr): void {
    this.dialog.open(DialogoResultadoEnvioIndividualQrComponent, {
      width: '440px',
      panelClass: 'qr-generation-dialog',
      data
    });
  }

  private cargarAlumnos(): void {
    if (!this.cursoSeleccionadoId) {
      this.alumnos = [];
      this.totalItems = 0;
      this.totalPaginas = 0;
      this.tablaCargando = false;
      return;
    }

    this.tablaCargando = true;
    const paginaSolicitada = this.paginaActual;

    this.servicio.obtenerAlumnos({
      cursoId: this.cursoSeleccionadoId,
      estado: this.estadoSeleccionado,
      busqueda: this.busqueda,
      page: paginaSolicitada,
      pageSize: this.pageSize,
      sortBy: this.ordenCampo,
      sortDir: this.ordenDireccion
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

  private obtenerLabelCursoSeleccionado(): string {
    return this.cursos.find(curso => curso.id === this.cursoSeleccionadoId)?.label ?? 'Curso seleccionado';
  }
}
