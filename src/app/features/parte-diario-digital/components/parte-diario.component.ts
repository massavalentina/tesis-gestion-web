import { Component, OnInit }               from '@angular/core';
import { CommonModule }                      from '@angular/common';
import { ReactiveFormsModule, FormControl }  from '@angular/forms';
import { FormsModule }                       from '@angular/forms';
import { forkJoin }                          from 'rxjs';

import { MatSelectModule }          from '@angular/material/select';
import { MatDatepickerModule }      from '@angular/material/datepicker';
import { MatNativeDateModule }      from '@angular/material/core';
import { MatFormFieldModule }       from '@angular/material/form-field';
import { MatInputModule }           from '@angular/material/input';
import { MatButtonModule }          from '@angular/material/button';
import { MatIconModule }            from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule }         from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule }         from '@angular/material/divider';

import { ParteDiarioService, AgregarComentarioDto, ReorganizarHorarioDto } from '../services/parte-diario.service';
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

    const ref = this.dialog.open<ClaseDictadaDialogComponent, ClaseDictadaDialogData, ClaseDictadaDialogResult | null>(
      ClaseDictadaDialogComponent,
      { data: { clase, nuevoDictada }, width: '460px' },
    );

    ref.afterClosed().subscribe(result => {
      if (!result) return;

      this.service.actualizarClaseDictada({
        idEC:    clase.idEC,
        fecha:   this.fechaString,
        dictada: result.dictada,
        motivo:  result.motivo,
        tema:    result.tema,
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
    this.horarioOriginalEdicion = [...clases];
    this.horarioPendiente       = [...clases];
    this.modoEdicionHorario     = true;
  }

  private salirModoEdicion(): void {
    this.modoEdicionHorario     = false;
    this.horarioPendiente       = [];
    this.horarioOriginalEdicion = [];
  }

  hayCambiosHorario(): boolean {
    return this.horarioPendiente.some((c, i) => c.idEC !== this.horarioOriginalEdicion[i]?.idEC);
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
    const dto: ReorganizarHorarioDto = {
      cursoId,
      fecha:          this.fechaString,
      idECsOrdenados: this.horarioPendiente.map(c => c.idEC),
    };
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
    this.service.resetearHorario(clase.idEC, cursoId, this.fechaString).subscribe({
      next: () => {
        this.snack.open('Horario restablecido.', '', { duration: 2000 });
        this._ejecutarCarga();
      },
      error: () => this.snack.open('Error al restablecer el horario.', '', { duration: 3000 }),
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
