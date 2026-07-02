import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';
import { EChartsOption } from 'echarts';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';

import { CalificacionesService } from '../../../mis-espacios-curriculares/services/calificaciones.service';
import { FichaAlumnoService, EspacioCurricularFicha } from '../../services/ficha-alumno.service';
import { FichaDetalle } from '../../models/ficha-detalle.model';
import {
  CalificacionVigente,
  GestionManualEstudiante,
  InstanciaEvaluativaResumen,
  TipoCalificacion,
} from '../../../mis-espacios-curriculares/models/calificaciones.model';
import {
  ReporteAlumno,
  ReporteCalificacionesGlobal,
  ReporteEstadoFinal,
  ReporteVariacionTemporalGlobal,
  buildCalificacionesReport,
  buildCalificacionesVariacionTemporalReport,
} from '../../../mis-espacios-curriculares/utils/calificaciones-reporte.utils';

echarts.use([
  LineChart,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  CanvasRenderer,
]);

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

@Component({
  selector: 'app-reporte-calificaciones-estudiante',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTooltipModule,
    MatTabsModule,
    NgxEchartsDirective,
  ],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './reporte-calificaciones-estudiante.component.html',
  styleUrl: './reporte-calificaciones-estudiante.component.scss',
})
export class ReporteCalificacionesEstudianteComponent implements OnInit {
  @Input() estudianteIdInput = '';
  @Input() cursoIdInput = '';
  @Input() embedded = false;

  estudianteId = '';
  cursoId = '';
  estudiante: FichaDetalle | null = null;
  espacios: EspacioCurricularFicha[] = [];
  espacioSeleccionadoId = '';

  cargandoFicha = true;
  cargandoEspacios = true;
  cargandoReporte = false;
  error = false;
  errorReporte = false;

  instancias: InstanciaEvaluativaResumen[] = [];
  estudiantesEC: GestionManualEstudiante[] = [];
  calificacionesVigentes: CalificacionVigente[] = [];

  reporte: ReporteCalificacionesGlobal | null = null;
  variacionTemporal: ReporteVariacionTemporalGlobal | null = null;

  tabActivo = 1;
  reporteChartOptions: EChartsOption = {};
  private chartInstance: unknown = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fichaService: FichaAlumnoService,
    private calificacionesService: CalificacionesService,
  ) {}

  ngOnInit(): void {
    const estudianteIdRoute = this.route.snapshot.paramMap.get('estudianteId') ?? '';
    const cursoIdRoute = this.route.snapshot.queryParamMap.get('cursoId') ?? '';
    this.estudianteId = this.estudianteIdInput || estudianteIdRoute;
    this.cursoId = this.cursoIdInput || cursoIdRoute;
    const idECQuery = this.route.snapshot.queryParamMap.get('idEC') ?? '';

    if (!this.estudianteId || !this.cursoId) {
      this.error = true;
      this.cargandoFicha = false;
      this.cargandoEspacios = false;
      return;
    }

    forkJoin({
      ficha: this.fichaService.getFichaEstudiante(this.estudianteId).pipe(
        catchError(() => {
          this.error = true;
          return of(null);
        }),
      ),
      espacios: this.fichaService.getEspaciosCurricularesPorCurso(this.cursoId).pipe(
        catchError(() => {
          this.error = true;
          return of([]);
        }),
      ),
    }).subscribe(({ ficha, espacios }) => {
      this.estudiante = ficha;
      this.espacios = espacios;
      this.cargandoFicha = false;
      this.cargandoEspacios = false;

      const candidato = idECQuery && espacios.some(e => e.idEC === idECQuery)
        ? idECQuery
        : espacios[0]?.idEC ?? '';
      if (candidato) {
        this.espacioSeleccionadoId = candidato;
        this.cargarReporte();
      } else {
        this.errorReporte = true;
      }
    });
  }

  volver(): void {
    if (this.embedded) {
      return;
    }
    this.router.navigate(['/ficha-alumno'], {
      queryParams: { cursoId: this.cursoId, estudianteId: this.estudianteId },
    });
  }

  onEspacioChange(): void {
    if (!this.espacioSeleccionadoId) {
      return;
    }
    this.cargarReporte();
  }

  onTabChange(tab: number): void {
    this.tabActivo = tab;
  }

  exportarPdf(): void {
    // Pendiente de segunda iteración: el layout ya queda listo para exportar
    // con el mismo patrón que el reporte de EC.
  }

  get espacioSeleccionado(): EspacioCurricularFicha | null {
    return this.espacios.find(e => e.idEC === this.espacioSeleccionadoId) ?? null;
  }

  get nombreCompleto(): string {
    if (!this.estudiante) return '';
    return `${this.estudiante.apellido}, ${this.estudiante.nombre}`;
  }

  get documento(): string {
    return this.estudiante?.documento ?? '';
  }

  get reportStudent(): ReporteAlumno | null {
    return this.reporte?.rowsByStudentId[this.estudianteId] ?? null;
  }

  get evaluacionesTab(): number[] {
    return this.tabActivo === 1 ? [1, 2, 3, 4] : [5, 6, 7, 8];
  }

  get estadoLabel(): string {
    const estado = this.reportStudent?.estadoFinal ?? 'desaprobado';
    switch (estado) {
      case 'aprobado':
        return 'Aprobado';
      case 'desaprobado_tema':
        return 'Desaprobado por Tema';
      default:
        return 'Desaprobado';
    }
  }

  get estadoClase(): string {
    const estado = this.reportStudent?.estadoFinal ?? 'desaprobado';
    return estado;
  }

  get resumenPills(): Array<{ label: string; value: string; tone: string }> {
    const summary = this.reporte?.summary;
    if (!summary) return [];
    return [
      { label: 'Promedio final', value: summary.promedioFinal === null ? '—' : summary.promedioFinal.toFixed(2), tone: 'blue' },
      { label: '% Recuperatorios', value: `${summary.porcentajeRecuperatoriosFinal.toFixed(1)}%`, tone: 'violet' },
      { label: '% Notas >= 7', value: `${summary.porcentajeAprobadosFinal.toFixed(1)}%`, tone: 'green' },
      { label: 'Estado', value: this.estadoLabel, tone: this.estadoClase },
    ];
  }

  formatGrade(value: number | null | undefined): string {
    return value === null || value === undefined ? '—' : value.toFixed(2);
  }

  formatPercentage(value: number | null | undefined): string {
    return value === null || value === undefined ? '—' : `${value.toFixed(1)}%`;
  }

  formatDate(date: string | null | undefined): string {
    if (!date) return '—';
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return '—';
    return `${String(parsed.getDate()).padStart(2, '0')}/${String(parsed.getMonth() + 1).padStart(2, '0')}/${parsed.getFullYear()}`;
  }

  formatMonth(date: string): string {
    const parsed = new Date(date);
    return `${MESES[parsed.getMonth()]}`;
  }

  getEvaluationRow(numero: number) {
    return this.reportStudent?.evaluaciones[numero] ?? null;
  }

  getPromedioEvaluacion(numero: number): string {
    const value = this.reporte?.summary.promedioPorEvaluacion[numero] ?? null;
    return this.formatGrade(value);
  }

  getRecuperatorioEvaluacion(numero: number): string {
    const value = this.reporte?.summary.porcentajeRecuperatoriosPorEvaluacion[numero] ?? 0;
    return `${value.toFixed(1)}%`;
  }

  getAprobadasEvaluacion(numero: number): string {
    const value = this.reporte?.summary.porcentajeAprobadasPorEvaluacion[numero] ?? 0;
    return `${value.toFixed(1)}%`;
  }

  onChartInit(instance: any): void {
    this.chartInstance = instance;
  }

  private cargarReporte(): void {
    const idEC = this.espacioSeleccionadoId;
    if (!idEC) {
      return;
    }

    this.cargandoReporte = true;
    this.errorReporte = false;

    forkJoin({
      instancias: this.calificacionesService.getInstancias(idEC),
      estudiantes: this.calificacionesService.getEstudiantes(idEC),
      calificaciones: this.calificacionesService.getCalificacionesVigentes(idEC),
    }).pipe(
      catchError(() => {
        this.errorReporte = true;
        this.cargandoReporte = false;
        return of(null);
      }),
    ).subscribe(result => {
      if (!result) {
        return;
      }

      this.instancias = result.instancias;
      this.estudiantesEC = result.estudiantes;
      this.calificacionesVigentes = result.calificaciones;
      this.reporte = buildCalificacionesReport(
        this.estudiantesEC,
        this.instancias.map(instancia => ({ numero: instancia.nro })),
        (idEstudiante, numero, tipo) => this.getSavedCellValue(idEstudiante, numero, tipo),
        (numero, tipo) => this.isSlotEnabled(numero, tipo),
      );
      this.variacionTemporal = buildCalificacionesVariacionTemporalReport(
        this.estudiantesEC,
        this.instancias,
        (idEstudiante, idIE, tipo) => this.getSavedCellValueByIE(idEstudiante, idIE, tipo),
      );
      this.reporteChartOptions = this.buildChartOptions();
      this.cargandoReporte = false;
      setTimeout(() => {
        // Forzar reflow del chart cuando se reconstruye la vista.
        if (this.chartInstance && typeof this.chartInstance === 'object' && 'resize' in this.chartInstance) {
          (this.chartInstance as { resize: () => void }).resize();
        }
      }, 50);
    });
  }

  private getSavedCellValue(idEstudiante: string, evaluacionNumero: number, tipo: TipoCalificacion): number | null {
    const instancia = this.instancias.find(item => item.nro === evaluacionNumero);
    if (!instancia) {
      return null;
    }
    return this.getSavedCellValueByIE(idEstudiante, instancia.idIE, tipo);
  }

  private getSavedCellValueByIE(idEstudiante: string, idIE: string, tipo: TipoCalificacion): number | null {
    return this.calificacionesVigentes.find(
      calificacion => calificacion.idEstudiante === idEstudiante
        && calificacion.idIE === idIE
        && calificacion.tipoCalificacion === tipo
    )?.puntaje ?? null;
  }

  private isSlotEnabled(evaluacionNumero: number, tipo: TipoCalificacion): boolean {
    const instancia = this.instancias.find(item => item.nro === evaluacionNumero);
    if (!instancia) {
      return false;
    }

    switch (tipo) {
      case 'N':
        return !!instancia.archivos.notaOriginal;
      case 'R1':
        return !!instancia.archivos.recuperatorio1;
      case 'R2':
        return !!instancia.archivos.recuperatorio2;
      default:
        return false;
    }
  }

  private buildChartOptions(): EChartsOption {
    const serie = this.variacionTemporal?.seriesByStudentId[this.estudianteId];
    const puntos = serie?.puntos ?? [];

    const year = puntos[0] ? new Date(puntos[0].fechaTimestamp).getFullYear() : new Date().getFullYear();
    const minDate = Date.UTC(year, 2, 1);
    const maxDate = Date.UTC(year, 10, 30);

    const studentData = puntos.map(punto => ({
      value: [punto.fechaTimestamp, punto.valor],
      nombre: punto.etiqueta,
      fecha: punto.fecha,
      tipoOrigen: punto.tipoOrigen,
      evaluacionNumero: punto.evaluacionNumero,
    }));

    const bandLower: Array<[number, number]> = [];
    const bandDelta: Array<[number, number]> = [];
    const avgData: Array<[number, number | null]> = [];
    for (const instancia of this.instancias) {
      const ts = this.variacionTemporal?.fechaTimestampPorEvaluacion[instancia.nro] ?? null;
      const promedio = this.variacionTemporal?.promedioPorEvaluacion[instancia.nro] ?? null;
      const inferior = this.variacionTemporal?.bandaInferiorPorEvaluacion[instancia.nro] ?? null;
      const superior = this.variacionTemporal?.bandaSuperiorPorEvaluacion[instancia.nro] ?? null;
      if (ts !== null && promedio !== null && inferior !== null && superior !== null) {
        avgData.push([ts, promedio]);
        bandLower.push([ts, inferior]);
        bandDelta.push([ts, superior - inferior]);
      }
    }

    return {
      animationDuration: 500,
      animationEasing: 'cubicOut',
      grid: { left: 48, right: 24, top: 36, bottom: 52 },
      legend: {
        data: ['Estudiante', 'Promedio', 'Banda de promedio'],
        bottom: 0,
        icon: 'circle',
        textStyle: { color: '#2f3b52', fontSize: 12 },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line' },
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#d0d8e8',
        borderWidth: 1,
        textStyle: { color: '#1f2937' },
        formatter: params => {
          const items = Array.isArray(params) ? params : [params];
          const first = items[0];
          const firstValue = Array.isArray(first?.value) ? first.value as [number, number] : null;
          const fecha = firstValue ? new Date(firstValue[0]) : null;
          const header = fecha
            ? `<div style="margin-bottom:6px;font-weight:600;">${this.formatDate(fecha.toISOString())} (${this.formatMonth(fecha.toISOString())})</div>`
            : '';
          const body = items
            .filter(item => item.seriesName === 'Estudiante')
            .map(item => {
              const nota = Array.isArray(item.value) ? item.value[1] : item.value;
              const meta = item.data as { nombre?: string; tipoOrigen?: TipoCalificacion; evaluacionNumero?: number } | undefined;
              return `<div><b>${meta?.nombre ?? 'Estudiante'}</b><br/>IE ${meta?.evaluacionNumero ?? ''} / ${meta?.tipoOrigen ?? ''}: ${Number(nota).toFixed(2)}</div>`;
            })
            .filter(Boolean)
            .join('<div style="height:6px"></div>');
          return header + body;
        },
      },
      xAxis: {
        type: 'time',
        min: minDate,
        max: maxDate,
        axisLabel: {
          color: '#5b6b84',
          formatter: (value: number) => `${MESES[new Date(value).getMonth()]}`,
        },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 10,
        interval: 1,
        axisLabel: { color: '#5b6b84' },
        splitLine: { lineStyle: { color: '#e6edf7' } },
      },
      series: [
        {
          name: '',
          type: 'line',
          stack: 'band',
          data: bandLower,
          lineStyle: { opacity: 0 },
          symbol: 'none',
          areaStyle: { opacity: 0 },
          emphasis: { disabled: true },
          silent: true,
          tooltip: { show: false },
        },
        {
          name: 'Banda de promedio',
          type: 'line',
          stack: 'band',
          data: bandDelta,
          color: '#b9e3ff',
          lineStyle: { opacity: 0 },
          symbol: 'none',
          areaStyle: { color: 'rgba(185, 227, 255, 0.28)' },
          emphasis: { disabled: true },
          silent: true,
          tooltip: { show: false },
        },
        {
          name: 'Promedio',
          type: 'line',
          data: avgData,
          symbol: 'circle',
          symbolSize: 5,
          showSymbol: true,
          smooth: true,
          lineStyle: { color: '#111827', width: 2 },
          itemStyle: { color: '#111827' },
        },
        {
          name: 'Estudiante',
          type: 'line',
          data: studentData,
          symbol: 'circle',
          symbolSize: 7,
          showSymbol: true,
          smooth: true,
          lineStyle: { color: '#3b82f6', width: 2.4 },
          itemStyle: { color: '#3b82f6' },
          emphasis: { focus: 'series' },
        },
      ],
    };
  }
}
