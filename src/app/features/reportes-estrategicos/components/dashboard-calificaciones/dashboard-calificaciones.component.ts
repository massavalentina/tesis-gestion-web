import { Component, OnInit } from '@angular/core';
import { NgIf, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import * as echarts from 'echarts/core';
import { BarChart, PieChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  BarChart, PieChart,
  TitleComponent, TooltipComponent, GridComponent, LegendComponent,
  CanvasRenderer,
]);

import { ReportesEstrategicosService } from '../../services/reportes-estrategicos.service';
import { DashboardCalificaciones } from '../../models/dashboard-calificaciones.model';
import { ChartFullscreenDialogComponent } from '../chart-fullscreen-dialog/chart-fullscreen-dialog.component';

const NAVY  = '#1f4e87';
const BLUE  = '#5b8bc4';
const BLUEL = '#9cc1e3';
const RED   = '#e23744';
const AMBER = '#f0a35e';
const MUTED = '#64748b';
const DARK  = '#1e293b';

@Component({
  selector: 'app-dashboard-calificaciones',
  standalone: true,
  imports: [
    NgIf, DecimalPipe, FormsModule,
    MatSelectModule, MatFormFieldModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatTooltipModule, MatDialogModule, NgxEchartsDirective,
  ],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './dashboard-calificaciones.component.html',
  styleUrls: ['./dashboard-calificaciones.component.scss'],
})
export class DashboardCalificacionesComponent implements OnInit {
  anioLectivo = new Date().getFullYear();
  cargando = false;
  dashboard: DashboardCalificaciones | null = null;

  chartMayorDesap: EChartsOption = {};
  chartMejorPromedio: EChartsOption = {};
  chartTasaCurso: EChartsOption = {};
  chartEstados: EChartsOption = {};

  constructor(
    private reportesService: ReportesEstrategicosService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.dashboard = null;
    this.reportesService.obtenerDashboardCalificaciones(this.anioLectivo).subscribe({
      next: (data) => {
        this.dashboard = data;
        this.buildCharts();
        this.cargando = false;
      },
      error: () => { this.cargando = false; },
    });
  }

  abrirFullscreen(options: EChartsOption, titulo: string): void {
    this.dialog.open(ChartFullscreenDialogComponent, {
      data: { options, titulo },
      width: '92vw',
      maxWidth: '92vw',
      height: '88vh',
    });
  }

  private buildCharts(): void {
    if (!this.dashboard) return;
    this.buildChartMayorDesap();
    this.buildChartMejorPromedio();
    this.buildChartTasaCurso();
    this.buildChartEstados();
  }

  private buildChartMayorDesap(): void {
    const data = this.dashboard!.top5EcMayorDesaprobacion;
    this.chartMayorDesap = {
      grid: { left: 0, right: 10, top: 14, bottom: 0, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: {
        type: 'category',
        data: data.map(d => d.nombre),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: { color: MUTED, fontSize: 11, interval: 0, overflow: 'truncate', width: 80 },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#f1f5f9' } },
        axisLabel: { color: '#94a3b8' },
      },
      series: [{
        type: 'bar',
        barWidth: '52%',
        itemStyle: { color: RED, borderRadius: [4, 4, 0, 0] },
        label: { show: true, position: 'top', color: MUTED, fontSize: 11 },
        data: data.map(d => d.cantidadDesaprobados),
      }],
    };
  }

  private buildChartMejorPromedio(): void {
    const data = this.dashboard!.top5EcMejorPromedio;
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
    };
  }

  private buildChartTasaCurso(): void {
    const data = this.dashboard!.top5CursosMayorTasa;
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
    };
  }

  private buildChartEstados(): void {
    const est = this.dashboard!.distribucionEstados;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.chartEstados = {
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
          { value: est.desaprobadoPorTema, name: 'Desap. por Tema', itemStyle: { color: BLUE } },
          { value: est.desaprobado,        name: 'Desaprobado',     itemStyle: { color: BLUEL } },
        ],
      }] as any,
    };
  }

  get avanceTexto(): string {
    if (!this.dashboard) return '-';
    if (this.dashboard.avanceProgramas === null) return '-';
    return `${this.dashboard.avanceProgramas}%`;
  }

  get promedioTexto(): string {
    if (!this.dashboard) return '-';
    return this.dashboard.promedioGeneral.toFixed(2);
  }

  get desviacionTexto(): string {
    if (!this.dashboard) return '-';
    return this.dashboard.desviacionEstandar.toFixed(1);
  }
}
