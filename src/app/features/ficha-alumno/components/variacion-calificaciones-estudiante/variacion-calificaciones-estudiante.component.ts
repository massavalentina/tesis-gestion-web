import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';
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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { CalificacionesService } from '../../../mis-espacios-curriculares/services/calificaciones.service';
import { LibretaEspacio } from '../../models/libreta-calificaciones.model';
import { TipoCalificacion } from '../../../mis-espacios-curriculares/models/calificaciones.model';
import {
  ReporteVariacionTemporalGlobal,
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

interface MateriaVariacion {
  idEC: string;
  nombre: string;
  variacion: ReporteVariacionTemporalGlobal | null;
  chartOptions: EChartsOption;
}

@Component({
  selector: 'app-variacion-calificaciones-estudiante',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    NgxEchartsDirective,
  ],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './variacion-calificaciones-estudiante.component.html',
  styleUrl: './variacion-calificaciones-estudiante.component.scss',
})
export class VariacionCalificacionesEstudianteComponent implements OnChanges {
  @Input() estudianteId = '';
  @Input() espacios: LibretaEspacio[] = [];

  cargando = false;
  materias: MateriaVariacion[] = [];
  materiaActivaId = '';
  private chartInstance: unknown = null;

  constructor(private calificacionesService: CalificacionesService) {}

  ngOnChanges(): void {
    if (!this.estudianteId || this.espacios.length === 0) {
      this.materias = [];
      return;
    }
    this.cargar();
  }

  get materiaActiva(): MateriaVariacion | null {
    return this.materias.find(m => m.idEC === this.materiaActivaId) ?? null;
  }

  onMateriaChange(idEC: string): void {
    this.materiaActivaId = idEC;
    setTimeout(() => {
      if (this.chartInstance && typeof this.chartInstance === 'object' && 'resize' in this.chartInstance) {
        (this.chartInstance as { resize: () => void }).resize();
      }
    }, 50);
  }

  onChartInit(instance: any): void {
    this.chartInstance = instance;
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

  private cargar(): void {
    this.cargando = true;

    forkJoin(this.espacios.map(espacio => this.cargarMateria(espacio))).subscribe(materias => {
      this.materias = materias.filter((m): m is MateriaVariacion => m !== null);
      this.materiaActivaId = this.materias[0]?.idEC ?? '';
      this.cargando = false;
    });
  }

  private cargarMateria(espacio: LibretaEspacio): Observable<MateriaVariacion | null> {
    return forkJoin({
      instancias: this.calificacionesService.getInstancias(espacio.idEC),
      estudiantes: this.calificacionesService.getEstudiantes(espacio.idEC),
      calificaciones: this.calificacionesService.getCalificacionesVigentes(espacio.idEC),
    }).pipe(
      map(({ instancias, estudiantes, calificaciones }) => {
        const variacion = buildCalificacionesVariacionTemporalReport(
          estudiantes,
          instancias,
          (idEstudiante, idIE, tipo: TipoCalificacion) => calificaciones.find(
            c => c.idEstudiante === idEstudiante && c.idIE === idIE && c.tipoCalificacion === tipo,
          )?.puntaje ?? null,
        );

        const materia: MateriaVariacion = {
          idEC: espacio.idEC,
          nombre: espacio.nombreMateria,
          variacion,
          chartOptions: {},
        };
        materia.chartOptions = this.buildChartOptions(materia);
        return materia;
      }),
      catchError(() => of(null)),
    );
  }

  private buildChartOptions(materia: MateriaVariacion): EChartsOption {
    const serie = materia.variacion?.seriesByStudentId[this.estudianteId];
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
    for (let nro = 1; nro <= 8; nro++) {
      const ts = materia.variacion?.fechaTimestampPorEvaluacion[nro] ?? null;
      const promedio = materia.variacion?.promedioPorEvaluacion[nro] ?? null;
      const inferior = materia.variacion?.bandaInferiorPorEvaluacion[nro] ?? null;
      const superior = materia.variacion?.bandaSuperiorPorEvaluacion[nro] ?? null;
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
