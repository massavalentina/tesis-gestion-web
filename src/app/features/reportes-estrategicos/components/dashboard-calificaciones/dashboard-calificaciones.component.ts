import { Component, OnInit } from '@angular/core';
import { NgIf, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DateAdapter, MAT_DATE_FORMATS, NativeDateAdapter } from '@angular/material/core';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import * as echarts from 'echarts/core';
import { BarChart, PieChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  GraphicComponent,
  DataZoomComponent,
  DataZoomInsideComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  BarChart, PieChart,
  TitleComponent, TooltipComponent, GridComponent, LegendComponent, GraphicComponent,
  DataZoomComponent, DataZoomInsideComponent,
  CanvasRenderer,
]);

import { ReportesEstrategicosService } from '../../services/reportes-estrategicos.service';
import { DashboardCalificaciones, CursoLabel } from '../../models/dashboard-calificaciones.model';
import { ChartFullscreenDialogComponent } from '../chart-fullscreen-dialog/chart-fullscreen-dialog.component';

class DdMmYyyyAdapter extends NativeDateAdapter {
  override format(date: Date, _displayFormat: object): string {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${d}/${m}/${date.getFullYear()}`;
  }
  override parse(value: string): Date | null {
    if (!value) return null;
    const parts = value.split('/');
    if (parts.length === 3) return new Date(+parts[2], +parts[1] - 1, +parts[0]);
    return super.parse(value);
  }
}

const DD_MM_YYYY_FORMATS = {
  parse: { dateInput: 'DD/MM/YYYY' },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'DD/MM/YYYY',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

const NAVY  = '#1f4e87';
const BLUE  = '#5b8bc4';
const BLUEL = '#9cc1e3';
const RED   = '#e23744';
const AMBER = '#f0a35e';
const MUTED = '#64748b';

@Component({
  selector: 'app-dashboard-calificaciones',
  standalone: true,
  imports: [
    NgIf, DecimalPipe, FormsModule,
    MatSelectModule, MatDatepickerModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatTooltipModule, MatDialogModule, NgxEchartsDirective,
  ],
  providers: [
    provideEchartsCore({ echarts }),
    { provide: DateAdapter, useClass: DdMmYyyyAdapter },
    { provide: MAT_DATE_FORMATS, useValue: DD_MM_YYYY_FORMATS },
  ],
  templateUrl: './dashboard-calificaciones.component.html',
  styleUrls: ['./dashboard-calificaciones.component.scss'],
})
export class DashboardCalificacionesComponent implements OnInit {

  anioLectivo = new Date().getFullYear();
  fechaDesde: Date | null = null;
  fechaHasta: Date | null = null;

  get minDatePeriodo(): Date { return new Date(this.anioLectivo, 0, 1); }
  get maxDatePeriodo(): Date { return new Date(this.anioLectivo, 11, 31); }

  cargando        = false;
  cargandoCursos  = true;
  dashboard: DashboardCalificaciones | null = null;

  // Estructura de ejes construida desde cursos reales
  yearLabels:   string[] = [];
  courseLabels: string[] = [];

  chartMayorDesap:    EChartsOption = {};
  chartMejorPromedio: EChartsOption = {};
  chartTasaCurso:     EChartsOption = {};
  chartCondicion:     EChartsOption = {};
  chartTasaPorAnio:   EChartsOption = {};
  chartTasaPorCurso:  EChartsOption = {};

  constructor(
    private reportesService: ReportesEstrategicosService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.cargarCursos();
    this.cargar();
  }

  cargarCursos(): void {
    this.cargandoCursos = true;
    this.reportesService.obtenerCursosCalificaciones(this.anioLectivo).subscribe({
      next: (cursos) => {
        this.buildYearAndCourseLabels(cursos);
        this.buildChartTasaPorAnio();
        this.buildChartTasaPorCurso();
        this.cargandoCursos = false;
      },
      error: () => { this.cargandoCursos = false; },
    });
  }

  cargar(): void {
    this.cargando  = true;
    this.dashboard = null;
    const desde = this.fechaDesde ? this.fmtDate(this.fechaDesde) : undefined;
    const hasta = this.fechaHasta ? this.fmtDate(this.fechaHasta) : undefined;
    this.reportesService.obtenerDashboardCalificaciones(this.anioLectivo, desde, hasta).subscribe({
      next: (data) => {
        this.dashboard = data;
        this.buildCharts();
        this.cargando = false;
      },
      error: () => { this.cargando = false; },
    });
  }

  onAnioChange(): void {
    this.fechaDesde = null;
    this.fechaHasta = null;
    this.cargarCursos();
  }

  aplicarFiltros(): void {
    this.cargar();
  }

  limpiarFiltros(): void {
    this.anioLectivo = new Date().getFullYear();
    this.fechaDesde  = null;
    this.fechaHasta  = null;
    this.cargarCursos();
    this.cargar();
  }

  exportarPdf(): void {
    // TODO: implementar exportación a PDF
  }

  abrirFullscreen(options: EChartsOption, titulo: string): void {
    this.dialog.open(ChartFullscreenDialogComponent, {
      data: { options, titulo },
      width: '92vw',
      maxWidth: '92vw',
      height: '88vh',
    });
  }

  // ── Texto para KPIs ────────────────────────────────────────────────────────

  get avanceTexto(): string {
    if (!this.dashboard || this.dashboard.avanceProgramas === null) return '-';
    return `${this.dashboard.avanceProgramas}%`;
  }

  get promedioTexto(): string {
    if (!this.dashboard || this.dashboard.promedioGeneral === null) return '-';
    return this.dashboard.promedioGeneral.toFixed(2);
  }

  get tasaAprobTexto(): string {
    if (!this.dashboard) return '-';
    return `${this.dashboard.tasaAprobacionGeneral}%`;
  }

  get alumnosRiesgoTexto(): string {
    if (!this.dashboard || this.dashboard.alumnosEnRiesgo === null) return '-';
    return `${this.dashboard.alumnosEnRiesgo}`;
  }

  get isLoading(): boolean {
    return this.cargando || this.cargandoCursos;
  }

  // ── Chart builders ─────────────────────────────────────────────────────────

  private buildCharts(): void {
    if (!this.dashboard) return;
    this.buildChartMayorDesap();
    this.buildChartMejorPromedio();
    this.buildChartTasaCurso();
    this.buildChartCondicion();
  }

  private buildChartMayorDesap(): void {
    const data = this.dashboard!.top5EcMayorDesaprobacion;
    if (!data.length) return;
    this.chartMayorDesap = {
      grid: { left: 0, right: 10, top: 14, bottom: 0, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (v: unknown) => `${v}%`,
      },
      xAxis: {
        type: 'category',
        data: data.map(d => d.nombre),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: { color: MUTED, fontSize: 11, interval: 0, overflow: 'truncate', width: 80 },
      },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: '{value}%', color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
      },
      series: [{
        type: 'bar',
        barWidth: '52%',
        itemStyle: { color: RED, borderRadius: [4, 4, 0, 0] },
        label: {
          show: true,
          position: 'top',
          formatter: (p: { value: unknown }) => `${p.value}%`,
          color: MUTED,
          fontSize: 11,
        },
        data: data.map(d => d.tasaDesaprobacion),
      }],
      dataZoom: [{ type: 'inside' }],
    };
  }

  private buildChartMejorPromedio(): void {
    const data = this.dashboard!.top5EcMejorPromedio;
    if (!data.length) return;
    const blueScale = [NAVY, '#2c5f9e', BLUE, '#7ba9d6', BLUEL];
    this.chartMejorPromedio = {
      grid: { left: 0, right: 40, top: 10, bottom: 0, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: {
        type: 'value',
        max: 10,
        splitLine: { lineStyle: { color: '#f1f5f9' } },
        axisLabel: { color: '#94a3b8' },
      },
      yAxis: {
        type: 'category',
        inverse: true,
        data: data.map(d => d.nombre),
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { color: '#475569', fontSize: 11, width: 130, overflow: 'truncate' },
      },
      series: [{
        type: 'bar',
        barWidth: 14,
        itemStyle: { borderRadius: [0, 7, 7, 0] },
        label: { show: true, position: 'right', color: MUTED, fontSize: 11 },
        data: data.map((d, i) => ({
          value: d.promedio,
          itemStyle: { color: blueScale[Math.min(i, blueScale.length - 1)] },
        })),
      }],
      dataZoom: [{ type: 'inside', orient: 'vertical' }],
    };
  }

  private buildChartTasaCurso(): void {
    const data = this.dashboard!.top5CursosMayorTasa;
    if (!data.length) return;
    this.chartTasaCurso = {
      grid: { left: 0, right: 10, top: 14, bottom: 0, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (v: unknown) => `${v}%`,
      },
      xAxis: {
        type: 'category',
        data: data.map(d => d.curso),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: { color: MUTED, fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: '{value}%', color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
      },
      series: [{
        type: 'bar',
        barWidth: '52%',
        itemStyle: { color: RED, borderRadius: [4, 4, 0, 0] },
        label: {
          show: true,
          position: 'top',
          formatter: (p: { value: unknown }) => `${p.value}%`,
          color: MUTED,
          fontSize: 11,
        },
        data: data.map(d => d.tasaDesaprobacion),
      }],
      dataZoom: [{ type: 'inside' }],
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private buildChartCondicion(): void {
    const est = this.dashboard!.distribucionEstados;
    const total = (est.aprobado ?? 0) + (est.desaprobado ?? 0) + (est.desaprobadoPorTema ?? 0);
    if (total === 0) return;
    this.chartCondicion = {
      tooltip: { trigger: 'item', formatter: (p: any) => `${p.name}: ${p.percent}%` },
      legend: {
        bottom: 0,
        icon: 'circle',
        itemWidth: 9,
        itemHeight: 9,
        textStyle: { fontSize: 12, color: MUTED },
      },
      series: [{
        type: 'pie',
        radius: ['0%', '70%'],
        center: ['50%', '45%'],
        itemStyle: { borderColor: '#fff', borderWidth: 2 },
        label: {
          show: true,
          formatter: (p: any) => `${p.percent}%`,
          fontSize: 11,
          color: '#fff',
          position: 'inside',
        },
        data: [
          { value: est.aprobado,          name: 'Aprobado',        itemStyle: { color: NAVY } },
          { value: est.desaprobadoPorTema, name: 'Desap. por Tema', itemStyle: { color: AMBER } },
          { value: est.desaprobado,        name: 'Desaprobado',     itemStyle: { color: RED } },
        ],
      }] as any,
    };
  }

  private buildChartTasaPorAnio(): void {
    if (!this.yearLabels.length) return;
    // Los valores de tasa van en null hasta que se implemente el cálculo por año.
    this.chartTasaPorAnio = {
      grid: { left: 16, right: 16, top: 16, bottom: 24, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (v: unknown) => (v !== null ? `${v}%` : 'Sin datos'),
      },
      xAxis: {
        type: 'category',
        data: this.yearLabels,
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: { color: MUTED, fontSize: 11, margin: 18},
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLabel: { formatter: '{value}%', color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
      },
      // TODO: poblar data con tasas reales de aprobación por año lectivo
      series: [{ type: 'bar', barWidth: '46%', itemStyle: { color: NAVY }, data: this.yearLabels.map(() => 0) }],
      dataZoom: [{ type: 'inside' }],
      graphic: [{
        type: 'text',
        left: 'center',
        top: 'middle',
        style: { text: 'Implementación pendiente — los valores estarán disponibles próximamente', fill: '#94a3b8', fontSize: 12 },
      }],
    };
  }

  private buildChartTasaPorCurso(): void {
    if (!this.courseLabels.length) return;
    // Los valores de tasa van en null hasta que se implemente el cálculo por curso.
    this.chartTasaPorCurso = {
      grid: { left: 16, right: 16, top: 16, bottom: 24, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (v: unknown) => (v !== null ? `${v}%` : 'Sin datos'),
      },
      xAxis: {
        type: 'category',
        data: this.courseLabels,
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: { color: MUTED, fontSize: 10, margin: 18},
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLabel: { formatter: '{value}%', color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
      },
      // TODO: poblar data con tasas reales de aprobación por curso/división
      series: [{ type: 'bar', barWidth: '60%', itemStyle: { color: NAVY }, data: this.courseLabels.map(() => 0) }],
      dataZoom: [{ type: 'inside' }],
      graphic: [{
        type: 'text',
        left: 'center',
        top: 'middle',
        style: { text: 'Implementación pendiente — los valores estarán disponibles próximamente', fill: '#94a3b8', fontSize: 12 },
      }],
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private buildYearAndCourseLabels(cursos: CursoLabel[]): void {
    // Labels come as "1A", "2B", "3C", "7C" etc. (Anio.Numero + Division.Nombre)
    const years = new Set<number>();
    for (const c of cursos) {
      const n = parseInt(c.label.charAt(0), 10);
      if (!isNaN(n)) years.add(n);
    }
    this.yearLabels   = [...years].sort((a, b) => a - b).map(y => `${y}° año`);
    this.courseLabels = cursos.map(c => c.label).sort();
  }

  private fmtDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
