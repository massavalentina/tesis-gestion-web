import { Component, OnInit, Injectable, Inject } from '@angular/core';
import { CommonModule }                      from '@angular/common';
import { ReactiveFormsModule, FormControl }  from '@angular/forms';
import { FormsModule }                       from '@angular/forms';
import { forkJoin }                          from 'rxjs';

import { MatSelectModule }          from '@angular/material/select';
import { MatDatepickerModule }      from '@angular/material/datepicker';
import { MatNativeDateModule, NativeDateAdapter, DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, MatDateFormats } from '@angular/material/core';
import { MatFormFieldModule }       from '@angular/material/form-field';
import { MatInputModule }           from '@angular/material/input';
import { MatButtonModule }          from '@angular/material/button';
import { MatIconModule }            from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule }         from '@angular/material/tooltip';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule }         from '@angular/material/divider';

import { ParteDiarioService, AgregarComentarioDto, ReorganizarHorarioDto, SlotReorganizadoDto } from '../services/parte-diario.service';
import { ParteDiarioResumen }  from '../models/parte-diario-resumen.model';
import { ComentarioParte }     from '../models/comentario-parte.model';
import { TurnoParte }          from '../models/turno-parte.model';
import { HorarioClase }        from '../models/horario-clase.model';
import { EstudianteParte }     from '../models/estudiante-parte.model';
import { CursoManual }         from '../../asistencia-general-manual/models/curso-manual.model';

import { ClaseDictadaDialogComponent, ClaseDictadaDialogData, ClaseDictadaDialogResult }
  from './clase-dictada-dialog/clase-dictada-dialog.component';
import { DetalleEstudianteDialogComponent, DetalleDialogData }
  from '../../asistencia-general-manual/components/detalle-estudiante-dialog/detalle-estudiante-dialog.component';
import { FilaAsistenciaManual } from '../../asistencia-general-manual/models/fila-asistencia-manual.model';

// ── Date adapter DD/MM/YYYY (igual que asistencia-manual) ────────────────────
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

// ── Dialog: confirmar restablecimiento de horario ────────────────────────────
interface ConfirmResetearData { materia: string; horaEntrada: string; horaSalida: string; }

@Component({
  selector: 'app-confirm-resetear-horario',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title style="margin:0 0 12px;font-size:1.05rem;font-weight:700;">Restablecer horario</h2>
    <mat-dialog-content>
      <p style="color:#475569;margin:0 0 6px;">
        El horario de <strong>{{ data.materia }}</strong> volverá a su horario original
        ({{ data.horaEntrada }} – {{ data.horaSalida }}).
      </p>
      <p style="color:#475569;margin:0;">
        Si se registraron asistencias por espacio curricular manualmente, estas no serán modificadas.
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">Cancelar</button>
      <button mat-flat-button color="warn" [mat-dialog-close]="true">Restablecer</button>
    </mat-dialog-actions>
  `,
})
export class ConfirmResetearHorarioDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: ConfirmResetearData) {}
}

// ── Dialog: confirmar descarte de cambios de horario ─────────────────────────
@Component({
  selector: 'app-confirm-descartar-horario',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title style="margin:0 0 12px;font-size:1.05rem;font-weight:700;">Cambios sin guardar</h2>
    <mat-dialog-content>
      <p style="color:#475569;margin:0 0 4px;">Tenés cambios en el horario que no fueron guardados.</p>
      <p style="color:#475569;margin:0;">¿Querés descartarlos?</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">Volver</button>
      <button mat-flat-button color="warn" [mat-dialog-close]="true">Descartar cambios</button>
    </mat-dialog-actions>
  `,
})
export class ConfirmDescartarHorarioDialogComponent {}

@Component({
  selector: 'app-parte-diario',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule,
    MatDividerModule,
    FormsModule,
  ],

  templateUrl: './parte-diario.component.html',
  styleUrls: ['./parte-diario.component.css'],
  providers: [
    { provide: MAT_DATE_LOCALE,  useValue: 'es-AR'            },
    { provide: DateAdapter,      useClass: DdMmYyyyDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: DD_MM_YYYY          },
  ],
})
export class ParteDiarioComponent implements OnInit {

  cursoCtrl  = new FormControl<string | null>(null);
  fechaCtrl  = new FormControl<Date>(ParteDiarioComponent.ultimoDiaLaboral());

  cursos: CursoManual[]      = [];
  resumen: ParteDiarioResumen | null = null;
  comentarios: ComentarioParte[]     = [];

  cargando        = false;
  guardandoComent = false;
  nuevoCom        = '';

  turnoActivo: 'manana' | 'tarde' = 'manana';

  // ── Edit mode horario ─────────────────────────────────────────────────────
  modoEdicionHorario  = false;
  guardandoHorario    = false;
  horarioPendiente:      HorarioClase[] = [];
  horarioOriginalEdicion: HorarioClase[] = [];

  // Filtro calendario: solo lunes–viernes
  readonly filtroLaborable = (d: Date | null): boolean => {
    const dia = (d ?? new Date()).getDay();
    return dia !== 0 && dia !== 6;
  };

  private static ultimoDiaLaboral(): Date {
    const d = new Date();
    if (d.getDay() === 0) d.setDate(d.getDate() - 2);
    if (d.getDay() === 6) d.setDate(d.getDate() - 1);
    return d;
  }

  constructor(
    private service: ParteDiarioService,
    private dialog:  MatDialog,
    private snack:   MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.service.getCursos().subscribe({
      next: c => { this.cursos = c; },
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  get turnoActual(): TurnoParte | null {
    if (!this.resumen) return null;
    return this.turnoActivo === 'manana' ? this.resumen.manana : this.resumen.tarde;
  }

  get fechaString(): string {
    const d = this.fechaCtrl.value ?? new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  get presentes(): EstudianteParte[]  { return this.turnoActual?.estudiantes.filter(e => e.estado === 'Presente')   ?? []; }
  get ausentes():  EstudianteParte[]  { return this.turnoActual?.estudiantes.filter(e => e.estado === 'Ausente')    ?? []; }
  get retirados(): EstudianteParte[]  { return this.turnoActual?.estudiantes.filter(e => e.estado === 'Retirado')   ?? []; }
  get sinReg():    EstudianteParte[]  { return this.turnoActual?.estudiantes.filter(e => e.estado === 'SinRegistro') ?? []; }

  sortNombreAsc = true;

  get listaOrdenada(): EstudianteParte[] {
    const list = [...(this.turnoActual?.estudiantes ?? [])];
    return list.sort((a, b) => {
      const cmp = a.apellido.localeCompare(b.apellido, 'es-AR') || a.nombre.localeCompare(b.nombre, 'es-AR');
      return this.sortNombreAsc ? cmp : -cmp;
    });
  }

  estadoColor(estado: string): string {
    switch (estado) {
      case 'Presente':    return 'chip-presente';
      case 'Ausente':     return 'chip-ausente';
      case 'Retirado':    return 'chip-retirado';
      default:            return 'chip-sin';
    }
  }

  formatTimestamp(ts: string): string {
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  logTitulo(contenido: string): string {
    return contenido.split('\n')[0];
  }

  logBullets(contenido: string): string[] {
    const lines = contenido.split('\n');
    return lines.length > 1 ? lines.slice(1).filter(l => l.trim()) : [];
  }

  // ── Load ─────────────────────────────────────────────────────────────────

  cargarResumen(): void {
    if (this.modoEdicionHorario && this.hayCambiosHorario()) {
      this.dialog.open(ConfirmDescartarHorarioDialogComponent, { width: '380px' })
        .afterClosed().subscribe(ok => {
          if (ok) { this.salirModoEdicion(); this._ejecutarCarga(); }
        });
      return;
    }
    if (this.modoEdicionHorario) this.salirModoEdicion();
    this._ejecutarCarga();
  }

  private _ejecutarCarga(): void {
    const cursoId = this.cursoCtrl.value;
    if (!cursoId) { this.snack.open('Seleccioná un curso.', '', { duration: 2500 }); return; }

    this.cargando = true;
    this.resumen  = null;

    forkJoin([
      this.service.getResumen(cursoId, this.fechaString),
      this.service.getComentarios(cursoId, this.fechaString),
    ]).subscribe({
      next: ([res, coms]) => {
        this.resumen     = res;
        this.comentarios = coms;
        this.cargando    = false;
        if (!res.manana.disponible && res.tarde.disponible) {
          this.turnoActivo = 'tarde';
        } else {
          this.turnoActivo = 'manana';
        }
      },
      error: () => {
        this.cargando = false;
        this.snack.open('Error al cargar el parte diario.', '', { duration: 3000 });
      },
    });
  }

  // ── Clase dictada dialog ──────────────────────────────────────────────────

  onToggleClase(clase: HorarioClase): void {
    const cursoId = this.cursoCtrl.value;
    if (!cursoId) return;

    const nuevoDictada = clase.dictada === false ? true : false;

    // Al reactivar una clase No Dictada → Dictada, verificar superposición con las ya dictadas
    if (nuevoDictada === true && clase.dictada === false) {
      const clases = this.turnoActual?.horarioClases ?? [];
      const e1 = this.horaAMinutos(clase.horaEntrada);
      const s1 = this.horaAMinutos(clase.horaSalida);
      if (!isNaN(e1) && !isNaN(s1) && s1 > e1) {
        const hayConflicto = clases.some(other => {
          if (other.idHorario === clase.idHorario || other.dictada === false) return false;
          const e2 = this.horaAMinutos(other.horaEntrada);
          const s2 = this.horaAMinutos(other.horaSalida);
          if (isNaN(e2) || isNaN(s2)) return false;
          return e1 < s2 && e2 < s1;
        });
        if (hayConflicto) {
          this.snack.open(
            'El rango de esta clase se superpone con otra clase ya dictada. Ajustá el horario antes de activarla.',
            'OK', { duration: 5000 },
          );
          return;
        }
      }
    }

    const ref = this.dialog.open<ClaseDictadaDialogComponent, ClaseDictadaDialogData, ClaseDictadaDialogResult | null>(
      ClaseDictadaDialogComponent,
      { data: { clase, nuevoDictada }, width: '460px' },
    );

    ref.afterClosed().subscribe(result => {
      if (!result) return;

      this.service.actualizarClaseDictada({
        idHorario: clase.idHorario,
        fecha:     this.fechaString,
        dictada:   result.dictada,
        motivo:    result.motivo,
      }).subscribe({
        next: () => {
          this.snack.open('Clase actualizada.', '', { duration: 2000 });
          // Recargar para reflejar el cambio y el nuevo evento en el log
          this.cargarResumen();
        },
        error: () => this.snack.open('Error al actualizar la clase.', '', { duration: 3000 }),
      });
    });
  }

  // ── Detalle estudiante ────────────────────────────────────────────────────

  onVerEstudiante(est: EstudianteParte): void {
    const fila: FilaAsistenciaManual = {
      estudiante:             { idEstudiante: est.idEstudiante, nombre: est.nombre, apellido: est.apellido, documento: est.documento },
      tipoManianaId:          null,
      tipoTardeId:            null,
      modificadoManana:       false,
      modificadoTarde:        false,
      guardado:               false,
      error:                  null,
      guardandoFila:          false,
      valorTotalInasistencia: null,
    };

    const d = this.fechaCtrl.value ?? new Date();
    const fechaDisplay = d.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    this.dialog.open<DetalleEstudianteDialogComponent, DetalleDialogData>(
      DetalleEstudianteDialogComponent,
      {
        data: { fila, fecha: this.fechaString, fechaDisplay, tipos: [] },
        width: '620px',
        maxHeight: '85vh',
      },
    );
  }

  // ── Edit mode horario ─────────────────────────────────────────────────────

  entrarModoEdicion(): void {
    const clases = this.turnoActual?.horarioClases ?? [];
    // Copia profunda de cada objeto para que editar horarioPendiente no afecte la vista original
    this.horarioOriginalEdicion = clases.map(c => ({ ...c }));
    this.horarioPendiente       = clases.map(c => ({ ...c }));
    this.modoEdicionHorario     = true;
  }

  private salirModoEdicion(): void {
    this.modoEdicionHorario     = false;
    this.horarioPendiente       = [];
    this.horarioOriginalEdicion = [];
  }

  hayCambiosHorario(): boolean {
    return this.horarioPendiente.some((c, i) => {
      const orig = this.horarioOriginalEdicion[i];
      return !orig
          || c.idHorario   !== orig.idHorario
          || c.horaEntrada !== orig.horaEntrada
          || c.horaSalida  !== orig.horaSalida;
    });
  }

  /** Convierte "HH:mm" a minutos totales; devuelve NaN si el formato es inválido. */
  private horaAMinutos(hora: string): number {
    if (!hora || !/^\d{2}:\d{2}$/.test(hora)) return NaN;
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m;
  }

  /**
   * true si el rango de esta clase se superpone con otra clase DICTADA en horarioPendiente.
   * Las clases No Dictadas quedan excluidas del análisis.
   */
  tieneSuperposicion(c: HorarioClase): boolean {
    if (c.dictada === false) return false;
    const e1 = this.horaAMinutos(c.horaEntrada);
    const s1 = this.horaAMinutos(c.horaSalida);
    if (isNaN(e1) || isNaN(s1) || s1 <= e1) return false;
    return this.horarioPendiente.some(other => {
      if (other === c || other.dictada === false) return false;
      const e2 = this.horaAMinutos(other.horaEntrada);
      const s2 = this.horaAMinutos(other.horaSalida);
      if (isNaN(e2) || isNaN(s2) || s2 <= e2) return false;
      return e1 < s2 && e2 < s1;
    });
  }

  /**
   * Devuelve el mensaje de error de horario para una clase, o null si es válido.
   * Las clases No Dictadas no se validan.
   */
  errorHorario(c: HorarioClase): string | null {
    if (c.dictada === false) return null;
    const e = this.horaAMinutos(c.horaEntrada);
    const s = this.horaAMinutos(c.horaSalida);
    if (isNaN(e) || isNaN(s)) return null;
    const minutos = s - e;
    if (minutos <= 0)  return 'La hora de salida debe ser posterior a la de entrada.';
    if (minutos < 40)  return `Duración mínima 40 min — actual: ${minutos} min.`;
    if (this.tieneSuperposicion(c)) return 'El rango se superpone con otra clase.';
    return null;
  }

  /** true si algún slot dictado tiene hora inválida, duración < 40 min o superposición. */
  timesInvalidos(): boolean {
    const re = /^\d{2}:\d{2}$/;
    return this.horarioPendiente.some(c => {
      if (c.dictada === false) return false;
      if (!re.test(c.horaEntrada) || !re.test(c.horaSalida)) return true;
      const minutos = this.horaAMinutos(c.horaSalida) - this.horaAMinutos(c.horaEntrada);
      return minutos < 40 || this.tieneSuperposicion(c);
    });
  }

  onMoverClasePendiente(index: number, direction: 'up' | 'down'): void {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= this.horarioPendiente.length) return;
    [this.horarioPendiente[index], this.horarioPendiente[target]] =
      [this.horarioPendiente[target], this.horarioPendiente[index]];
  }

  cancelarEdicionHorario(): void {
    if (!this.hayCambiosHorario()) { this.salirModoEdicion(); return; }
    this.dialog.open(ConfirmDescartarHorarioDialogComponent, { width: '380px' })
      .afterClosed().subscribe(ok => { if (ok) this.salirModoEdicion(); });
  }

  guardarReorganizacion(): void {
    const cursoId = this.cursoCtrl.value;
    if (!cursoId) return;
    this.guardandoHorario = true;
    const slots: SlotReorganizadoDto[] = this.horarioPendiente.map(c => ({
      idHorario:   c.idHorario,
      horaEntrada: c.horaEntrada,
      horaSalida:  c.horaSalida,
    }));
    const dto: ReorganizarHorarioDto = { cursoId, fecha: this.fechaString, slots };
    this.service.reorganizarHorario(dto).subscribe({
      next: () => {
        this.guardandoHorario = false;
        this.salirModoEdicion();
        this.snack.open('Horario guardado.', '', { duration: 2000 });
        this._ejecutarCarga();
      },
      error: () => {
        this.guardandoHorario = false;
        this.snack.open('Error al guardar el horario.', '', { duration: 3000 });
      },
    });
  }

  onResetearHorario(clase: HorarioClase): void {
    const cursoId = this.cursoCtrl.value;
    if (!cursoId) return;

    this.dialog.open<ConfirmResetearHorarioDialogComponent, ConfirmResetearData, boolean>(
      ConfirmResetearHorarioDialogComponent,
      {
        width: '420px',
        data: {
          materia:     clase.materia,
          horaEntrada: clase.horaEntradaOriginal!,
          horaSalida:  clase.horaSalidaOriginal!,
        },
      },
    ).afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.service.resetearHorario(clase.idHorario, cursoId, this.fechaString).subscribe({
        next: () => {
          this.snack.open('Horario restablecido.', '', { duration: 2000 });
          this._ejecutarCarga();
        },
        error: () => this.snack.open('Error al restablecer el horario.', '', { duration: 3000 }),
      });
    });
  }

  // ── Comentarios ───────────────────────────────────────────────────────────

  onAgregarComentario(): void {
    const cursoId = this.cursoCtrl.value;
    const texto   = this.nuevoCom.trim();
    if (!cursoId || !texto) return;

    this.guardandoComent = true;
    const dto: AgregarComentarioDto = {
      cursoId,
      fecha:    this.fechaString,
      contenido: texto,
      autor:    'Preceptor',
    };

    this.service.agregarComentario(dto).subscribe({
      next: com => {
        this.comentarios = [com, ...this.comentarios];
        this.nuevoCom        = '';
        this.guardandoComent = false;
      },
      error: () => {
        this.guardandoComent = false;
        this.snack.open('Error al agregar el comentario.', '', { duration: 3000 });
      },
    });
  }
}
