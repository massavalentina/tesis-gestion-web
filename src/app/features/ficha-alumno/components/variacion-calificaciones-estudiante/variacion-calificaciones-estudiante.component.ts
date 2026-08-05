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

const TOTAL_INSTANCIAS = 8;

const ORIGEN_NOTA_LABEL: Record<TipoCalificacion, string> = {
  N: 'Nota original',
  R1: 'Recuperatorio 1',
  R2: 'Recuperatorio 2',
};

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
    const puntoPorEvaluacion = new Map((serie?.puntos ?? []).map(punto => [punto.evaluacionNumero, punto]));

    const categories = Array.from({ length: TOTAL_INSTANCIAS }, (_, index) => `IE ${index + 1}`);

    const studentData = categories.map((_, index) => {
      const numero = index + 1;
      const punto = puntoPorEvaluacion.get(numero);
      return {
        value: punto?.valor ?? null,
        fecha: punto?.fecha ?? null,
        tipoOrigen: punto?.tipoOrigen ?? null,
      };
    });

    const bandLower: Array<number | null> = [];
    const bandDelta: Array<number | null> = [];
    const avgData: Array<number | null> = [];
    for (let nro = 1; nro <= TOTAL_INSTANCIAS; nro++) {
      const promedio = materia.variacion?.promedioPorEvaluacion[nro] ?? null;
      const inferior = materia.variacion?.bandaInferiorPorEvaluacion[nro] ?? null;
      const superior = materia.variacion?.bandaSuperiorPorEvaluacion[nro] ?? null;
      avgData.push(promedio);
      if (inferior !== null && superior !== null) {
        bandLower.push(inferior);
        bandDelta.push(superior - inferior);
      } else {
        bandLower.push(null);
        bandDelta.push(null);
      }
    }

    return {
      animationDuration: 500,
      animationEasing: 'cubicOut',
      grid: { left: 48, right: 24, top: 36, bottom: 52 },
      legend: {
        data: ['Estudiante', 'Promedio', 'Banda de promedio'],
        bottom: 0,
        left: 'center',
        icon: 'circle',
        itemGap: 24,
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
          const index = typeof first?.dataIndex === 'number' ? first.dataIndex : 0;
          const numero = index + 1;

          const estudianteData = items.find(item => item.seriesName === 'Estudiante')?.data as
            { value: number | null; fecha?: string | null; tipoOrigen?: TipoCalificacion | null } | undefined;

          const lines = [
            `<strong>Instancia Evaluativa ${numero}</strong>`,
            !estudianteData || estudianteData.value === null
              ? 'Nota del alumno: sin nota cargada'
              : `Nota del alumno: ${estudianteData.value.toFixed(2)}`,
            estudianteData?.tipoOrigen ? `Origen: ${ORIGEN_NOTA_LABEL[estudianteData.tipoOrigen]}` : '',
            estudianteData?.fecha ? `Fecha: ${this.formatDate(estudianteData.fecha)}` : '',
          ].filter(Boolean);

          return lines.join('<br/>');
        },
      },
      xAxis: {
        type: 'category',
        data: categories,
        boundaryGap: true,
        axisLabel: { color: '#5b6b84' },
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
