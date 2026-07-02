import { Component, Inject, Injectable, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DATE_LOCALE,
  MatNativeDateModule,
  NativeDateAdapter,
  DateAdapter,
  MAT_DATE_FORMATS,
  MatDateFormats,
} from '@angular/material/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { CalendarioService } from '../../services/calendario.service';
import {
  EventoInstitucional,
  CrearEventoRequest,
  AuditoriaEvento,
  TipoEvento,
  CursoSeleccion,
  LABEL_TIPO_EVENTO,
} from '../../models/calendario.model';

// ─── DateAdapter DD/MM/YYYY ───────────────────────────────────────────────────

@Injectable()
class DdMmYyyyDateAdapter extends NativeDateAdapter {
  override format(date: Date, displayFormat: object): string {
    if ((displayFormat as unknown as string) === 'input') {
      const d = String(date.getDate()).padStart(2, '0');
      const m = String(date.getMonth() + 1).padStart(2, '0');
      return `${d}/${m}/${date.getFullYear()}`;
    }
    return super.format(date, displayFormat);
  }
}

const DD_MM_YYYY: MatDateFormats = {
  parse:   { dateInput: { day: 'numeric', month: 'numeric', year: 'numeric' } },
  display: {
    dateInput:          'input',
    monthYearLabel:     { year: 'numeric', month: 'short'  },
    dateA11yLabel:      { year: 'numeric', month: 'long',  day: 'numeric' },
    monthYearA11yLabel: { year: 'numeric', month: 'long'   },
  },
};

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface EventoDialogData {
  modo: 'crear' | 'editar' | 'detalle';
  evento?: EventoInstitucional;
  tiposEvento: TipoEvento[];
  cursos: CursoSeleccion[];
  anioLectivo: number;
  puedeEditar?: boolean;
}

// ─── Componente ───────────────────────────────────────────────────────────────

@Component({
  selector: 'app-evento-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  providers: [
    { provide: MAT_DATE_LOCALE,  useValue: 'es-AR'                 },
    { provide: DateAdapter,      useClass: DdMmYyyyDateAdapter      },
    { provide: MAT_DATE_FORMATS, useValue: DD_MM_YYYY               },
  ],
  templateUrl: './evento-dialog.component.html',
  styleUrl: './evento-dialog.component.scss',
})
export class EventoDialogComponent implements OnInit {
  form!: FormGroup;
  modo: 'crear' | 'editar' | 'detalle';
  guardando = false;
  eliminando = false;

  auditoria: AuditoriaEvento[] = [];
  cargandoAuditoria = false;
  auditoriaAbierta = false;

  readonly tiposEvento: TipoEvento[];
  readonly cursos: CursoSeleccion[];
  readonly labelTipo = LABEL_TIPO_EVENTO;

  constructor(
    private fb: FormBuilder,
    private calendarioService: CalendarioService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<EventoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EventoDialogData,
  ) {
    this.modo = data.modo;
    this.tiposEvento = data.tiposEvento;
    this.cursos = data.cursos;
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      titulo: ['', [Validators.required, Validators.maxLength(300)]],
      descripcion: ['', [Validators.maxLength(2000)]],
      tipoEvento: [null, Validators.required],
      fechaInicio: [null, Validators.required],
      fechaFin: [null, Validators.required],
      contabilizaAsistencia: [true],
      cambioActividad: [false],
      comentarioCambioActividad: ['', [Validators.maxLength(2000)]],
      cursoIds: [[] as string[]],
    }, { validators: [this.fechaFinValidator] });

    if (this.data.evento && (this.modo === 'editar' || this.modo === 'detalle')) {
      const e = this.data.evento;
      this.form.patchValue({
        titulo: e.titulo,
        descripcion: e.descripcion ?? '',
        tipoEvento: e.tipoEvento,
        fechaInicio: this.parseDateOnly(e.fechaInicio),
        fechaFin: this.parseDateOnly(e.fechaFin),
        contabilizaAsistencia: e.contabilizaAsistencia,
        cambioActividad: e.cambioActividad,
        comentarioCambioActividad: e.comentarioCambioActividad ?? '',
        cursoIds: e.cursos.map(c => c.idCurso),
      });
    }

    if (this.modo === 'detalle') {
      this.form.disable();
      this.cargarAuditoria();
    }

    // Reaccionar a cambio de tipo
    this.form.get('tipoEvento')!.valueChanges.subscribe(tipo => this.onTipoChange(tipo));
    // Reaccionar a cambio de actividad
    this.form.get('cambioActividad')!.valueChanges.subscribe(v => this.onCambioActividadChange(v));

    // Aplicar reglas iniciales
    const tipoInicial = this.form.get('tipoEvento')!.value;
    if (tipoInicial) this.onTipoChange(tipoInicial);
  }

  get esPeriodoClases(): boolean {
    return this.form.get('tipoEvento')!.value === 5;
  }

  get esPeriodoEvaluacion(): boolean {
    return this.form.get('tipoEvento')!.value === 6;
  }

  get esFeriado(): boolean {
    return this.form.get('tipoEvento')!.value === 4;
  }

  get contabilizaDeshabilitado(): boolean {
    return this.esPeriodoClases || this.esFeriado || this.esPeriodoEvaluacion;
  }

  get cambioActividadDeshabilitado(): boolean {
    return this.esPeriodoClases || this.esPeriodoEvaluacion;
  }

  get mostrarCursos(): boolean {
    return !this.esPeriodoClases;
  }

  get mostrarComentarioCambio(): boolean {
    return this.form.get('cambioActividad')!.value === true;
  }

  get tituloDialog(): string {
    switch (this.modo) {
      case 'crear': return 'Nuevo evento';
      case 'editar': return 'Editar evento';
      case 'detalle': return 'Detalle del evento';
    }
  }

  // ─── Validador de fecha fin >= inicio ─────────────────────────────────────────

  private fechaFinValidator(group: AbstractControl): ValidationErrors | null {
    const inicio = group.get('fechaInicio')?.value as Date | null;
    const fin = group.get('fechaFin')?.value as Date | null;
    if (inicio && fin && fin < inicio) {
      return { fechaFinAnterior: true };
    }
    return null;
  }

  // ─── Cambios de tipo ──────────────────────────────────────────────────────────

  private onTipoChange(tipo: number): void {
    if (this.modo === 'detalle') return;

    if (tipo === 5) {
      // Período de Clases
      this.form.get('contabilizaAsistencia')!.setValue(true);
      this.form.get('contabilizaAsistencia')!.disable();
      this.form.get('cambioActividad')!.setValue(false);
      this.form.get('cambioActividad')!.disable();
      this.form.get('cursoIds')!.setValue([]);
    } else if (tipo === 6) {
      // Período de Evaluación
      this.form.get('contabilizaAsistencia')!.setValue(true);
      this.form.get('contabilizaAsistencia')!.disable();
      this.form.get('cambioActividad')!.setValue(false);
      this.form.get('cambioActividad')!.disable();
    } else if (tipo === 4) {
      // Feriado
      this.form.get('contabilizaAsistencia')!.setValue(false);
      this.form.get('contabilizaAsistencia')!.disable();
      this.form.get('cambioActividad')!.enable();
    } else {
      this.form.get('contabilizaAsistencia')!.enable();
      this.form.get('cambioActividad')!.enable();
    }
  }

  private onCambioActividadChange(activo: boolean): void {
    if (activo) {
      this.form.get('comentarioCambioActividad')!.setValidators([Validators.required, Validators.maxLength(2000)]);
    } else {
      this.form.get('comentarioCambioActividad')!.clearValidators();
      this.form.get('comentarioCambioActividad')!.setValue('');
    }
    this.form.get('comentarioCambioActividad')!.updateValueAndValidity();
  }

  // ─── Acciones ─────────────────────────────────────────────────────────────────

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando = true;
    const dto = this.buildDto();

    const obs$ = this.modo === 'editar' && this.data.evento
      ? this.calendarioService.actualizarEvento(this.data.evento.idEvento, dto)
      : this.calendarioService.crearEvento(dto);

    obs$.subscribe({
      next: () => {
        this.snackBar.open(
          this.modo === 'editar' ? 'Evento actualizado' : 'Evento creado',
          'OK', { duration: 3000 }
        );
        this.dialogRef.close('guardado');
      },
      error: (err) => {
        const msg = err?.error?.error ?? err?.error ?? 'Error al guardar el evento.';
        this.snackBar.open(msg, 'Cerrar', { duration: 6000 });
        this.guardando = false;
      },
    });
  }

  confirmarEliminacion = false;

  eliminar(): void {
    if (!this.data.evento) return;

    if (!this.confirmarEliminacion) {
      this.confirmarEliminacion = true;
      return;
    }

    this.eliminando = true;
    this.calendarioService.eliminarEvento(this.data.evento.idEvento).subscribe({
      next: () => {
        this.snackBar.open('Evento eliminado', 'OK', { duration: 3000 });
        this.dialogRef.close('eliminado');
      },
      error: () => {
        this.snackBar.open('Error al eliminar el evento.', 'OK', { duration: 5000 });
        this.eliminando = false;
        this.confirmarEliminacion = false;
      },
    });
  }

  cancelarEliminacion(): void {
    this.confirmarEliminacion = false;
  }

  pasarAEditar(): void {
    this.modo = 'editar';
    this.form.enable();
    const tipo = this.form.get('tipoEvento')!.value;
    if (tipo) this.onTipoChange(tipo);
  }

  cancelar(): void {
    this.dialogRef.close();
  }

  // ─── Auditoría ────────────────────────────────────────────────────────────────

  toggleAuditoria(): void {
    this.auditoriaAbierta = !this.auditoriaAbierta;
  }

  private cargarAuditoria(): void {
    if (!this.data.evento) return;
    this.cargandoAuditoria = true;
    this.calendarioService.obtenerAuditoriaEvento(this.data.evento.idEvento).subscribe({
      next: data => {
        this.auditoria = data;
        this.cargandoAuditoria = false;
      },
      error: () => {
        this.cargandoAuditoria = false;
      },
    });
  }

  /** Parsea el JSON de auditoría y genera líneas legibles */
  parsearDetalle(a: AuditoriaEvento): string[] {
    if (a.tipoOperacion === 'Creación' && a.valoresNuevos) {
      return this.formatearCampos(JSON.parse(a.valoresNuevos));
    }
    if (a.tipoOperacion === 'Eliminación' && a.valoresAnteriores) {
      return this.formatearCampos(JSON.parse(a.valoresAnteriores));
    }
    if (a.tipoOperacion === 'Modificación' && a.valoresAnteriores && a.valoresNuevos) {
      const antes = JSON.parse(a.valoresAnteriores);
      const despues = JSON.parse(a.valoresNuevos);
      return this.formatearDiferencias(antes, despues);
    }
    return [];
  }

  private formatearCampos(obj: Record<string, unknown>): string[] {
    const lineas: string[] = [];
    for (const [key, val] of Object.entries(obj)) {
      lineas.push(`${this.labelCampo(key)}: ${this.formatearValor(key, val)}`);
    }
    return lineas;
  }

  private formatearDiferencias(antes: Record<string, unknown>, despues: Record<string, unknown>): string[] {
    const lineas: string[] = [];
    for (const key of Object.keys(despues)) {
      const va = antes[key];
      const vd = despues[key];
      if (JSON.stringify(va) !== JSON.stringify(vd)) {
        lineas.push(`${this.labelCampo(key)}: ${this.formatearValor(key, va)} → ${this.formatearValor(key, vd)}`);
      }
    }
    return lineas;
  }

  private labelCampo(key: string): string {
    const map: Record<string, string> = {
      Titulo: 'Título',
      Descripcion: 'Descripción',
      TipoEvento: 'Tipo',
      FechaInicio: 'Fecha inicio',
      FechaFin: 'Fecha fin',
      ContabilizaAsistencia: 'Contabiliza asistencia',
      CambioActividad: 'Cambio de actividad',
      ComentarioCambioActividad: 'Comentario cambio',
      CursoIds: 'Cursos',
    };
    return map[key] ?? key;
  }

  private formatearValor(key: string, val: unknown): string {
    if (val === null || val === undefined) return '—';
    if (key === 'TipoEvento') return this.labelTipo[val as number] ?? String(val);
    if (key === 'FechaInicio' || key === 'FechaFin') return this.formatFechaIso(val as string);
    if (key === 'ContabilizaAsistencia' || key === 'CambioActividad') return val ? 'Sí' : 'No';
    if (key === 'CursoIds') {
      const ids = val as string[];
      if (!ids || ids.length === 0) return 'Todos';
      return ids.map(id => this.cursos.find(c => c.id === id)?.label ?? id).join(', ');
    }
    return String(val);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private buildDto(): CrearEventoRequest {
    const v = this.form.getRawValue();
    return {
      titulo: v.titulo,
      descripcion: v.descripcion || undefined,
      tipoEvento: v.tipoEvento,
      fechaInicio: this.toDateString(v.fechaInicio),
      fechaFin: this.toDateString(v.fechaFin),
      contabilizaAsistencia: v.contabilizaAsistencia,
      cambioActividad: v.cambioActividad,
      comentarioCambioActividad: v.cambioActividad ? v.comentarioCambioActividad : undefined,
      cursoIds: v.cursoIds?.length > 0 ? v.cursoIds : undefined,
    };
  }

  private toDateString(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private parseDateOnly(iso: string): Date {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  formatFechaIso(iso: string): string {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  formatFechaHora(iso: string): string {
    const d = new Date(iso);
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const hora = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dia}/${mes} ${hora}:${min}`;
  }
}
