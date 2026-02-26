import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, Subscription } from 'rxjs';

import { MatSelectModule }          from '@angular/material/select';
import { MatFormFieldModule }       from '@angular/material/form-field';
import { MatInputModule }           from '@angular/material/input';
import { MatButtonModule }          from '@angular/material/button';
import { MatIconModule }            from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule }           from '@angular/material/table';
import { MatTooltipModule }         from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AsistenciaGeneralManualService } from '../services/asistencia-general-manual.service';
import { CursoManual }               from '../models/curso-manual.model';
import { FilaAsistenciaManual }       from '../models/fila-asistencia-manual.model';
import { TipoAsistenciaManual, CODIGOS_CON_HORA } from '../models/tipo-asistencia-manual.model';
import { RegistrarAsistenciaManual }  from '../models/registrar-asistencia-manual.model';

@Component({
  selector: 'app-asistencia-general-manual',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
    MatSnackBarModule,
  ],
  templateUrl: './asistencia-general-manual.component.html',
  styleUrls: ['./asistencia-general-manual.component.css']
})
export class AsistenciaGeneralManualComponent implements OnInit, OnDestroy {

  // ── Cursos ────────────────────────────────────────────────────────────────
  cursos: CursoManual[] = [];
  cursoSeleccionado: CursoManual | null = null;

  // ── Tipos ─────────────────────────────────────────────────────────────────
  tipos: TipoAsistenciaManual[] = [];

  // ── Tabla ─────────────────────────────────────────────────────────────────
  filas: FilaAsistenciaManual[] = [];
  columnas = ['nro', 'estudiante', 'documento', 'manana', 'horaManana', 'tarde', 'horaTarde', 'acciones'];

  // ── Fecha ─────────────────────────────────────────────────────────────────
  fechaHoy   = this.buildFechaHoy();
  fechaLabel = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  // ── Estados ───────────────────────────────────────────────────────────────
  cargandoInicial = false;
  cargandoTabla   = false;
  guardandoLote   = false;
  errorMsg        = '';

  /** En false, las columnas de hora se ocultan y el backend usa DateTime.Now */
  modoDesarrollo = true;

  private subs: Subscription[] = [];

  constructor(
    private service: AsistenciaGeneralManualService,
    private snack:   MatSnackBar
  ) {}

  ngOnInit(): void {
    this.cargarDatosIniciales();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  // ── Carga inicial: cursos + tipos en paralelo ─────────────────────────────
  private cargarDatosIniciales(): void {
    this.cargandoInicial = true;
    this.errorMsg = '';

    const sub = forkJoin({
      cursos: this.service.getCursos(),
      tipos:  this.service.getTiposAsistencia(),
    }).subscribe({
      next: ({ cursos, tipos }) => {
        this.cursos          = cursos;
        this.tipos           = tipos;
        this.cargandoInicial = false;
      },
      error: (err) => {
        console.error(err);
        this.errorMsg        = 'Error al cargar datos iniciales (mirá consola).';
        this.cargandoInicial = false;
      }
    });

    this.subs.push(sub);
  }

  // ── Cambio de curso ───────────────────────────────────────────────────────
  onCursoChange(curso: CursoManual): void {
    this.cursoSeleccionado = curso;
    this.filas    = [];
    this.errorMsg = '';
    this.cargandoTabla = true;

    const sub = forkJoin({
      estudiantes: this.service.getEstudiantesByCurso(curso.idCurso),
      asistencias: this.service.getAsistenciasDelDia(this.fechaHoy),
    }).subscribe({
      next: ({ estudiantes, asistencias }) => {
        // Indexar asistencias del día por documento
        const mapaHoy = new Map<string, { codigoManana: string; codigoTarde: string }>();
        asistencias.forEach(a => mapaHoy.set(a.documento, a));

        this.filas = estudiantes.map(est => {
          const existente    = mapaHoy.get(est.documento);
          const tipoManianaId = existente
            ? (this.tipos.find(t => t.codigo === existente.codigoManana)?.id ?? null)
            : null;
          const tipoTardeId  = existente
            ? (this.tipos.find(t => t.codigo === existente.codigoTarde)?.id ?? null)
            : null;

          return {
            estudiante:    est,
            tipoManianaId,
            tipoTardeId,
            horaManana:    null,
            horaTarde:     null,
            guardado:      !!existente,
            error:         null,
          };
        });

        this.cargandoTabla = false;
      },
      error: (err) => {
        console.error(err);
        this.errorMsg      = 'Error al cargar estudiantes (mirá consola).';
        this.cargandoTabla = false;
      }
    });

    this.subs.push(sub);
  }

  // ── Helpers de UI ─────────────────────────────────────────────────────────

  requiereHora(tipoId: string | null): boolean {
    if (!tipoId || !this.modoDesarrollo) return false;
    const tipo = this.tipos.find(t => t.id === tipoId);
    return tipo ? CODIGOS_CON_HORA.has(tipo.codigo.toUpperCase()) : false;
  }

  onTipoManianaChange(fila: FilaAsistenciaManual): void {
    if (!this.requiereHora(fila.tipoManianaId)) fila.horaManana = null;
    fila.guardado = false;
    fila.error    = null;
  }

  onTipoTardeChange(fila: FilaAsistenciaManual): void {
    if (!this.requiereHora(fila.tipoTardeId)) fila.horaTarde = null;
    fila.guardado = false;
    fila.error    = null;
  }

  marcarTodosPresentes(): void {
    const idPresente = this.tipos.find(t => t.codigo === 'P')?.id ?? null;
    if (!idPresente) return;
    this.filas.forEach(f => {
      if (!f.tipoManianaId) f.tipoManianaId = idPresente;
      if (!f.tipoTardeId)   f.tipoTardeId   = idPresente;
    });
  }

  limpiarTabla(): void {
    this.filas.forEach(f => {
      f.tipoManianaId = null;
      f.tipoTardeId   = null;
      f.horaManana    = null;
      f.horaTarde     = null;
      f.guardado      = false;
      f.error         = null;
    });
  }

  getCodigoPorId(tipoId: string | null): string {
    return this.tipos.find(t => t.id === tipoId)?.codigo ?? '';
  }

  // ── Contadores resumen ────────────────────────────────────────────────────
  get cantPresentes(): number {
    const id = this.tipos.find(t => t.codigo === 'P')?.id;
    return this.filas.filter(f => f.tipoManianaId === id || f.tipoTardeId === id).length;
  }
  get cantAusentes(): number {
    const id = this.tipos.find(t => t.codigo === 'A')?.id;
    return this.filas.filter(f => f.tipoManianaId === id && f.tipoTardeId === id).length;
  }
  get cantSinDefinir(): number {
    return this.filas.filter(f => !f.tipoManianaId && !f.tipoTardeId).length;
  }

  // ── Construcción de DTOs ──────────────────────────────────────────────────
  private buildDtos(fila: FilaAsistenciaManual): RegistrarAsistenciaManual[] {
    const dtos: RegistrarAsistenciaManual[] = [];

    if (fila.tipoManianaId) {
      dtos.push({
        estudianteId:     fila.estudiante.idEstudiante,
        fecha:            this.fechaHoy,
        turno:            'MANANA',
        tipoAsistenciaId: fila.tipoManianaId,
        hora: this.modoDesarrollo && fila.horaManana ? `${fila.horaManana}:00` : null,
      });
    }

    if (fila.tipoTardeId) {
      dtos.push({
        estudianteId:     fila.estudiante.idEstudiante,
        fecha:            this.fechaHoy,
        turno:            'TARDE',
        tipoAsistenciaId: fila.tipoTardeId,
        hora: this.modoDesarrollo && fila.horaTarde ? `${fila.horaTarde}:00` : null,
      });
    }

    return dtos;
  }

  // ── Guardar fila individual ───────────────────────────────────────────────
  guardarFila(fila: FilaAsistenciaManual): void {
    const dtos = this.buildDtos(fila);
    if (!dtos.length) {
      this.snack.open('Definí al menos un turno antes de guardar.', 'OK', { duration: 2500 });
      return;
    }

    fila.error   = null;
    fila.guardado = false;

    const sub = this.service.registrarLote(dtos).subscribe({
      next:  () => { fila.guardado = true; },
      error: (err) => {
        console.error(err);
        fila.error = 'Error al guardar';
      }
    });

    this.subs.push(sub);
  }

  // ── Guardar todo ──────────────────────────────────────────────────────────
  guardarTodo(): void {
    const todos = this.filas.flatMap(f => this.buildDtos(f));

    if (!todos.length) {
      this.snack.open('No hay asistencias definidas para guardar.', 'OK', { duration: 2500 });
      return;
    }

    this.guardandoLote = true;
    this.errorMsg      = '';

    const sub = this.service.registrarLote(todos).subscribe({
      next: (res) => {
        this.filas.forEach(f => { if (f.tipoManianaId || f.tipoTardeId) f.guardado = true; });
        this.guardandoLote = false;
        this.snack.open(res.mensaje ?? 'Asistencias guardadas correctamente.', '✓', { duration: 3500 });
      },
      error: (err) => {
        console.error(err);
        this.guardandoLote = false;
        this.errorMsg      = 'Error al guardar el lote (mirá consola).';
      }
    });

    this.subs.push(sub);
  }

  // ── Utils ─────────────────────────────────────────────────────────────────
  private buildFechaHoy(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}