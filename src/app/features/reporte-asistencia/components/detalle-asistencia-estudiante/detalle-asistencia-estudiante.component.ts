import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, of } from 'rxjs';

import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ReporteAsistenciaService } from '../../services/reporte-asistencia.service';
import { DetalleAsistencia } from '../../models/detalle-asistencia.model';
import { PdfReporteService } from '../../../../core/services/pdf-reporte.service';

@Component({
  selector: 'app-detalle-asistencia-estudiante',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatTooltipModule,
  ],
  templateUrl: './detalle-asistencia-estudiante.component.html',
  styleUrl: './detalle-asistencia-estudiante.component.css',
})
export class DetalleAsistenciaEstudianteComponent implements OnInit {
  estudianteId = '';
  nombre = '';
  apellido = '';
  documento = '';
  presencias: number | null = null;
  inasistencias: number | null = null;
  llegadasTarde: number | null = null;
  ausentePorLLT: number | null = null;
  retirosAnticipados: number | null = null;
  /** Retiros Express (código RE) */
  retirosExpress: number | null = null;
  /** Retiros Anticipados Extendidos (código RAE) */
  retirosAnticipadosExtendidos: number | null = null;
  /** Inasistencias acumuladas por retiros anticipados (RA/RAE) */
  ausentePorRA: number | null = null;
  /** Ausencias puras (código A al establecimiento) */
  ausenciasPuras: number | null = null;
  /** Ausencias No Computables (código ANC) */
  ancCount: number | null = null;
  /** Llegadas tarde extendidas (LLTE) */
  llegadasTardeExtendidas: number | null = null;
  /** Llegadas tarde completas (LLTC) */
  llegadasTardeCompletas: number | null = null;
  porcentajeAsistencia: number | null = null;
  teaGeneral = false;
  desde: string | null = null;
  hasta: string | null = null;
  origen: 'reporte' | 'ficha' = 'reporte';

  // Parámetros para restaurar el estado al volver
  private fichaStateCursoId: string | null = null;
  private fichaStateEstudianteId: string | null = null;
  private reporteStateCursoId: string | null = null;
  private reporteStateFechaDesde: string | null = null;
  private reporteStateFechaHasta: string | null = null;

  registros: DetalleAsistencia[] = [];
  cargando = true;
  error = false;

  columnas = ['fecha', 'manana', 'tarde', 'valor'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private reporteService: ReporteAsistenciaService,
    private pdfService: PdfReporteService
  ) {}

  ngOnInit(): void {
    this.estudianteId = this.route.snapshot.paramMap.get('estudianteId') ?? '';
    const q = this.route.snapshot.queryParamMap;

    this.nombre = q.get('nombre') ?? '';
    this.apellido = q.get('apellido') ?? '';
    this.documento = q.get('documento') ?? '';
    this.presencias = q.has('presencias') ? Number(q.get('presencias')) : null;
    this.inasistencias = q.has('inasistencias') ? Number(q.get('inasistencias')) : null;
    this.llegadasTarde = q.has('llegadasTarde') ? Number(q.get('llegadasTarde')) : null;
    this.ausentePorLLT = q.has('ausentePorLLT') ? Number(q.get('ausentePorLLT')) : null;
    this.retirosAnticipados = q.has('retirosAnticipados') ? Number(q.get('retirosAnticipados')) : null;
    this.retirosExpress = q.has('retirosExpress') ? Number(q.get('retirosExpress')) : null;
    this.retirosAnticipadosExtendidos = q.has('retirosAnticipadosExtendidos') ? Number(q.get('retirosAnticipadosExtendidos')) : null;
    this.ausentePorRA = q.has('ausentePorRA') ? Number(q.get('ausentePorRA')) : null;
    this.ausenciasPuras = q.has('ausenciasPuras') ? Number(q.get('ausenciasPuras')) : null;
    this.ancCount = q.has('ancCount') ? Number(q.get('ancCount')) : null;
    this.porcentajeAsistencia = q.has('porcentajeAsistencia') ? Number(q.get('porcentajeAsistencia')) : null;
    this.teaGeneral = q.get('teaGeneral') === 'true';
    this.desde = q.get('desde');
    this.hasta = q.get('hasta');
    this.origen = q.get('origen') === 'ficha' ? 'ficha' : 'reporte';

    this.fichaStateCursoId = q.get('fichaState_cursoId');
    this.fichaStateEstudianteId = q.get('fichaState_estudianteId');
    this.reporteStateCursoId = q.get('reporteState_cursoId');
    this.reporteStateFechaDesde = q.get('reporteState_fechaDesde');
    this.reporteStateFechaHasta = q.get('reporteState_fechaHasta');

    this.reporteService
      .getDetalleEstudiante(
        this.estudianteId,
        this.desde ?? undefined,
        this.hasta ?? undefined
      )
      .pipe(
        catchError(() => {
          this.error = true;
          this.cargando = false;
          return of([]);
        })
      )
      .subscribe((registros) => {
        this.registros = registros;
        this.cargando = false;
        if (this.presencias === null) {
          this.computeResumenFromRegistros();
        } else {
          this.computeLLTBreakdownFromRegistros();
        }
      });
  }

  // Solo muestra inasistencias y movimientos relevantes, oculta presencias puras
  get registrosFiltrados(): DetalleAsistencia[] {
    return this.registros.filter(r => {
      const man = (r.codigoManana ?? '').toUpperCase();
      const tar = (r.codigoTarde ?? '').toUpperCase();
      const tieneRetiro = !!(r.codigoRetiroManana || r.codigoRetiroTarde);
      const esPuroPresente = !tieneRetiro && (man === 'P' || man === '-') && (tar === 'P' || tar === '-') && r.valorTotal === 0;
      return !esPuroPresente;
    });
  }

  volver(): void {
    if (this.origen === 'ficha') {
      const queryParams: Record<string, string> = {};
      if (this.fichaStateCursoId) queryParams['cursoId'] = this.fichaStateCursoId;
      if (this.fichaStateEstudianteId) queryParams['estudianteId'] = this.fichaStateEstudianteId;
      this.router.navigate(['/ficha-alumno'], { queryParams });
    } else {
      const queryParams: Record<string, string> = {};
      if (this.reporteStateCursoId) queryParams['reporteState_cursoId'] = this.reporteStateCursoId;
      if (this.reporteStateFechaDesde) queryParams['reporteState_fechaDesde'] = this.reporteStateFechaDesde;
      if (this.reporteStateFechaHasta) queryParams['reporteState_fechaHasta'] = this.reporteStateFechaHasta;
      this.router.navigate(['/reporte-asistencia'], { queryParams });
    }
  }

  exportarPdf(): void {
    this.pdfService.exportarDetalleEstudiante({
      nombre: this.nombre,
      apellido: this.apellido,
      documento: this.documento,
      teaGeneral: this.teaGeneral,
      presencias: this.presencias ?? 0,
      inasistencias: this.inasistencias ?? 0,
      ausenciasPuras: this.ausenciasPuras ?? 0,
      ancCount: this.ancCount ?? 0,
      llegadasTarde: this.llegadasTarde ?? 0,
      llegadasTardeExtendidas: this.llegadasTardeExtendidas ?? 0,
      llegadasTardeCompletas: this.llegadasTardeCompletas ?? 0,
      ausentePorLLT: this.ausentePorLLT ?? 0,
      retirosAnticipados: this.retirosAnticipados ?? 0,
      retirosExpress: this.retirosExpress ?? 0,
      retirosAnticipadosExtendidos: this.retirosAnticipadosExtendidos ?? 0,
      ausentePorRA: this.ausentePorRA ?? 0,
      porcentajeAsistencia: this.porcentajeAsistencia ?? 0,
      fechaDesde: this.desde,
      fechaHasta: this.hasta,
      registros: this.registros,
    });
  }

  getBadgeClase(inasistencias: number | null, teaGeneral: boolean): string {
    if (teaGeneral) return 'badge-tea';
    const v = inasistencias ?? 0;
    if (v >= 21) return 'badge-rojo';
    if (v >= 15) return 'badge-naranja';
    if (v >= 10) return 'badge-amarillo';
    return 'badge-verde';
  }

  getCodigoBadge(codigo: string): string {
    switch ((codigo ?? '').toUpperCase()) {
      case 'P': return 'codigo-presente';
      case 'A': return 'codigo-ausente';
      case 'ANC': return 'codigo-anc';
      case 'LLT':
      case 'LLTE': return 'codigo-tarde';
      case 'LLTC': return 'codigo-lltc';
      case 'RA':
      case 'RAE':
      case 'RE': return 'codigo-retiro';
      default: return 'codigo-default';
    }
  }

  formatFecha(fecha: string): string {
    if (!fecha) return '-';
    const [y, m, d] = fecha.split('-');
    return `${d}/${m}/${y}`;
  }

  private computeLLTBreakdownFromRegistros(): void {
    const r = this.registros;
    this.llegadasTarde          = r.filter(x => (x.codigoManana ?? '').toUpperCase() === 'LLT').length;
    this.llegadasTardeExtendidas = r.filter(x => (x.codigoManana ?? '').toUpperCase() === 'LLTE').length;
    this.llegadasTardeCompletas  = r.filter(x => (x.codigoManana ?? '').toUpperCase() === 'LLTC').length;
  }

  private computeResumenFromRegistros(): void {
    const r = this.registros;
    this.presencias = r.filter(x => (x.codigoManana ?? '').toUpperCase() === 'P').length;
    const nLLT  = r.filter(x => (x.codigoManana ?? '').toUpperCase() === 'LLT').length;
    const nLLTE = r.filter(x => (x.codigoManana ?? '').toUpperCase() === 'LLTE').length;
    const nLLTC = r.filter(x => (x.codigoManana ?? '').toUpperCase() === 'LLTC').length;
    this.llegadasTarde           = nLLT;
    this.llegadasTardeExtendidas = nLLTE;
    this.llegadasTardeCompletas  = nLLTC;
    // LLT = 0.25 falta, LLTE = 0.50 falta → cada 1.0 acumulada = 1 inasistencia completa
    this.ausentePorLLT = Math.floor(nLLT * 0.25 + nLLTE * 0.5);

    // Contadores de retiros — incluye tanto el código principal como el código de retiro adicional
    this.retirosAnticipados = r.filter(x => {
      const codes = [
        (x.codigoManana ?? '').toUpperCase(),
        (x.codigoRetiroManana ?? '').toUpperCase(),
        (x.codigoTarde ?? '').toUpperCase(),
        (x.codigoRetiroTarde ?? '').toUpperCase(),
      ];
      return codes.includes('RA');
    }).length;

    this.retirosExpress = r.filter(x => {
      const codes = [
        (x.codigoManana ?? '').toUpperCase(),
        (x.codigoRetiroManana ?? '').toUpperCase(),
        (x.codigoTarde ?? '').toUpperCase(),
        (x.codigoRetiroTarde ?? '').toUpperCase(),
      ];
      return codes.includes('RE');
    }).length;

    this.retirosAnticipadosExtendidos = r.filter(x => {
      const codes = [
        (x.codigoManana ?? '').toUpperCase(),
        (x.codigoRetiroManana ?? '').toUpperCase(),
        (x.codigoTarde ?? '').toUpperCase(),
        (x.codigoRetiroTarde ?? '').toUpperCase(),
      ];
      return codes.includes('RAE');
    }).length;

    // ANC (Ausencia No Computable)
    this.ancCount = r.filter(x =>
      (x.codigoManana ?? '').toUpperCase() === 'ANC' ||
      (x.codigoTarde ?? '').toUpperCase() === 'ANC'
    ).length;

    // Ausente por Retiro Anticipado: suma de inasistencias generadas por RA/RAE
    // RA (cualquier turno) = 0.5 | RAE mañana = 1.0 | RAE tarde = 0.5
    this.ausentePorRA = r.reduce((acc, x) => {
      const codigosManana = [
        (x.codigoManana ?? '').toUpperCase(),
        (x.codigoRetiroManana ?? '').toUpperCase(),
      ];
      const codigosTarde = [
        (x.codigoTarde ?? '').toUpperCase(),
        (x.codigoRetiroTarde ?? '').toUpperCase(),
      ];
      for (const c of codigosManana) {
        if (c === 'RA')  acc += 0.5;
        if (c === 'RAE') acc += 1.0;
      }
      for (const c of codigosTarde) {
        if (c === 'RA')  acc += 0.5;
        if (c === 'RAE') acc += 0.5;
      }
      return acc;
    }, 0);

    this.ausenciasPuras = r.reduce((acc, x) => {
      if ((x.codigoManana ?? '').toUpperCase() === 'A') acc += 1.0;
      if ((x.codigoTarde  ?? '').toUpperCase() === 'A') acc += 0.5;
      return acc;
    }, 0);

    this.inasistencias = Math.round(r.reduce((acc, x) => acc + x.valorTotal, 0));
    this.porcentajeAsistencia = r.length > 0
      ? Math.round(this.presencias / r.length * 100)
      : 0;
  }
}
