import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY, Observable, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';

import {
  FichaAlumnoService,
  QrCredentialStatusDto
} from '../../services/ficha-alumno.service';
import { CursoFicha } from '../../models/curso-ficha.model';
import { EstudianteFicha } from '../../models/estudiante-ficha.model';
import { FichaDetalle } from '../../models/ficha-detalle.model';
import { TutorFicha } from '../../models/tutor-ficha.model';
import {
  QrCredentialPreviewCardComponent,
  QrCredentialPreviewMetaItem
} from '../../../credenciales-qr/components/qr-credential-preview-card.component';
import { ObjectUrlRegistry } from '../../../../utils/object-url-registry';

function validarMayorDe18(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  const fecha = new Date(control.value);
  if (isNaN(fecha.getTime())) return { fechaInvalida: true };
  const hoy = new Date();
  const limite = new Date(hoy.getFullYear() - 18, hoy.getMonth(), hoy.getDate());
  return fecha <= limite ? null : { menorDeEdad: true };
}

function validarEdadEstudiante(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  const fecha = new Date(control.value);
  if (isNaN(fecha.getTime())) return { fechaInvalida: true };
  const hoy = new Date();
  const limiteMaxBirth = new Date(hoy.getFullYear() - 11, hoy.getMonth(), hoy.getDate());
  const limiteMinBirth = new Date(hoy.getFullYear() - 25, hoy.getMonth(), hoy.getDate());
  if (fecha > limiteMaxBirth) return { demasiadoJoven: true };
  if (fecha < limiteMinBirth) return { demasiadoMayor: true };
  return null;
}

interface ModalEstudianteState {
  idEstudiante: string;
  form: FormGroup;
  guardando: boolean;
  confirmando: boolean;
}

interface ModalTutorState {
  idEstudiante: string;
  idTutor: string | null;
  eraPrincipal: boolean;
  form: FormGroup;
  guardando: boolean;
  confirmando: boolean;
  confirmandoPrincipal: boolean;
  formTocado: boolean;
}

interface ModalEliminarState {
  idEstudiante: string;
  idTutor: string;
  nombreTutor: string;
  eliminando: boolean;
}

interface ModalDetalleTutorState {
  tutor: TutorFicha;
}

interface ModalCredencialQrState {
  idEstudiante: string;
  nombreCompleto: string;
  cargando: boolean;
  regenerando: boolean;
  confirmandoRegeneracion: boolean;
  error: string | null;
  imageUrl: string | null;
  status: QrCredentialStatusDto | null;
}

@Component({
  selector: 'app-ficha-alumno',
  standalone: true,
  imports: [
    CommonModule,
    MatExpansionModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatInputModule,
    FormsModule,
    ReactiveFormsModule,
    QrCredentialPreviewCardComponent
  ],
  templateUrl: './ficha-alumno.component.html',
  styleUrl: './ficha-alumno.component.css'
})
export class FichaAlumnoComponent implements OnInit, OnDestroy {
  cursos: CursoFicha[] = [];
  cursoSeleccionado: CursoFicha | null = null;

  estudiantes: EstudianteFicha[] = [];
  cargandoCursos = true;
  cargandoEstudiantes = false;
  errorCursos = false;
  errorEstudiantes = false;

  expandedIds = new Set<string>();

  fichaMap = new Map<string, FichaDetalle>();
  cargandoFichaIds = new Set<string>();
  errorFichaIds = new Set<string>();
  vistaTutoresIds = new Set<string>();

  modalEstudiante: ModalEstudianteState | null = null;
  modalTutor: ModalTutorState | null = null;
  modalEliminar: ModalEliminarState | null = null;
  modalCredencialQr: ModalCredencialQrState | null = null;
  modalDetalleTutor: ModalDetalleTutorState | null = null;
  alertBloqueo: string | null = null;

  private readonly qrObjectUrls = new ObjectUrlRegistry();

  /** IDs de estudiantes cuya notificación está siendo enviada en este momento. */
  enviandoNotificacionIds = new Set<string>();

  /** true mientras se está enviando la notificación masiva del curso. */
  enviandoNotificacionCurso = false;

  constructor(
    private fichaService: FichaAlumnoService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const cursoId = params.get('cursoId');
    const estudianteId = params.get('estudianteId');

    this.fichaService.getCursos().pipe(
      catchError(() => {
        this.errorCursos = true;
        this.cargandoCursos = false;
        return of([]);
      })
    ).subscribe(cursos => {
      this.cursos = cursos;
      this.cargandoCursos = false;

      if (cursoId) {
        const curso = cursos.find(c => c.idCurso === cursoId) ?? null;
        if (curso) {
          this.cursoSeleccionado = curso;
          this.cargarEstudiantes(curso.idCurso, estudianteId);
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.qrObjectUrls.clear();
  }

  onCursoChange(): void {
    if (!this.cursoSeleccionado) return;
    this.expandedIds.clear();
    this.fichaMap.clear();
    this.cargandoFichaIds.clear();
    this.errorFichaIds.clear();
    this.vistaTutoresIds.clear();
    this.enviandoNotificacionCurso = false;
    this.cargarEstudiantes(this.cursoSeleccionado.idCurso, null);
  }

  private cargarEstudiantes(idCurso: string, autoExpandId: string | null): void {
    this.estudiantes = [];
    this.errorEstudiantes = false;
    this.cargandoEstudiantes = true;

    this.fichaService.getEstudiantesPorCurso(idCurso).pipe(
      catchError(() => {
        this.errorEstudiantes = true;
        this.cargandoEstudiantes = false;
        return of([]);
      })
    ).subscribe(est => {
      this.estudiantes = est;
      this.cargandoEstudiantes = false;

      // Cargar todas las fichas en segundo plano para que el botón
      // de notificación masiva tenga el estado correcto sin abrir cada panel.
      est.forEach(e => this.cargarFicha(e.idEstudiante));

      if (autoExpandId) {
        this.expandedIds.add(autoExpandId);
        setTimeout(() => {
          document.getElementById('alumno-' + autoExpandId)
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 250);
      }
    });
  }

  isExpanded(id: string): boolean {
    return this.expandedIds.has(id);
  }

  onOpened(est: EstudianteFicha): void {
    this.expandedIds.add(est.idEstudiante);
    if (!this.fichaMap.has(est.idEstudiante) && !this.cargandoFichaIds.has(est.idEstudiante)) {
      this.cargarFicha(est.idEstudiante);
    }
  }

  onClosed(id: string): void {
    this.expandedIds.delete(id);
  }

  private cargarFicha(idEstudiante: string): void {
    this.cargandoFichaIds.add(idEstudiante);
    this.errorFichaIds.delete(idEstudiante);

    this.fichaService.getFichaEstudiante(idEstudiante).pipe(
      catchError(() => {
        this.errorFichaIds.add(idEstudiante);
        this.cargandoFichaIds.delete(idEstudiante);
        return EMPTY;
      })
    ).subscribe(ficha => {
      this.fichaMap.set(idEstudiante, ficha);
      this.cargandoFichaIds.delete(idEstudiante);
    });
  }

  getTutorPrincipal(idEstudiante: string): TutorFicha | null {
    const ficha = this.fichaMap.get(idEstudiante);
    if (!ficha || ficha.tutores.length === 0) return null;
    return ficha.tutores.find(t => t.esPrincipal) ?? ficha.tutores[0];
  }

  getTutores(idEstudiante: string): TutorFicha[] {
    return this.fichaMap.get(idEstudiante)?.tutores ?? [];
  }

  verTutores(idEstudiante: string): void {
    this.vistaTutoresIds.add(idEstudiante);
  }

  volverResumen(idEstudiante: string): void {
    this.vistaTutoresIds.delete(idEstudiante);
  }

  getEstado(est: EstudianteFicha): 'tea' | 'rojo' | 'naranja' | 'amarillo' | 'verde' {
    if (est.teaGeneral) return 'tea';
    if (est.faltasAcumuladas >= 21) return 'rojo';
    if (est.faltasAcumuladas >= 15) return 'naranja';
    if (est.faltasAcumuladas >= 10) return 'amarillo';
    return 'verde';
  }

  getLabelFaltas(est: EstudianteFicha): string {
    if (est.teaGeneral) return 'TEA';
    const f = est.faltasAcumuladas;
    return f === 1 ? '1 falta' : `${f} faltas`;
  }

  verDetalleFaltas(est: EstudianteFicha): void {
    this.router.navigate(['/ficha-alumno/detalle', est.idEstudiante], {
      queryParams: {
        nombre: est.nombre,
        apellido: est.apellido,
        documento: est.documento,
        inasistencias: est.faltasAcumuladas,
        teaGeneral: est.teaGeneral,
        origen: 'ficha',
        fichaState_cursoId: this.cursoSeleccionado?.idCurso ?? '',
        fichaState_estudianteId: est.idEstudiante,
      },
    });
  }

  getCredencialLabel(idEstudiante: string): string {
    const ficha = this.fichaMap.get(idEstudiante);
    if (!ficha) return '-';
    if (ficha.credencialQrActiva === null) return 'Sin credencial';
    return ficha.credencialQrActiva ? 'Activa' : 'Inactiva';
  }

  getCredencialClass(idEstudiante: string): string {
    const ficha = this.fichaMap.get(idEstudiante);
    if (!ficha || ficha.credencialQrActiva === null) return 'credencial-sin';
    return ficha.credencialQrActiva ? 'credencial-activa' : 'credencial-inactiva';
  }

  getFicha(idEstudiante: string): FichaDetalle | null {
    return this.fichaMap.get(idEstudiante) ?? null;
  }

  abrirModalCredencialQr(est: EstudianteFicha): void {
    this.cerrarModalCredencialQr();

    this.modalCredencialQr = {
      idEstudiante: est.idEstudiante,
      nombreCompleto: `${est.apellido}, ${est.nombre}`,
      cargando: true,
      regenerando: false,
      confirmandoRegeneracion: false,
      error: null,
      imageUrl: null,
      status: null
    };

    this.cargarDatosCredencialQrModal(est.idEstudiante);
  }

  cerrarModalCredencialQr(): void {
    if (this.modalCredencialQr?.regenerando) return;
    this.limpiarImagenModalCredencial();
    this.modalCredencialQr = null;
  }

  solicitarRegeneracionCredencialQr(): void {
    if (!this.modalCredencialQr || this.modalCredencialQr.cargando || this.modalCredencialQr.regenerando) {
      return;
    }

    this.modalCredencialQr.confirmandoRegeneracion = true;
  }

  cancelarConfirmacionRegeneracionCredencialQr(): void {
    if (!this.modalCredencialQr || this.modalCredencialQr.regenerando) {
      return;
    }

    this.modalCredencialQr.confirmandoRegeneracion = false;
  }

  confirmarRegeneracionCredencialQr(): void {
    const modal = this.modalCredencialQr;
    if (!modal || modal.regenerando) {
      return;
    }

    modal.regenerando = true;
    modal.error = null;

    this.fichaService.regenerarCredencialQr(modal.idEstudiante).pipe(
      catchError((error: HttpErrorResponse) => {
        const msg = this.obtenerMensajeHttp(error, 'No se pudo regenerar la credencial QR.');
        if (this.modalCredencialQr?.idEstudiante === modal.idEstudiante) {
          this.modalCredencialQr.regenerando = false;
          this.modalCredencialQr.confirmandoRegeneracion = false;
          this.modalCredencialQr.error = msg;
        }
        this.snackBar.open(msg, 'Cerrar', { duration: 4500 });
        return EMPTY;
      })
    ).subscribe(response => {
      if (this.modalCredencialQr?.idEstudiante !== modal.idEstudiante) {
        return;
      }

      this.modalCredencialQr.regenerando = false;
      this.modalCredencialQr.confirmandoRegeneracion = false;
      this.modalCredencialQr.error = null;

      const ficha = this.fichaMap.get(modal.idEstudiante);
      if (ficha) {
        ficha.credencialQrActiva = true;
      }

      this.snackBar.open(response.mensaje, 'Cerrar', { duration: 3500 });
      this.cargarDatosCredencialQrModal(modal.idEstudiante);
    });
  }

  getAccionCredencialQrLabel(): string {
    const estado = this.modalCredencialQr?.status?.estado;
    return estado === 'NO_GENERADO' ? 'Generar credencial' : 'Regenerar credencial';
  }

  esGeneracionInicialCredencialQr(): boolean {
    return this.modalCredencialQr?.status?.estado === 'NO_GENERADO';
  }

  getEstadoCredencialQrModalLabel(): string {
    const estado = this.modalCredencialQr?.status?.estado;
    if (estado === 'ACTIVO') return 'Activa';
    if (estado === 'INACTIVO') return 'Inactiva';
    if (estado === 'NO_GENERADO') return 'Sin credencial';
    return '-';
  }

  getMensajeSinImagenCredencialQr(): string {
    return this.modalCredencialQr?.status?.estado === 'NO_GENERADO'
      ? 'Todavía no se generó una credencial QR para este estudiante.'
      : 'No hay una credencial QR activa para previsualizar.';
  }

  formatearFechaGeneracionCredencial(fecha?: string | null): string {
    if (!fecha) return '-';
    const parsed = new Date(fecha);
    if (Number.isNaN(parsed.getTime())) return '-';
    return parsed.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getVersionCredencialQrModal(): number {
    return this.modalCredencialQr?.status?.versionQr ?? 0;
  }

  getMetaCredencialQrModal(): QrCredentialPreviewMetaItem[] {
    return [
      { label: 'Estado', value: this.getEstadoCredencialQrModalLabel() },
      { label: 'Versión', value: `Version: ${this.getVersionCredencialQrModal()}` },
      {
        label: 'Fecha generación',
        value: this.formatearFechaGeneracionCredencial(this.modalCredencialQr?.status?.fechaGeneracion)
      }
    ];
  }

  // ─────────────────────────────────────────────
  // Helpers para formularios reactivos
  // ─────────────────────────────────────────────

  ctrlInvalid(form: FormGroup, field: string): boolean {
    const ctrl = form.get(field);
    return !!(ctrl?.invalid && ctrl.touched);
  }

  ctrlError(form: FormGroup, field: string): string | null {
    const ctrl = form.get(field);
    if (!ctrl?.invalid || !ctrl.touched) return null;
    if (ctrl.hasError('required')) return 'Campo requerido';
    if (ctrl.hasError('email')) return 'Correo electrónico inválido';
    if (ctrl.hasError('pattern')) {
      if (field === 'documento') return 'DNI: 7 u 8 dígitos';
      if (field === 'telefono') return 'Solo dígitos (6–10 caracteres)';
      return 'Formato inválido';
    }
    if (ctrl.hasError('minlength')) {
      const min = (ctrl.getError('minlength') as { requiredLength: number }).requiredLength;
      return `Mínimo ${min} caracteres`;
    }
    if (ctrl.hasError('menorDeEdad')) return 'Debe ser mayor de 18 años';
    if (ctrl.hasError('demasiadoJoven')) return 'El alumno debe tener al menos 11 años';
    if (ctrl.hasError('demasiadoMayor')) return 'El alumno no puede tener más de 25 años';
    if (ctrl.hasError('fechaInvalida')) return 'Fecha inválida';
    return 'Campo inválido';
  }

  // ─────────────────────────────────────────────
  // Modal: Editar Estudiante
  // ─────────────────────────────────────────────

  editarDatos(est: EstudianteFicha): void {
    const ficha = this.fichaMap.get(est.idEstudiante);
    this.modalEstudiante = {
      idEstudiante: est.idEstudiante,
      guardando: false,
      confirmando: false,
      form: new FormGroup({
        nombre: new FormControl(est.nombre, [Validators.required, Validators.minLength(2)]),
        apellido: new FormControl(est.apellido, [Validators.required, Validators.minLength(2)]),
        documento: new FormControl(est.documento, [Validators.required, Validators.pattern(/^\d{7,8}$/)]),
        fechaNacimiento: new FormControl(
          ficha?.fechaNacimiento ? ficha.fechaNacimiento.substring(0, 10) : '',
          [Validators.required, validarEdadEstudiante]
        ),
        sexo: new FormControl(ficha?.sexo ?? ''),
        domicilio: new FormControl(ficha?.domicilio ?? ''),
      }),
    };
  }

  cerrarModalEstudiante(): void {
    if (this.modalEstudiante?.guardando) return;
    this.modalEstudiante = null;
  }

  intentarGuardarEstudiante(): void {
    if (!this.modalEstudiante) return;
    this.modalEstudiante.form.markAllAsTouched();
    if (this.modalEstudiante.form.invalid) return;
    this.modalEstudiante.confirmando = true;
  }

  cancelarConfirmacionEstudiante(): void {
    if (this.modalEstudiante) this.modalEstudiante.confirmando = false;
  }

  confirmarGuardarEstudiante(): void {
    if (!this.modalEstudiante) return;
    const modal = this.modalEstudiante;
    const v = modal.form.getRawValue() as Record<string, string>;
    modal.guardando = true;
    modal.confirmando = false;

    this.fichaService.updateEstudiante(modal.idEstudiante, {
      nombre: v['nombre'],
      apellido: v['apellido'],
      documento: v['documento'],
      fechaNacimiento: v['fechaNacimiento'],
      domicilio: (v['domicilio'] as string) || null,
      sexo: (v['sexo'] as string) || null,
    }).pipe(
      catchError(() => {
        this.snackBar.open('Error al guardar. Intentá de nuevo.', 'Cerrar', { duration: 4000 });
        if (this.modalEstudiante) this.modalEstudiante.guardando = false;
        return EMPTY;
      })
    ).subscribe(() => {
      const ficha = this.fichaMap.get(modal.idEstudiante);
      if (ficha) {
        ficha.nombre = v['nombre'];
        ficha.apellido = v['apellido'];
        ficha.documento = v['documento'];
        ficha.fechaNacimiento = v['fechaNacimiento'];
        ficha.domicilio = (v['domicilio'] as string) || null;
        ficha.sexo = (v['sexo'] as string) || null;
      }
      const est = this.estudiantes.find(e => e.idEstudiante === modal.idEstudiante);
      if (est) {
        est.nombre = v['nombre'];
        est.apellido = v['apellido'];
        est.documento = v['documento'];
      }
      this.modalEstudiante = null;
      this.snackBar.open('Datos del estudiante actualizados.', 'Cerrar', { duration: 3000 });
    });
  }

  // ─────────────────────────────────────────────
  // Modal: Editar / Agregar Tutor
  // ─────────────────────────────────────────────

  private buildTutorForm(tutor?: TutorFicha): FormGroup {
    const esNuevo = !tutor;
    return new FormGroup({
      nombre: new FormControl(tutor?.nombre ?? '', [Validators.required, Validators.minLength(2)]),
      apellido: new FormControl(tutor?.apellido ?? '', [Validators.required, Validators.minLength(2)]),
      documento: new FormControl(tutor?.documento ?? '', [Validators.required, Validators.pattern(/^\d{7,8}$/)]),
      telefono: new FormControl(
        tutor ? tutor.telefono.toString() : '',
        [Validators.required, Validators.pattern(/^\d{6,10}$/)]
      ),
      correo: new FormControl(tutor?.correo ?? '', [Validators.required, Validators.email]),
      relacionEstudiante: new FormControl(tutor?.relacionEstudiante ?? '', [Validators.required]),
      disponibilidad: new FormControl(tutor?.disponibilidad ?? ''),
      domicilio: new FormControl(tutor?.domicilio ?? ''),
      fechaNacimiento: new FormControl(
        tutor?.fechaNacimiento ? tutor.fechaNacimiento.substring(0, 10) : '',
        esNuevo ? [Validators.required, validarMayorDe18] : [validarMayorDe18]
      ),
      esPrincipal: new FormControl(tutor?.esPrincipal ?? false),
    });
  }

  editarTutor(tutor: TutorFicha, idEstudiante: string): void {
    this.modalTutor = {
      idEstudiante,
      idTutor: tutor.idTutor,
      eraPrincipal: tutor.esPrincipal,
      guardando: false,
      confirmando: false,
      confirmandoPrincipal: false,
      formTocado: false,
      form: this.buildTutorForm(tutor),
    };
  }

  agregarTutor(idEstudiante: string): void {
    this.modalTutor = {
      idEstudiante,
      idTutor: null,
      eraPrincipal: false,
      guardando: false,
      confirmando: false,
      confirmandoPrincipal: false,
      formTocado: false,
      form: this.buildTutorForm(),
    };
  }

  cerrarModalTutor(): void {
    if (this.modalTutor?.guardando) return;
    this.modalTutor = null;
  }

  intentarGuardarTutor(): void {
    if (!this.modalTutor) return;
    this.modalTutor.form.markAllAsTouched();
    this.modalTutor.formTocado = true;
    if (this.modalTutor.form.invalid) {
      const invalids = Object.entries(this.modalTutor.form.controls)
        .filter(([, c]) => c.invalid)
        .map(([k]) => k);
      console.warn('[FichaAlumno] Formulario inválido. Campos con error:', invalids);
      return;
    }

    const esPrincipalNuevo = this.modalTutor.form.get('esPrincipal')?.value as boolean;
    const eraPrincipal = this.modalTutor.eraPrincipal;

    // Bloquear: no puede quitarse el rol principal sin reasignar
    if (eraPrincipal && !esPrincipalNuevo) {
      this.modalTutor.form.get('esPrincipal')?.setValue(true);
      this.snackBar.open(
        'No podés quitar el rol principal sin antes asignar otro tutor como principal.',
        'Entendido',
        { duration: 5000 }
      );
      return;
    }

    // Confirmación específica por cambio de principal
    if (esPrincipalNuevo && !eraPrincipal) {
      this.modalTutor.confirmandoPrincipal = true;
      return;
    }

    this.modalTutor.confirmando = true;
  }

  confirmarCambioPrincipal(): void {
    if (!this.modalTutor) return;
    this.modalTutor.confirmandoPrincipal = false;
    this.modalTutor.confirmando = true;
  }

  cancelarConfirmacionTutor(): void {
    if (this.modalTutor) {
      this.modalTutor.confirmando = false;
      this.modalTutor.confirmandoPrincipal = false;
    }
  }

  confirmarGuardarTutor(): void {
    if (!this.modalTutor) return;
    const modal = this.modalTutor;
    const v = modal.form.getRawValue() as Record<string, unknown>;
    modal.guardando = true;
    modal.confirmando = false;

    const tutorData = {
      nombre: v['nombre'] as string,
      apellido: v['apellido'] as string,
      documento: v['documento'] as string,
      telefono: parseInt(v['telefono'] as string, 10),
      correo: v['correo'] as string,
      relacionEstudiante: v['relacionEstudiante'] as string,
      disponibilidad: (v['disponibilidad'] as string) ?? '',
      domicilio: (v['domicilio'] as string) || null,
    };

    if (modal.idTutor === null) {
      // Crear nuevo tutor
      this.fichaService.addTutor(modal.idEstudiante, {
        ...tutorData,
        fechaNacimiento: v['fechaNacimiento'] as string,
        esPrincipal: v['esPrincipal'] as boolean,
      }).pipe(
        catchError((err: HttpErrorResponse) => {
          console.error('[FichaAlumno] Error al agregar tutor:', err.status, err.error);
          const msg = err.error?.error ?? err.error ?? 'Error al agregar tutor.';
          this.snackBar.open(typeof msg === 'string' ? msg : JSON.stringify(msg), 'Cerrar', { duration: 6000 });
          if (this.modalTutor) this.modalTutor.guardando = false;
          return EMPTY;
        })
      ).subscribe(nuevoTutor => {
        const ficha = this.fichaMap.get(modal.idEstudiante);
        if (ficha) {
          if (nuevoTutor.esPrincipal) {
            ficha.tutores.forEach(t => { t.esPrincipal = false; });
          }
          ficha.tutores.push(nuevoTutor);
        }
        this.modalTutor = null;
        this.snackBar.open('Tutor agregado correctamente.', 'Cerrar', { duration: 3000 });
      });
    } else {
      // Editar tutor existente
      const needsPrincipal = (v['esPrincipal'] as boolean) && !modal.eraPrincipal;
      const idTutor = modal.idTutor;

      const obs: Observable<void> = needsPrincipal
        ? this.fichaService.updateTutor(idTutor, tutorData).pipe(
            switchMap(() => this.fichaService.setPrincipal(modal.idEstudiante, idTutor))
          )
        : this.fichaService.updateTutor(idTutor, tutorData);

      obs.pipe(
        catchError(() => {
          this.snackBar.open('Error al guardar. Intentá de nuevo.', 'Cerrar', { duration: 4000 });
          if (this.modalTutor) this.modalTutor.guardando = false;
          return EMPTY;
        })
      ).subscribe(() => {
        const ficha = this.fichaMap.get(modal.idEstudiante);
        if (ficha) {
          const tutor = ficha.tutores.find(t => t.idTutor === idTutor);
          if (tutor) {
            Object.assign(tutor, tutorData);
            // Reflejar localmente la nueva fecha de actualización para que
            // el botón de notificación se deshabilite de inmediato sin necesidad
            // de recargar la página.
            tutor.fechaUltimaActualizacion = new Date().toISOString();
          }
          if (needsPrincipal) {
            ficha.tutores.forEach(t => { t.esPrincipal = t.idTutor === idTutor; });
            // Al cambiar el principal, el backend también resetea su fecha.
            const nuevoPrincipal = ficha.tutores.find(t => t.idTutor === idTutor);
            if (nuevoPrincipal) {
              nuevoPrincipal.fechaUltimaActualizacion = new Date().toISOString();
            }
          }
        }
        this.modalTutor = null;
        this.snackBar.open('Datos del tutor actualizados.', 'Cerrar', { duration: 3000 });
      });
    }
  }

  // ─────────────────────────────────────────────
  // Modal: Eliminar Tutor
  // ─────────────────────────────────────────────

  intentarEliminarTutor(tutor: TutorFicha, idEstudiante: string): void {
    if (tutor.esPrincipal) {
      this.alertBloqueo = `${tutor.nombre} ${tutor.apellido}`;
      return;
    }
    this.modalEliminar = {
      idEstudiante,
      idTutor: tutor.idTutor,
      nombreTutor: `${tutor.nombre} ${tutor.apellido}`,
      eliminando: false,
    };
  }

  cerrarAlertBloqueo(): void {
    this.alertBloqueo = null;
  }

  cerrarModalEliminar(): void {
    if (this.modalEliminar?.eliminando) return;
    this.modalEliminar = null;
  }

  confirmarEliminarTutor(): void {
    if (!this.modalEliminar) return;
    const modal = this.modalEliminar;
    modal.eliminando = true;

    this.fichaService.removeTutor(modal.idEstudiante, modal.idTutor).pipe(
      catchError(() => {
        this.snackBar.open('Error al eliminar tutor.', 'Cerrar', { duration: 4000 });
        if (this.modalEliminar) this.modalEliminar.eliminando = false;
        return EMPTY;
      })
    ).subscribe(() => {
      const ficha = this.fichaMap.get(modal.idEstudiante);
      if (ficha) {
        ficha.tutores = ficha.tutores.filter(t => t.idTutor !== modal.idTutor);
      }
      this.modalEliminar = null;
      this.snackBar.open('Tutor eliminado correctamente.', 'Cerrar', { duration: 3000 });
    });
  }

  // ─────────────────────────────────────────────
  // Alerta y notificación: tutor desactualizado
  // ─────────────────────────────────────────────

  /**
   * Retorna true si el tutor principal del estudiante lleva más de 6 meses
   * sin que sus datos hayan sido actualizados.
   */
  tutorPrincipalDesactualizado(idEstudiante: string): boolean {
    const tutor = this.getTutorPrincipal(idEstudiante);
    if (!tutor?.fechaUltimaActualizacion) return false;
    const limite = new Date();
    limite.setMonth(limite.getMonth() - 6);
    return new Date(tutor.fechaUltimaActualizacion) < limite;
  }

  /**
   * Retorna true si ya se envió una notificación al tutor principal dentro
   * de los últimos 6 meses (es decir, no se puede reenviar todavía).
   */
  notificacionReciente(idEstudiante: string): boolean {
    const tutor = this.getTutorPrincipal(idEstudiante);
    if (!tutor?.fechaUltimaNotificacion) return false;
    const limite = new Date();
    limite.setMonth(limite.getMonth() - 6);
    return new Date(tutor.fechaUltimaNotificacion) >= limite;
  }

  /**
   * Retorna true si se puede enviar la notificación:
   * datos desactualizados (> 6 meses) Y sin notificación reciente (> 6 meses o nunca).
   */
  puedeEnviarNotificacion(idEstudiante: string): boolean {
    return this.tutorPrincipalDesactualizado(idEstudiante) && !this.notificacionReciente(idEstudiante);
  }

  /**
   * Retorna true si al menos un estudiante del curso tiene tutor que cumple
   * las condiciones para recibir notificación. Mientras las fichas se cargan
   * en segundo plano, el botón permanece habilitado (estado desconocido).
   */
  hayAlgunoParaNotificar(): boolean {
    const todasCargadas = this.fichaMap.size >= this.estudiantes.length && this.cargandoFichaIds.size === 0;
    if (!todasCargadas) return true;
    return this.estudiantes.some(e => this.puedeEnviarNotificacion(e.idEstudiante));
  }

  /**
   * Retorna cuántos estudiantes del curso tienen tutor pendiente de notificación.
   * Devuelve null si todavía se están cargando las fichas (conteo incompleto).
   */
  contarParaNotificar(): number | null {
    const todasCargadas = this.fichaMap.size >= this.estudiantes.length && this.cargandoFichaIds.size === 0;
    if (!todasCargadas) return null;
    return this.estudiantes.filter(e => this.puedeEnviarNotificacion(e.idEstudiante)).length;
  }

  /**
   * Envía notificaciones masivas a todos los tutores principales del curso
   * seleccionado cuyos datos llevan más de 6 meses sin actualizarse.
   * El backend filtra los que corresponden; si no hay ninguno informa con un mensaje.
   */
  enviarNotificacionCurso(): void {
    if (!this.cursoSeleccionado || this.enviandoNotificacionCurso) return;
    this.enviandoNotificacionCurso = true;

    this.fichaService.notificarTutoresCurso(this.cursoSeleccionado.idCurso).pipe(
      catchError(() => {
        this.snackBar.open('Error al enviar las notificaciones. Intentá de nuevo.', 'Cerrar', { duration: 5000 });
        this.enviandoNotificacionCurso = false;
        return EMPTY;
      })
    ).subscribe(res => {
      this.enviandoNotificacionCurso = false;
      if (res.enviados > 0) {
        // Actualizar localmente la fecha de notificación para todos los estudiantes
        // cargados que tengan tutor desactualizado, sin necesidad de recargar.
        const ahora = new Date().toISOString();
        this.estudiantes.forEach(e => {
          const tutor = this.getTutorPrincipal(e.idEstudiante);
          if (tutor && this.tutorPrincipalDesactualizado(e.idEstudiante)) {
            tutor.fechaUltimaNotificacion = ahora;
          }
        });
      }
      this.snackBar.open(res.mensaje, 'Cerrar', { duration: 5000 });
    });
  }

  /**
   * Envía la notificación por mail al tutor principal del estudiante.
   * Solo debe llamarse cuando puedeEnviarNotificacion() retorna true.
   */
  enviarNotificacion(idEstudiante: string): void {
    if (this.enviandoNotificacionIds.has(idEstudiante)) return;
    this.enviandoNotificacionIds.add(idEstudiante);

    this.fichaService.notificarTutorDesactualizado(idEstudiante).pipe(
      catchError(() => {
        this.snackBar.open('Error al enviar la notificación. Intentá de nuevo.', 'Cerrar', { duration: 5000 });
        this.enviandoNotificacionIds.delete(idEstudiante);
        return EMPTY;
      })
    ).subscribe(res => {
      this.enviandoNotificacionIds.delete(idEstudiante);
      if (res.enviado) {
        // Actualizar localmente para que el botón se deshabilite de inmediato.
        const tutor = this.getTutorPrincipal(idEstudiante);
        if (tutor) tutor.fechaUltimaNotificacion = new Date().toISOString();
      }
      this.snackBar.open(
        res.enviado ? 'Notificación enviada al tutor principal.' : res.mensaje,
        'Cerrar',
        { duration: 4000 }
      );
    });
  }

  // ─────────────────────────────────────────────
  // Modal: Detalle Tutor (fecha nacimiento + domicilio)
  // ─────────────────────────────────────────────

  verDetalleTutor(tutor: TutorFicha): void {
    this.modalDetalleTutor = { tutor };
  }

  cerrarModalDetalleTutor(): void {
    this.modalDetalleTutor = null;
  }

  // ─────────────────────────────────────────────
  // Alertas de datos incompletos
  // ─────────────────────────────────────────────

  estudianteTieneDatosFaltantes(idEstudiante: string): boolean {
    const ficha = this.fichaMap.get(idEstudiante);
    if (!ficha) return false;
    return !ficha.domicilio || !ficha.sexo;
  }

  tutorPrincipalTieneDatosFaltantes(idEstudiante: string): boolean {
    const tutor = this.getTutorPrincipal(idEstudiante);
    if (!tutor) return false;
    return !tutor.domicilio || !tutor.disponibilidad;
  }

  private cargarDatosCredencialQrModal(idEstudiante: string): void {
    if (!this.modalCredencialQr || this.modalCredencialQr.idEstudiante !== idEstudiante) {
      return;
    }

    this.modalCredencialQr.cargando = true;
    this.modalCredencialQr.error = null;

    this.fichaService.obtenerEstadoCredencialQr(idEstudiante).pipe(
      catchError((error: HttpErrorResponse) => {
        const msg = this.obtenerMensajeHttp(error, 'No se pudo cargar el estado de la credencial QR.');
        if (this.modalCredencialQr?.idEstudiante === idEstudiante) {
          this.modalCredencialQr.cargando = false;
          this.modalCredencialQr.error = msg;
          this.modalCredencialQr.status = null;
          this.limpiarImagenModalCredencial();
        }
        return EMPTY;
      })
    ).subscribe(status => {
      if (!this.modalCredencialQr || this.modalCredencialQr.idEstudiante !== idEstudiante) {
        return;
      }

      this.modalCredencialQr.status = status;

      if (status.estado !== 'ACTIVO') {
        this.modalCredencialQr.cargando = false;
        this.limpiarImagenModalCredencial();
        return;
      }

      this.fichaService.obtenerImagenCredencialQr(idEstudiante).pipe(
        catchError((error: HttpErrorResponse) => {
          const msg = this.obtenerMensajeHttp(error, 'No se pudo cargar la imagen de la credencial QR.');
          if (this.modalCredencialQr?.idEstudiante === idEstudiante) {
            this.modalCredencialQr.error = msg;
            this.modalCredencialQr.cargando = false;
            this.limpiarImagenModalCredencial();
          }
          return EMPTY;
        })
      ).subscribe(blob => {
        if (!this.modalCredencialQr || this.modalCredencialQr.idEstudiante !== idEstudiante) {
          return;
        }
        this.setearImagenModalCredencial(blob);
        this.modalCredencialQr.cargando = false;
      });
    });
  }

  private setearImagenModalCredencial(blob: Blob): void {
    if (!this.modalCredencialQr) return;

    this.limpiarImagenModalCredencial();
    const imageUrl = this.qrObjectUrls.create(blob);
    this.modalCredencialQr.imageUrl = imageUrl;
  }

  private limpiarImagenModalCredencial(): void {
    const imageUrl = this.modalCredencialQr?.imageUrl;
    if (!imageUrl) return;

    this.qrObjectUrls.revoke(imageUrl);

    if (this.modalCredencialQr) {
      this.modalCredencialQr.imageUrl = null;
    }
  }

  private obtenerMensajeHttp(error: HttpErrorResponse, fallback: string): string {
    if (typeof error.error === 'string' && error.error.trim().length > 0) {
      return error.error;
    }

    if (error.error?.message && typeof error.error.message === 'string') {
      return error.error.message;
    }

    if (error.error?.error && typeof error.error.error === 'string') {
      return error.error.error;
    }

    return fallback;
  }
}
