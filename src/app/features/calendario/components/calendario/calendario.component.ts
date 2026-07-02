import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  AuditoriaEvento,
  TipoEvento,
  CursoSeleccion,
  DiaCalendario,
  COLORES_TIPO_EVENTO,
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
  tiposEvento: TipoEvento[] = [];
  cursos: CursoSeleccion[] = [];
  auditoriaGeneral: AuditoriaEvento[] = [];

  // Filtros
  anioLectivo = new Date().getFullYear();
  cursosSeleccionados: string[] = [];

  // Calendario
  mesActual = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  diaPopoverKey: string | null = null;

  // Permisos
  puedeGestionarEventos = false;

  // Historial
  historialAbierto = false;
  cargandoHistorial = false;

  readonly diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  readonly colores = COLORES_TIPO_EVENTO;

  private readonly nombresMes = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  constructor(
    private calendarioService: CalendarioService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private elementRef: ElementRef<HTMLElement>,
  ) {}

  ngOnInit(): void {
    const usuario = this.authService.obtenerUsuario();
    const esAdmin = !!usuario?.esAdmin;
    this.puedeGestionarEventos = esAdmin
      || this.authService.tieneRol('Equipo Directivo')
      || this.authService.tieneRol('Secretario');

    this.cargarDatos();
  }

  cargarDatos(): void {
    this.loading = true;
    this.error = '';

    forkJoin({
      eventos: this.calendarioService.obtenerEventos(this.anioLectivo),
      tipos: this.calendarioService.obtenerTiposEvento(),
      cursos: this.calendarioService.obtenerCursos(this.anioLectivo),
    }).subscribe({
      next: ({ eventos, tipos, cursos }) => {
        this.eventos = eventos;
        this.tiposEvento = tipos;
        this.cursos = cursos;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar los datos del calendario.';
        this.loading = false;
      },
    });
  }

  onAnioChange(): void {
    this.cursosSeleccionados = [];
    this.auditoriaGeneral = [];
    this.historialAbierto = false;
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

    for (let i = offsetInicio; i > 0; i--) {
      const d = new Date(year, month, 1 - i);
      const key = this.toKey(d);
      dias.push({ fecha: d, enMes: false, key, eventos: this.eventosParaFecha(key, eventosFiltrados) });
    }
    for (let day = 1; day <= ultimoDia.getDate(); day++) {
      const d = new Date(year, month, day);
      const key = this.toKey(d);
      dias.push({ fecha: d, enMes: true, key, eventos: this.eventosParaFecha(key, eventosFiltrados) });
    }
    while (dias.length % 7 !== 0) {
      const ultima = dias[dias.length - 1].fecha;
      const d = new Date(ultima.getFullYear(), ultima.getMonth(), ultima.getDate() + 1);
      const key = this.toKey(d);
      dias.push({ fecha: d, enMes: false, key, eventos: this.eventosParaFecha(key, eventosFiltrados) });
    }
    return dias;
  }

  get eventosFiltrados(): EventoInstitucional[] {
    if (this.cursosSeleccionados.length === 0) return this.eventos;
    return this.eventos.filter(e => {
      if (e.cursos.length === 0) return true;
      return e.cursos.some(c => this.cursosSeleccionados.includes(c.idCurso));
    });
  }

  private eventosParaFecha(key: string, eventos: EventoInstitucional[]): EventoInstitucional[] {
    return eventos.filter(e => key >= e.fechaInicio && key <= e.fechaFin);
  }

  get nombreMes(): string { return this.nombresMes[this.mesActual.getMonth()]; }
  get anioMes(): number { return this.mesActual.getFullYear(); }

  mesAnterior(): void {
    this.mesActual = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() - 1, 1);
    this.diaPopoverKey = null;
  }

  mesSiguiente(): void {
    this.mesActual = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() + 1, 1);
    this.diaPopoverKey = null;
  }

  irAHoy(): void {
    const hoy = new Date();
    this.mesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    this.diaPopoverKey = null;
  }

  esHoy(fecha: Date): boolean {
    const hoy = new Date();
    return fecha.getFullYear() === hoy.getFullYear()
      && fecha.getMonth() === hoy.getMonth()
      && fecha.getDate() === hoy.getDate();
  }

  toggleDia(dia: DiaCalendario): void {
    if (dia.eventos.length === 0) return;
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
        this.cargandoHistorial = false;
      },
      error: () => {
        this.cargandoHistorial = false;
      },
    });
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
