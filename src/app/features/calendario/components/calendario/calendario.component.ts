import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';

import { AuthService } from '../../../auth/services/auth.service';
import { CalendarioService } from '../../services/calendario.service';
import {
  EventoInstitucional,
  EventoDocente,
  AuditoriaEvento,
  TipoEvento,
  CursoSeleccion,
  EcSeleccion,
  DiaCalendario,
  COLORES_TIPO_EVENTO,
  LABEL_TIPO_EVENTO,
} from '../../models/calendario.model';
import { EventoDialogComponent } from '../evento-dialog/evento-dialog.component';

@Component({
  selector: 'app-calendario',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
  ],
  templateUrl: './calendario.component.html',
  styleUrl: './calendario.component.scss',
})
export class CalendarioComponent implements OnInit {
  // State
  loading = true;
  error = '';
  eventos: EventoInstitucional[] = [];
  eventosDocente: EventoDocente[] = [];
  tiposEvento: TipoEvento[] = [];
  cursos: CursoSeleccion[] = [];
  auditoriaGeneral: AuditoriaEvento[] = [];

  // Filtros
  anioLectivo = new Date().getFullYear();
  cursosSeleccionados: string[] = [];
  ecSeleccionado = '';
  ecsDisponibles: EcSeleccion[] = [];
  tiposEventoSeleccionados: number[] = [];

  // Popover evento docente
  eventoDocenteDetalle: EventoDocente | null = null;

  // Popover evento institucional (para roles sin edición)
  eventoInstitucionalDetalle: EventoInstitucional | null = null;

  // Calendario
  mesActual = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  diaPopoverKey: string | null = null;

  // Permisos
  puedeGestionarEventos = false;
  esDocente = false;
  esPreceptor = false;

  // Toggle IEs del curso
  mostrarIECurso = false;

  // Historial
  historialAbierto = false;
  cargandoHistorial = false;

  readonly diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  readonly colores = COLORES_TIPO_EVENTO;

  private readonly nombresMes = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  private cursoIdInicial: string | null = null;

  constructor(
    private calendarioService: CalendarioService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private elementRef: ElementRef<HTMLElement>,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const usuario = this.authService.obtenerUsuario();
    const esAdmin = !!usuario?.esAdmin;
    this.puedeGestionarEventos = esAdmin
      || this.authService.tieneRol('Equipo Directivo')
      || this.authService.tieneRol('Secretario');
    this.esDocente = this.authService.tieneRol('Docente');
    this.esPreceptor = this.authService.tieneRol('Preceptor');

    // Pre-seleccionar curso si viene por query param (ej: desde mis-espacios-curriculares)
    this.cursoIdInicial = this.route.snapshot.queryParamMap.get('cursoId');

    this.cargarDatos();
  }

  cargarDatos(): void {
    this.loading = true;
    this.error = '';

    forkJoin({
      eventos: this.calendarioService.obtenerEventos(this.anioLectivo),
      tipos: this.calendarioService.obtenerTiposEvento(),
      cursos: this.calendarioService.obtenerCursos(this.anioLectivo),
      eventosDocente: this.calendarioService.obtenerEventosDocente(this.anioLectivo),
      ecsDocente: this.calendarioService.obtenerEcsDocente(this.anioLectivo),
    }).subscribe({
      next: ({ eventos, tipos, cursos, eventosDocente, ecsDocente }) => {
        this.eventos = eventos;
        this.tiposEvento = tipos;
        this.cursos = cursos;
        this.eventosDocente = eventosDocente;
        this.ecsDisponibles = ecsDocente;

        // Aplicar filtro inicial por curso (query param)
        if (this.cursoIdInicial && cursos.some(c => c.id === this.cursoIdInicial)) {
          this.cursosSeleccionados = [this.cursoIdInicial];
          this.cursoIdInicial = null; // solo la primera vez
        }

        // Opciones del filtro por tipo
        const opciones = tipos.map(t => ({ id: t.id, label: t.label }));
        if (eventosDocente.length > 0) {
          opciones.push({ id: 7, label: this.labelTipo[7] });
          opciones.push({ id: 8, label: this.labelTipo[8] });
        }
        this.opcionesTipoEvento = opciones;

        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar los datos del calendario.';
        this.loading = false;
      },
    });
  }

  get mostrarBotonIE(): boolean {
    return (this.esDocente || this.esPreceptor) && this.cursosSeleccionados.length > 0;
  }

  onCursoChange(): void {
    if (this.cursosSeleccionados.length === 0) {
      this.mostrarIECurso = false;
    }
  }

  /** Opciones del filtro por tipo (tipos institucionales + docentes si aplica) */
  opcionesTipoEvento: { id: number; label: string }[] = [];

  onAnioChange(): void {
    this.cursosSeleccionados = [];
    this.ecSeleccionado = '';
    this.mostrarIECurso = false;
    this.tiposEventoSeleccionados = [];
    this.auditoriaGeneral = [];
    this.historialAbierto = false;
    // Navegar al mismo mes en el año seleccionado
    this.mesActual = new Date(this.anioLectivo, this.mesActual.getMonth(), 1);
    this.diaPopoverKey = null;
    this.cargarDatos();
  }

  // ─── Grilla del calendario ────────────────────────────────────────────────────

  get diasDelMes(): DiaCalendario[] {
    const year = this.mesActual.getFullYear();
    const month = this.mesActual.getMonth();
    const primerDia = new Date(year, month, 1);
    const ultimoDia = new Date(year, month + 1, 0);
    const offsetInicio = (primerDia.getDay() + 6) % 7;

    const dias: DiaCalendario[] = [];
    const eventosFiltrados = this.eventosFiltrados;
    const edFiltrados = this.eventosDocenteFiltrados;

    for (let i = offsetInicio; i > 0; i--) {
      const d = new Date(year, month, 1 - i);
      const key = this.toKey(d);
      dias.push({ fecha: d, enMes: false, key, eventos: this.eventosParaFecha(key, eventosFiltrados), eventosDocente: this.eventosDocenteParaFecha(key, edFiltrados) });
    }
    for (let day = 1; day <= ultimoDia.getDate(); day++) {
      const d = new Date(year, month, day);
      const key = this.toKey(d);
      dias.push({ fecha: d, enMes: true, key, eventos: this.eventosParaFecha(key, eventosFiltrados), eventosDocente: this.eventosDocenteParaFecha(key, edFiltrados) });
    }
    while (dias.length % 7 !== 0) {
      const ultima = dias[dias.length - 1].fecha;
      const d = new Date(ultima.getFullYear(), ultima.getMonth(), ultima.getDate() + 1);
      const key = this.toKey(d);
      dias.push({ fecha: d, enMes: false, key, eventos: this.eventosParaFecha(key, eventosFiltrados), eventosDocente: this.eventosDocenteParaFecha(key, edFiltrados) });
    }
    return dias;
  }

  get eventosFiltrados(): EventoInstitucional[] {
    let filtrados: EventoInstitucional[];
    if (this.cursosSeleccionados.length === 0) {
      filtrados = this.eventos.filter(e => e.cursos.length === 0);
    } else {
      filtrados = this.eventos.filter(e => {
        if (e.cursos.length === 0) return true;
        return e.cursos.some(c => this.cursosSeleccionados.includes(c.idCurso));
      });
    }

    if (this.tiposEventoSeleccionados.length > 0) {
      filtrados = filtrados.filter(e => this.tiposEventoSeleccionados.includes(e.tipoEvento));
    }
    return filtrados;
  }

  private eventosParaFecha(key: string, eventos: EventoInstitucional[]): EventoInstitucional[] {
    return eventos.filter(e => key >= e.fechaInicio && key <= e.fechaFin);
  }

  get nombreMes(): string { return this.nombresMes[this.mesActual.getMonth()]; }
  get anioMes(): number { return this.mesActual.getFullYear(); }

  mesAnterior(): void {
    this.mesActual = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() - 1, 1);
    this.diaPopoverKey = null;
    this.tiposEventoSeleccionados = [];
  }

  mesSiguiente(): void {
    this.mesActual = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() + 1, 1);
    this.diaPopoverKey = null;
    this.tiposEventoSeleccionados = [];
  }

  irAHoy(): void {
    const hoy = new Date();
    this.mesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    this.diaPopoverKey = null;
    this.tiposEventoSeleccionados = [];
  }

  esHoy(fecha: Date): boolean {
    const hoy = new Date();
    return fecha.getFullYear() === hoy.getFullYear()
      && fecha.getMonth() === hoy.getMonth()
      && fecha.getDate() === hoy.getDate();
  }

  toggleDia(dia: DiaCalendario): void {
    if (dia.eventos.length === 0 && dia.eventosDocente.length === 0) return;
    this.eventoDocenteDetalle = null;
    this.eventoInstitucionalDetalle = null;
    this.diaPopoverKey = this.diaPopoverKey === dia.key ? null : dia.key;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.diaPopoverKey) return;
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.diaPopoverKey = null;
    }
  }

  colorEvento(tipo: number): { bg: string; border: string; text: string } {
    return this.colores[tipo] ?? { bg: '#f5f5f5', border: '#9e9e9e', text: '#616161' };
  }

  tiposUnicos(eventos: EventoInstitucional[]): number[] {
    return [...new Set(eventos.map(e => e.tipoEvento))];
  }

  /** Eventos tipo chip (1-4) para mostrar como tag en la celda */
  eventosChip(eventos: EventoInstitucional[]): EventoInstitucional[] {
    return eventos.filter(e => e.tipoEvento <= 4);
  }

  /** Eventos tipo período (5-6) para mostrar solo dot */
  eventosDot(eventos: EventoInstitucional[]): EventoInstitucional[] {
    return eventos.filter(e => e.tipoEvento >= 5);
  }

  /** Etiqueta del chip: título + curso si aplica */
  chipLabel(ev: EventoInstitucional): string {
    if (ev.cursos.length > 0) {
      const cursosStr = ev.cursos.map(c => c.label).join(', ');
      return `${ev.titulo} (${cursosStr})`;
    }
    return ev.titulo;
  }

  // ─── Eventos docentes ────────────────────────────────────────────────────────

  get eventosDocenteFiltrados(): EventoDocente[] {
    let filtrados = this.eventosDocente;

    // Ocultar IEs ajenas (esPropioDocente = false) cuando el toggle está desactivado
    if (!this.mostrarIECurso) {
      filtrados = filtrados.filter(e => e.tipo !== 'InstanciaEvaluativa' || e.esPropioDocente);
    }

    if (this.cursosSeleccionados.length > 0) {
      filtrados = filtrados.filter(e => this.cursosSeleccionados.includes(e.idCurso));
    }
    if (this.ecSeleccionado) {
      filtrados = filtrados.filter(e => e.idEC === this.ecSeleccionado);
    }

    if (this.tiposEventoSeleccionados.length > 0) {
      filtrados = filtrados.filter(e => this.tiposEventoSeleccionados.includes(e.tipoEventoNumero));
    }
    return filtrados;
  }

  private eventosDocenteParaFecha(key: string, eventos: EventoDocente[]): EventoDocente[] {
    return eventos.filter(e => e.fecha === key);
  }

  abrirDetalleDocente(ed: EventoDocente, event: MouseEvent): void {
    event.stopPropagation();
    this.eventoDocenteDetalle = this.eventoDocenteDetalle?.id === ed.id ? null : ed;
  }

  cerrarDetalleDocente(): void {
    this.eventoDocenteDetalle = null;
  }

  // ─── Detalle institucional (roles sin edición) ────────────────────────────────

  iconoEvento(tipo: number): string {
    const iconos: Record<number, string> = {
      1: 'event', 2: 'star', 3: 'celebration', 4: 'event_busy', 5: 'school', 6: 'quiz',
    };
    return iconos[tipo] ?? 'event';
  }

  abrirDetalleInstitucional(ev: EventoInstitucional, event: MouseEvent): void {
    event.stopPropagation();
    this.eventoDocenteDetalle = null;
    this.eventoInstitucionalDetalle = this.eventoInstitucionalDetalle?.idEvento === ev.idEvento ? null : ev;
  }

  cerrarDetalleInstitucional(): void {
    this.eventoInstitucionalDetalle = null;
  }

  cursosLabel(ev: EventoInstitucional): string {
    return ev.cursos.map(c => c.label).join(', ');
  }

  navegarDesdeDocente(ed: EventoDocente): void {
    this.eventoDocenteDetalle = null;
    this.diaPopoverKey = null;
    if (ed.tipo === 'ClasePlanificada') {
      this.router.navigate(['/mis-espacios-curriculares', ed.idEC, 'planificacion']);
    } else {
      this.router.navigate(['/mis-espacios-curriculares', ed.idEC, 'evaluaciones']);
    }
  }

  iconoDocente(ed: EventoDocente): string {
    return ed.tipo === 'ClasePlanificada' ? 'menu_book' : 'assignment';
  }

  // ─── Helpers de fecha ──────────────────────────────────────────────────────────

  private toKey(fecha: Date): string {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  formatFecha(iso: string): string {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  // ─── Acciones CRUD ─────────────────────────────────────────────────────────────

  abrirCrearEvento(): void {
    const ref = this.dialog.open(EventoDialogComponent, {
      width: '600px',
      maxHeight: '90vh',
      data: {
        modo: 'crear' as const,
        tiposEvento: this.tiposEvento,
        cursos: this.cursos,
        anioLectivo: this.anioLectivo,
      },
    });

    ref.afterClosed().subscribe(result => {
      if (result === 'guardado') this.cargarDatos();
    });
  }

  abrirDetalleEvento(evento: EventoInstitucional): void {
    this.diaPopoverKey = null;
    const ref = this.dialog.open(EventoDialogComponent, {
      width: '600px',
      maxHeight: '90vh',
      data: {
        modo: 'detalle' as const,
        evento,
        tiposEvento: this.tiposEvento,
        cursos: this.cursos,
        anioLectivo: this.anioLectivo,
        puedeEditar: this.puedeGestionarEventos,
      },
    });

    ref.afterClosed().subscribe(result => {
      if (result === 'guardado' || result === 'eliminado') this.cargarDatos();
    });
  }

  // ─── Historial ─────────────────────────────────────────────────────────────────

  toggleHistorial(): void {
    this.historialAbierto = !this.historialAbierto;
    if (this.historialAbierto && this.auditoriaGeneral.length === 0) {
      this.cargarAuditoriaGeneral();
    }
  }

  private cargarAuditoriaGeneral(): void {
    this.cargandoHistorial = true;
    this.calendarioService.obtenerAuditoriaGeneral(this.anioLectivo).subscribe({
      next: data => {
        this.auditoriaGeneral = data;
        this.agruparAuditoriaPorDia();
        this.cargandoHistorial = false;
      },
      error: () => {
        this.cargandoHistorial = false;
      },
    });
  }

  formatTipoIE(tipo: string): string {
    const map: Record<string, string> = {
      EvaluacionEscrita: 'Evaluación Escrita',
      EvaluacionOral: 'Evaluación Oral',
      Entrega: 'Entrega',
      TPI: 'TPI',
    };
    return map[tipo] ?? tipo;
  }

  formatEstadoDocente(estado: string): string {
    if (estado === 'Dado') return 'Dictada';
    if (estado === 'PendienteDar') return 'Pendiente';
    return estado;
  }

  formatFechaHora(iso: string): string {
    const d = new Date(iso);
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const hora = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dia}/${mes} ${hora}:${min}`;
  }

  formatHora(iso: string): string {
    const d = new Date(iso);
    const hora = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${hora}:${min}`;
  }

  // ─── Agrupación de auditoría por día ─────────────────────────────────────────

  auditoriaPorDia: { fecha: string; label: string; items: AuditoriaEvento[]; abierto: boolean }[] = [];

  private agruparAuditoriaPorDia(): void {
    const mapa = new Map<string, AuditoriaEvento[]>();
    for (const a of this.auditoriaGeneral) {
      const d = new Date(a.fechaRegistro);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!mapa.has(key)) mapa.set(key, []);
      mapa.get(key)!.push(a);
    }
    this.auditoriaPorDia = Array.from(mapa.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, items]) => {
        const [y, m, d] = key.split('-');
        return { fecha: key, label: `${d}/${m}/${y}`, items, abierto: false };
      });
  }

  toggleDiaAuditoria(grupo: { abierto: boolean }): void {
    grupo.abierto = !grupo.abierto;
  }

  // ─── Parseo de auditoría ─────────────────────────────────────────────────────

  readonly labelTipo = LABEL_TIPO_EVENTO;

  parsearDetalle(a: AuditoriaEvento): string[] {
    if (a.tipoOperacion === 'Creación' && a.valoresNuevos) {
      return this.formatearCampos(JSON.parse(a.valoresNuevos));
    }
    if (a.tipoOperacion === 'Eliminación' && a.valoresAnteriores) {
      return this.formatearCampos(JSON.parse(a.valoresAnteriores));
    }
    if (a.tipoOperacion === 'Modificación' && a.valoresAnteriores && a.valoresNuevos) {
      return this.formatearDiferencias(JSON.parse(a.valoresAnteriores), JSON.parse(a.valoresNuevos));
    }
    return [];
  }

  private formatearCampos(obj: Record<string, unknown>): string[] {
    return Object.entries(obj).map(([k, v]) => `${this.labelCampo(k)}: ${this.formatearValor(k, v)}`);
  }

  private formatearDiferencias(antes: Record<string, unknown>, despues: Record<string, unknown>): string[] {
    const lineas: string[] = [];
    for (const key of Object.keys(despues)) {
      if (JSON.stringify(antes[key]) !== JSON.stringify(despues[key])) {
        lineas.push(`${this.labelCampo(key)}: ${this.formatearValor(key, antes[key])} → ${this.formatearValor(key, despues[key])}`);
      }
    }
    return lineas;
  }

  private labelCampo(key: string): string {
    const map: Record<string, string> = {
      Titulo: 'Título', Descripcion: 'Descripción', TipoEvento: 'Tipo',
      FechaInicio: 'Fecha inicio', FechaFin: 'Fecha fin',
      ContabilizaAsistencia: 'Contabiliza asistencia', CambioActividad: 'Cambio de actividad',
      ComentarioCambioActividad: 'Comentario cambio', CursoIds: 'Cursos',
    };
    return map[key] ?? key;
  }

  private formatearValor(key: string, val: unknown): string {
    if (val === null || val === undefined) return '—';
    if (key === 'TipoEvento') return this.labelTipo[val as number] ?? String(val);
    if (key === 'FechaInicio' || key === 'FechaFin') return this.formatFecha(val as string);
    if (key === 'ContabilizaAsistencia' || key === 'CambioActividad') return val ? 'Sí' : 'No';
    if (key === 'CursoIds') {
      const ids = val as string[];
      if (!ids || ids.length === 0) return 'Todos';
      return ids.map(id => this.cursos.find(c => c.id === id)?.label ?? id).join(', ');
    }
    return String(val);
  }
}
