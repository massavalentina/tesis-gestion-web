import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, of } from 'rxjs';

import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ReporteAsistenciaDocenteService } from '../../services/reporte-asistencia-docente.service';
import { DetalleDocenteRegistro } from '../../models/detalle-docente.model';
import { PdfReporteService } from '../../../../core/services/pdf-reporte.service';

@Component({
  selector: 'app-detalle-asistencia-docente',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  templateUrl: './detalle-asistencia-docente.component.html',
  styleUrl: './detalle-asistencia-docente.component.css',
})
export class DetalleAsistenciaDocenteComponent implements OnInit {
  estudianteId = '';
  idEC = '';
  nombre = '';
  apellido = '';
  documento = '';
  presencias: number | null = null;
  inasistencias: number | null = null;
  llegadasTarde: number | null = null;
  retirosAnticipados: number | null = null;
  porcentajeAsistencia: number | null = null;
  teaGeneral = false;
  desde: string | null = null;
  hasta: string | null = null;
  nombreEspacio = '';
  cursoCodigo = '';

  private reporteStateCursoId: string | null = null;
  private reporteStateEspacioId: string | null = null;
  private reporteStateFechaDesde: string | null = null;
  private reporteStateFechaHasta: string | null = null;

  registros: DetalleDocenteRegistro[] = [];
  cargando = true;
  error = false;

  // Columna 'horaEntrada' eliminada por requerimiento
  columnas = ['fecha', 'dictada', 'presente', 'codigo'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private docenteService: ReporteAsistenciaDocenteService,
    private pdfService: PdfReporteService
  ) {}

  ngOnInit(): void {
    this.estudianteId = this.route.snapshot.paramMap.get('estudianteId') ?? '';
    this.idEC = this.route.snapshot.paramMap.get('idEC') ?? '';

    const q = this.route.snapshot.queryParamMap;
    this.nombre = q.get('nombre') ?? '';
    this.apellido = q.get('apellido') ?? '';
    this.documento = q.get('documento') ?? '';
    this.presencias = q.has('presencias') ? Number(q.get('presencias')) : null;
    this.inasistencias = q.has('inasistencias') ? Number(q.get('inasistencias')) : null;
    this.llegadasTarde = q.has('llegadasTarde') ? Number(q.get('llegadasTarde')) : null;
    this.retirosAnticipados = q.has('retirosAnticipados') ? Number(q.get('retirosAnticipados')) : null;
    this.porcentajeAsistencia = q.has('porcentajeAsistencia') ? Number(q.get('porcentajeAsistencia')) : null;
    this.teaGeneral = q.get('teaGeneral') === 'true';
    this.desde = q.get('desde');
    this.hasta = q.get('hasta');
    this.nombreEspacio = q.get('nombreEspacio') ?? '';
    this.cursoCodigo = q.get('cursoCodigo') ?? '';

    this.reporteStateCursoId = q.get('reporteState_cursoId');
    this.reporteStateEspacioId = q.get('reporteState_espacioId');
    this.reporteStateFechaDesde = q.get('reporteState_fechaDesde');
    this.reporteStateFechaHasta = q.get('reporteState_fechaHasta');

    this.docenteService.getDetalleEstudiante(
      this.idEC,
      this.estudianteId,
      this.desde ?? undefined,
      this.hasta ?? undefined
    ).pipe(
      catchError(() => {
        this.error = true;
        this.cargando = false;
        return of([]);
      })
    ).subscribe((registros) => {
      this.registros = registros;
      this.cargando = false;
    });
  }

  get registrosFiltrados(): DetalleDocenteRegistro[] {
    return this.registros.filter(r => r.dictada);
  }

  volver(): void {
    const queryParams: Record<string, string> = {};
    if (this.reporteStateCursoId) queryParams['reporteState_cursoId'] = this.reporteStateCursoId;
    if (this.reporteStateEspacioId) queryParams['reporteState_espacioId'] = this.reporteStateEspacioId;
    if (this.reporteStateFechaDesde) queryParams['reporteState_fechaDesde'] = this.reporteStateFechaDesde;
    if (this.reporteStateFechaHasta) queryParams['reporteState_fechaHasta'] = this.reporteStateFechaHasta;
    this.router.navigate(['/reporte-asistencia-docente'], { queryParams });
  }

  exportarPdf(): void {
    this.pdfService.exportarDetalleDocente({
      nombre: this.nombre,
      apellido: this.apellido,
      documento: this.documento,
      teaGeneral: this.teaGeneral,
      presencias: this.presencias ?? 0,
      inasistencias: this.inasistencias ?? 0,
      llegadasTarde: this.llegadasTarde ?? 0,
      retirosAnticipados: this.retirosAnticipados ?? 0,
      porcentajeAsistencia: this.porcentajeAsistencia ?? 0,
      nombreEspacio: this.nombreEspacio,
      cursoCodigo: this.cursoCodigo,
      fechaDesde: this.desde,
      fechaHasta: this.hasta,
      registros: this.registros,
    });
  }

  getPresenteClase(registro: DetalleDocenteRegistro): string {
    if (!registro.dictada) return 'codigo-default';
    if (registro.presente === null) return 'codigo-default';
    return registro.presente ? 'codigo-presente' : 'codigo-ausente';
  }

  getPresenteTexto(registro: DetalleDocenteRegistro): string {
    if (!registro.dictada) return 'No dictada';
    if (registro.presente === null) return '-';
    return registro.presente ? 'Presente' : 'Ausente';
  }

  getCodigoBadge(codigo: string | null): string {
    switch ((codigo ?? '').toUpperCase()) {
      case 'P': return 'codigo-presente';
      case 'A': return 'codigo-ausente';
      case 'LLT':
      case 'LLTE': return 'codigo-tarde';
      case 'LLTC': return 'codigo-lltc';
      case 'RA':
      case 'RAE': return 'codigo-retiro';
      default: return 'codigo-default';
    }
  }

  getBadgeClase(porcentaje: number | null, teaGeneral: boolean): string {
    if (teaGeneral) return 'badge-tea';
    const p = porcentaje ?? 0;
    if (p >= 85) return 'badge-verde';
    if (p >= 80) return 'badge-amarillo';
    if (p >= 75) return 'badge-naranja';
    return 'badge-rojo';
  }

  formatFecha(fecha: string): string {
    if (!fecha) return '-';
    const [y, m, d] = fecha.split('-');
    return `${d}/${m}/${y}`;
  }
}
