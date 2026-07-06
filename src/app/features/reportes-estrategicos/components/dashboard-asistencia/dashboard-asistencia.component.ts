import { Component, OnInit } from '@angular/core';
import { NgIf, NgFor, DecimalPipe } from '@angular/common';
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
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  DataZoomComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  BarChart, LineChart, PieChart,
  TitleComponent, TooltipComponent, GridComponent, LegendComponent, MarkLineComponent,
  DataZoomComponent,
  CanvasRenderer,
]);

import { ReportesEstrategicosService } from '../../services/reportes-estrategicos.service';
import {
  DashboardAsistencia,
  DashboardFiltros,
  OpcionCurso,
  OpcionEC,
} from '../../models/dashboard-asistencia.model';
import { ChartFullscreenDialogComponent } from '../chart-fullscreen-dialog/chart-fullscreen-dialog.component';
import { PdfReporteService, DashboardPdfData } from '../../../../core/services/pdf-reporte.service';

class DdMmYyyyAdapter extends NativeDateAdapter {
  override format(date: Date, displayFormat: object): string {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  }
  override parse(value: string): Date | null {
    if (!value) return null;
    const parts = value.split('/');
    if (parts.length === 3) {
      return new Date(+parts[2], +parts[1] - 1, +parts[0]);
    }
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

const MESES = ['Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const C = {
  primary:    '#0284c7',
  primaryL:   '#38bdf8',
  success:    '#15803d',
  successL:   '#4ade80',
  warning:    '#f59e0b',
  warningL:   '#fbbf24',
  danger:     '#ef4444',
  dangerL:    '#f87171',
  muted:      '#64748b',
  mutedL:     '#94a3b8',
  dark:       '#1e293b',
};

interface KpiCard {
  key: string;
  label: string;
  icon: string;
  color: string;
  suffix: string;
  tooltip: string;
  /** Angular DecimalPipe format string. Default: '1.0-1' */
  format?: string;
}

const CARDS_GENERAL: KpiCard[] = [
  { key: 'porcentajeAsistenciaGeneral', label: 'Asistencia General', icon: 'check_circle', color: C.primary, suffix: ' %',
    tooltip: 'Porcentaje de presencias (P, LLT, LLTE, LLTC) sobre el total de registros (presencias + ausencias A/ANC).' },
  { key: 'promedioInasistenciasPorCurso', label: 'Prom. Inasistencias General', icon: 'trending_down', color: C.primary, suffix: '',
    tooltip: 'Promedio general de inasistencias por alumno.' },
  { key: 'porcentajeLlegadasTarde', label: 'Llegadas Tarde', icon: 'schedule', color: C.primary, suffix: ' %',
    tooltip: 'Porcentaje de llegadas tarde (LLT, LLTE, LLTC) sobre el total de presencias.' },
  { key: 'porcentajeRetirosAnticipados', label: 'Retiros Anticipados', icon: 'exit_to_app', color: C.primary, suffix: ' %',
    tooltip: 'Porcentaje de retiros anticipados (RA, RAE, RE en cualquier turno) sobre el total de presencias.' },
  { key: 'alumnosTeaGeneral', label: 'Alumnos en TEA General', icon: 'warning', color: C.primary, suffix: '', format: '1.0-0',
    tooltip: 'Cantidad de alumnos en Trayectoria Escolar Asistida por tener 25 o más inasistencias.' },
];

const CARDS_EC: KpiCard[] = [
  { key: 'porcentajeAsistenciaPorEC', label: 'Asistencia', icon: 'menu_book', color: C.primary, suffix: ' %',
    tooltip: 'El porcentaje general de asistencia por espacios curriculares se calcula en base al promedio de porcentajes de asistencia de cada EC.' },
  { key: 'alumnosTeaPorEspacio', label: 'Alumnos en TEA', icon: 'warning', color: C.primary, suffix: '', format: '1.0-0',
    tooltip: 'Representa la cantidad de alumnos en condición de Trayectoria Escolar Asistida por estar con menos del 75% de asistencia al Espacio Curricular.' },
];

@Component({
  selector: 'app-dashboard-asistencia',
  standalone: true,
  imports: [
    NgIf, NgFor, DecimalPipe, FormsModule,
    MatSelectModule, MatDatepickerModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule,
    MatDialogModule, NgxEchartsDirective,
  ],
  providers: [
    provideEchartsCore({ echarts }),
    { provide: DateAdapter, useClass: DdMmYyyyAdapter },
    { provide: MAT_DATE_FORMATS, useValue: DD_MM_YYYY_FORMATS },
  ],
  templateUrl: './dashboard-asistencia.component.html',
  styleUrls: ['./dashboard-asistencia.component.scss'],
})
export class DashboardAsistenciaComponent implements OnInit {
  anioLectivo = new Date().getFullYear();
  fechaDesde: Date | null = null;
  fechaHasta: Date | null = null;
  cursoIds: string[] = [];
  ecId = '';
  turno: 'GENERAL' | 'TARDE' = 'GENERAL';

  get minDatePeriodo(): Date { return new Date(this.anioLectivo, 0, 1); }
  get maxDatePeriodo(): Date { return new Date(this.anioLectivo, 11, 31); }

  cursos: OpcionCurso[] = [];
  espacios: OpcionEC[] = [];

  cargando = false;
  dashboard: DashboardAsistencia | null = null;

  chartInasistenciasCurso: EChartsOption = {};
  chartDistribucion: EChartsOption = {};
  chartTendencia: EChartsOption = {};
  chartSubtipos: EChartsOption = {};
  chartAsistenciaEC: EChartsOption = {};
  chartDistribucionEC: EChartsOption = {};

  ordenInasistenciasAsc = true;
  ordenECAsc = true;
  modoSubtipos: 'llegadasTarde' | 'retiros' = 'llegadasTarde';

  // Filtro multi-select de cursos para tendencia
  cursosTendencia: string[] = [];
  opcionesCursosTendencia: string[] = [];

  // ECharts instances para exportación PDF
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chartInstances: Record<string, any> = {};

  readonly cardsGeneral = CARDS_GENERAL;
  readonly cardsEC = CARDS_EC;

  exportandoPdfGeneral = false;
  exportandoPdfEC = false;

  constructor(
    private reportesService: ReportesEstrategicosService,
    private dialog: MatDialog,
    private pdfService: PdfReporteService,
  ) {}

  ngOnInit(): void {
    this.cargarCursos();
    this.aplicarFiltros();
  }

  cargarCursos(): void {
    this.reportesService.obtenerCursos().subscribe({
      next: (cursos) => this.cursos = cursos,
    });
  }

  onAnioChange(): void {
    this.fechaDesde = null;
    this.fechaHasta = null;
  }

  onCursoChange(): void {
    // Lógica de "Todos"
    const tieneTodos = this.cursoIds.includes('__todos__');
    const soloIds = this.cursoIds.filter(v => v !== '__todos__');
    const todosLosIds = this.cursos.map(c => c.id);

    if (tieneTodos && soloIds.length < todosLosIds.length) {
      this.cursoIds = ['__todos__', ...todosLosIds];
    } else if (!tieneTodos && soloIds.length === todosLosIds.length) {
      this.cursoIds = [];
    } else if (soloIds.length === todosLosIds.length) {
      this.cursoIds = ['__todos__', ...soloIds];
    } else {
      this.cursoIds = soloIds;
    }

    this.ecId = '';
    this.espacios = [];
    // Solo cargar ECs si hay exactamente un curso real seleccionado
    const cursosReales = this.cursoIds.filter(v => v !== '__todos__');
    if (cursosReales.length === 1) {
      this.reportesService.obtenerEspaciosCurriculares(cursosReales[0]).subscribe({
        next: (ecs) => this.espacios = ecs,
      });
    }
  }

  aplicarFiltros(): void {
    this.cargando = true;
    const cursosReales = this.cursoIds.filter(v => v !== '__todos__');
    const filtros: DashboardFiltros = {
      anioLectivo: this.anioLectivo,
      desde: this.fechaDesde ? this.fmtDate(this.fechaDesde) : undefined,
      hasta: this.fechaHasta ? this.fmtDate(this.fechaHasta) : undefined,
      cursoIds: cursosReales.length > 0 ? cursosReales : undefined,
      ecId: this.ecId || undefined,
      turno: this.turno,
    };
    this.reportesService.obtenerDashboardAsistencia(filtros).subscribe({
      next: (data) => {
        this.dashboard = data;
        // Poblar opciones de cursos para tendencia
        this.opcionesCursosTendencia = data.tendenciaMensual.map(t => t.curso);
        // Sincronizar: si hay filtro de cursos global, pre-seleccionar esos en tendencia
        if (this.cursoIds.length > 0) {
          const labelsSeleccionados = this.opcionesCursosTendencia.filter(label =>
            this.cursos.some(c => this.cursoIds.includes(c.id) && c.label === label)
          );
          this.cursosTendencia = labelsSeleccionados.length > 0
            ? labelsSeleccionados
            : [...this.opcionesCursosTendencia];
        } else {
          this.cursosTendencia = [];
        }
        this.buildCharts();
        this.cargando = false;
      },
      error: () => this.cargando = false,
    });
  }

  setTurno(t: 'GENERAL' | 'TARDE'): void {
    this.turno = t;
    this.aplicarFiltros();
  }

  limpiarFiltros(): void {
    this.anioLectivo = new Date().getFullYear();
    this.fechaDesde = null;
    this.fechaHasta = null;
    this.cursoIds = [];
    this.ecId = '';
    this.espacios = [];
    this.turno = 'GENERAL';
    this.aplicarFiltros();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChartInit(key: string, instance: any): void {
    this.chartInstances[key] = instance;
  }

  val(key: string): number {
    if (!this.dashboard) return 0;
    return (this.dashboard as any)[key] as number ?? 0;
  }

  toggleOrdenInasistencias(): void {
    this.ordenInasistenciasAsc = !this.ordenInasistenciasAsc;
    this.buildChartInasistenciasCurso();
  }

  toggleOrdenEC(): void {
    this.ordenECAsc = !this.ordenECAsc;
    this.buildChartAsistenciaEC();
  }

  // ── Chart builders ──────────────────────────────────────────────────────────

  get tituloSubtipos(): string {
    return 'Distribución Porcentual por Tipo';
  }

  onModoSubtiposChange(): void {
    this.buildChartSubtipos();
  }

  onCursosTendenciaChange(): void {
    // Lógica de "Todos": si se selecciona __todos__, marcar todos; si se deselecciona, vaciar
    const tieneTodos = this.cursosTendencia.includes('__todos__');
    const soloOpciones = this.cursosTendencia.filter(v => v !== '__todos__');

    if (tieneTodos && soloOpciones.length < this.opcionesCursosTendencia.length) {
      // Se acaba de seleccionar "Todos" → marcar todos
      this.cursosTendencia = ['__todos__', ...this.opcionesCursosTendencia];
    } else if (!tieneTodos && soloOpciones.length === this.opcionesCursosTendencia.length) {
      // Se deseleccionó "Todos" manualmente → vaciar
      this.cursosTendencia = [];
    } else if (soloOpciones.length === this.opcionesCursosTendencia.length) {
      // Todas las opciones están seleccionadas → agregar __todos__
      this.cursosTendencia = ['__todos__', ...soloOpciones];
    } else {
      // Se deseleccionó un curso individual → quitar __todos__
      this.cursosTendencia = soloOpciones;
    }

    this.buildChartTendencia();
  }

  private buildCharts(): void {
    this.buildChartInasistenciasCurso();
    this.buildChartDistribucion();
    this.buildChartTendencia();
    this.buildChartSubtipos();
    this.buildChartAsistenciaEC();
    this.buildChartDistribucionEC();
  }

  private buildChartInasistenciasCurso(): void {
    if (!this.dashboard) return;
    const data = [...this.dashboard.inasistenciasPorCurso];
    data.sort((a, b) => this.ordenInasistenciasAsc ? a.promedio - b.promedio : b.promedio - a.promedio);

    const promedio = data.length > 0
      ? Math.round(data.reduce((s, d) => s + d.promedio, 0) / data.length * 10) / 10 : 0;

    // Agregar barra de promedio general
    const labels = [...data.map(d => d.curso), 'Promedio'];
    const values = [...data.map(d => d.promedio), promedio];

    // Degradé de azul oscuro a celeste claro (inspirado en referencia)
    const blueScale = ['#1b3a5c', '#1f4e79', '#2968a0', '#3580b8', '#4a97cc', '#6aadda', '#8ac2e6', '#a8d5f0', '#c2e3f7', '#daf0fc'];
    const barData = values.map((v, i) => {
      const isPromedio = i === values.length - 1;
      const colorIdx = Math.round(i / Math.max(values.length - 2, 1) * (blueScale.length - 1));
      return {
        value: v,
        itemStyle: {
          color: isPromedio ? C.muted : blueScale[Math.min(colorIdx, blueScale.length - 1)],
          borderRadius: [0, 4, 4, 0],
        },
      };
    });

    const MAX_VISIBLE = 6;

    this.chartInasistenciasCurso = {
      grid: { left: '80px', right: '30px', top: '10px', bottom: '10px', containLabel: false },
      xAxis: {
        type: 'value',
        max: (v: any) => Math.ceil(v.max * 1.15) || 30,
        splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } },
        axisLabel: { color: C.muted, fontSize: 11 },
      },
      yAxis: {
        type: 'category',
        data: labels,
        axisLabel: {
          fontSize: 12,
          color: ((value: string | number | undefined) => value === 'Promedio' ? C.muted : C.dark) as any,
          fontStyle: ((value: string | number | undefined) => value === 'Promedio' ? 'italic' : 'normal') as any,
        },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      dataZoom: [{
        type: 'inside', yAxisIndex: 0,
        startValue: 0, endValue: MAX_VISIBLE - 1,
        zoomOnMouseWheel: false,
        moveOnMouseWheel: true,
        moveOnMouseMove: false,
      }],
      series: [{
        type: 'bar',
        data: barData,
        barMaxWidth: 22,
        label: {
          show: true,
          position: 'right',
          fontSize: 11,
          fontWeight: 600,
          color: C.dark,
          formatter: (p: any) => p.value?.toFixed(1),
        },
        emphasis: {
          label: {
            show: true,
            position: 'right',
            fontSize: 12,
            fontWeight: 600,
            color: C.dark,
          },
        },
      }],
    };
  }

  private buildChartDistribucion(): void {
    if (!this.dashboard) return;
    const dist = this.dashboard.distribucionInasistencias;
    const total = dist.ausentes + dist.llegadasTarde + dist.retirosAnticipados;

    this.chartDistribucion = {
      tooltip: {
        trigger: 'item',
        formatter: (p: any) => `<b>${p.name}</b><br/>${p.value} (${p.percent}%)`,
      },
      legend: {
        bottom: 8, left: 'center',
        textStyle: { fontSize: 12, color: C.muted },
        itemWidth: 12, itemHeight: 12, itemGap: 20,
      },
      series: [{
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 3 },
        label: {
          show: true,
          formatter: '{d}%',
          fontSize: 13,
          fontWeight: 600,
          color: C.dark,
          distanceToLabelLine: 4,
          minMargin: 8,
        },
        labelLine: { length: 16, length2: 12 },
        data: [
          { value: dist.ausentes, name: 'Ausentes', itemStyle: { color: '#1b3a5c' } },
          { value: dist.llegadasTarde, name: 'Llegadas Tarde', itemStyle: { color: '#4a97cc' } },
          { value: dist.retirosAnticipados, name: 'Retiros Anticipados', itemStyle: { color: '#a8d5f0' } },
        ],
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.15)' },
        },
      }],
      ...(total > 0 ? {
        graphic: [{
          type: 'text',
          left: 'center', top: '40%',
          style: { text: `${total}`, fontSize: 22, fontWeight: 700, fill: C.dark, textAlign: 'center' },
        }, {
          type: 'text',
          left: 'center', top: '48%',
          style: { text: 'Total', fontSize: 11, fill: C.muted, textAlign: 'center' },
        }] as any,
      } : {}),
    };
  }

  private buildChartTendencia(): void {
    if (!this.dashboard) return;
    const blueScale = ['#1b3a5c', '#1f4e79', '#2968a0', '#3580b8', '#4a97cc', '#6aadda', '#8ac2e6', '#a8d5f0', '#c2e3f7', '#daf0fc'];

    // Filtrar por cursos seleccionados
    const seleccionados = this.cursosTendencia.filter(v => v !== '__todos__');
    const datosFiltrados = seleccionados.length > 0
      ? this.dashboard.tendenciaMensual.filter(t => seleccionados.includes(t.curso))
      : [];

    const count = datosFiltrados.length;

    const series: any[] = datosFiltrados.map((t, i) => {
      const colorIdx = Math.round(i / Math.max(count - 1, 1) * (blueScale.length - 1));
      return {
        name: t.curso,
        type: 'line',
        data: t.valoresMensuales,
        connectNulls: true,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2 },
        itemStyle: { color: blueScale[Math.min(colorIdx, blueScale.length - 1)] },
      };
    });

    if (count > 1) {
      const promedios: (number | null)[] = [];
      for (let i = 0; i < 10; i++) {
        const vals = datosFiltrados
          .map(t => t.valoresMensuales[i])
          .filter((v): v is number => v !== null);
        promedios.push(vals.length > 0 ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length * 100) / 100 : null);
      }
      series.push({
        name: 'Promedio',
        type: 'line',
        data: promedios,
        connectNulls: true,
        smooth: true,
        symbol: 'diamond',
        symbolSize: 7,
        lineStyle: { width: 3, type: 'dashed', color: C.muted },
        itemStyle: { color: C.muted },
      });
    }

    this.chartTendencia = {
      tooltip: { trigger: 'item' },
      legend: {
        type: 'scroll', bottom: 0, left: 'center',
        textStyle: { fontSize: 11, color: C.muted },
        itemWidth: 16, itemHeight: 3,
      },
      grid: { left: '50px', right: '30px', top: '15px', bottom: '55px' },
      xAxis: {
        type: 'category', data: MESES, boundaryGap: false,
        axisLabel: { color: C.muted, fontSize: 11 },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } },
        axisLabel: { color: C.muted, fontSize: 11 },
      },
      series,
    };
  }

  private buildChartSubtipos(): void {
    if (!this.dashboard) return;
    const sub = this.dashboard.distribucionSubtipos;

    const isLT = this.modoSubtipos === 'llegadasTarde';
    const items = isLT
      ? [
          { value: sub.llt, name: 'Simples (LLT)' },
          { value: sub.llte, name: 'Extendidas (LLTE)' },
          { value: sub.lltc, name: 'Completas (LLTC)' },
        ]
      : [
          { value: sub.ra, name: 'Retiro Anticipado (RA)' },
          { value: sub.re, name: 'Retiro Express (RE)' },
          { value: sub.rae, name: 'Retiro Extendido (RAE)' },
        ];

    const colors = ['#1b3a5c', '#4a97cc', '#a8d5f0'];
    const total = items.reduce((s, i) => s + i.value, 0);

    this.chartSubtipos = {
      tooltip: {
        trigger: 'item',
        formatter: (p: any) => `<b>${p.name}</b><br/>${p.value} (${p.percent}%)`,
      },
      legend: {
        bottom: 8, left: 'center',
        textStyle: { fontSize: 11, color: C.muted },
        itemWidth: 12, itemHeight: 12, itemGap: 16,
      },
      series: [{
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['50%', '42%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 3 },
        label: {
          show: true,
          formatter: '{d}%',
          fontSize: 13,
          fontWeight: 600,
          color: C.dark,
          distanceToLabelLine: 4,
          minMargin: 8,
        },
        labelLine: { length: 16, length2: 12 },
        data: items.map((it, i) => ({ ...it, itemStyle: { color: colors[i] } })),
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.15)' },
        },
      }],
      ...(total > 0 ? {
        graphic: [{
          type: 'text',
          left: 'center', top: '37%',
          style: { text: `${total}`, fontSize: 22, fontWeight: 700, fill: C.dark, textAlign: 'center' },
        }, {
          type: 'text',
          left: 'center', top: '45%',
          style: { text: 'Total', fontSize: 11, fill: C.muted, textAlign: 'center' },
        }] as any,
      } : {}),
    };
  }

  private buildChartAsistenciaEC(): void {
    if (!this.dashboard) return;
    const data = [...this.dashboard.asistenciaPorEC];
    data.sort((a, b) => this.ordenECAsc ? a.porcentajeAsistencia - b.porcentajeAsistencia : b.porcentajeAsistencia - a.porcentajeAsistencia);

    const promedio = data.length > 0
      ? Math.round(data.reduce((s, d) => s + d.porcentajeAsistencia, 0) / data.length * 10) / 10 : 0;

    // Agregar barra de promedio general (como en inasistencias)
    const labels = [...data.map(d => d.nombreEC), 'Promedio'];
    const values = [...data.map(d => d.porcentajeAsistencia), promedio];

    const blueScale = ['#1b3a5c', '#1f4e79', '#2968a0', '#3580b8', '#4a97cc', '#6aadda', '#8ac2e6', '#a8d5f0', '#c2e3f7', '#daf0fc'];
    const barData = values.map((v, i) => {
      const isPromedio = i === values.length - 1;
      const colorIdx = Math.round(i / Math.max(values.length - 2, 1) * (blueScale.length - 1));
      return {
        value: v,
        itemStyle: {
          color: isPromedio ? C.muted : blueScale[Math.min(colorIdx, blueScale.length - 1)],
          borderRadius: [0, 4, 4, 0],
        },
      };
    });

    const MAX_VISIBLE = 6;

    this.chartAsistenciaEC = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          return `<b>${p.name}</b><br/>Asistencia: ${p.value}%`;
        },
      },
      grid: { left: '180px', right: '30px', top: '10px', bottom: '10px', containLabel: false },
      xAxis: {
        type: 'value', max: 100,
        axisLabel: { formatter: '{value}%', color: C.muted, fontSize: 11 },
        splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } },
      },
      yAxis: {
        type: 'category',
        data: labels,
        axisLabel: {
          fontSize: 12,
          color: ((value: string | number | undefined) => value === 'Promedio' ? C.muted : C.dark) as any,
          fontStyle: ((value: string | number | undefined) => value === 'Promedio' ? 'italic' : 'normal') as any,
          width: 160, overflow: 'truncate',
        },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      dataZoom: [{
        type: 'inside', yAxisIndex: 0,
        startValue: 0, endValue: MAX_VISIBLE - 1,
        zoomOnMouseWheel: false,
        moveOnMouseWheel: true,
        moveOnMouseMove: false,
      }],
      series: [{
        type: 'bar',
        data: barData,
        barMaxWidth: 22,
        label: {
          show: true,
          position: 'right',
          fontSize: 11,
          fontWeight: 600,
          color: C.dark,
          formatter: '{c}%',
        },
        emphasis: {
          label: {
            show: true,
            position: 'right',
            fontSize: 12,
            fontWeight: 600,
            color: C.dark,
            formatter: '{c}%',
          },
        },
      }],
    };
  }

  private buildChartDistribucionEC(): void {
    if (!this.dashboard) return;
    const dist = this.dashboard.distribucionInasistenciasEC;
    const total = dist.ausencias + dist.llegadasTarde + dist.retirosAnticipados;

    this.chartDistribucionEC = {
      tooltip: {
        trigger: 'item',
        formatter: (p: any) => `<b>${p.name}</b><br/>${p.value} (${p.percent}%)`,
      },
      legend: {
        bottom: 8, left: 'center',
        textStyle: { fontSize: 12, color: C.muted },
        itemWidth: 12, itemHeight: 12, itemGap: 20,
      },
      series: [{
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 3 },
        label: {
          show: true,
          formatter: '{d}%',
          fontSize: 13,
          fontWeight: 600,
          color: C.dark,
          distanceToLabelLine: 4,
          minMargin: 8,
        },
        labelLine: { length: 16, length2: 12 },
        data: [
          { value: dist.ausencias, name: 'Ausencias', itemStyle: { color: '#1b3a5c' } },
          { value: dist.llegadasTarde, name: 'Llegadas Tarde', itemStyle: { color: '#4a97cc' } },
          { value: dist.retirosAnticipados, name: 'Retiros Anticipados', itemStyle: { color: '#a8d5f0' } },
        ],
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.15)' },
        },
      }],
      ...(total > 0 ? {
        graphic: [{
          type: 'text',
          left: 'center', top: '40%',
          style: { text: `${total}`, fontSize: 22, fontWeight: 700, fill: C.dark, textAlign: 'center' },
        }, {
          type: 'text',
          left: 'center', top: '48%',
          style: { text: 'Total', fontSize: 11, fill: C.muted, textAlign: 'center' },
        }] as any,
      } : {}),
    };
  }

  // ── Helpers de exportación ─────────────────────────────────────────────────

  /** Tamaños fijos de renderización (px) para que los charts siempre tengan las mismas proporciones en el PDF */
  private readonly EXPORT_SIZES: Record<string, { w: number; h: number }> = {
    inasistenciasCurso: { w: 800, h: 400 },
    distribucion:       { w: 500, h: 500 },
    tendencia:          { w: 800, h: 400 },
    subtipos:           { w: 500, h: 500 },
    asistenciaEC:       { w: 800, h: 400 },
    distribucionEC:     { w: 500, h: 500 },
  };

  private readonly PDF_BAR_VISIBLE = 12;
  /** Altura por barra (px) que replica el espaciado visual de la web */
  private readonly BAR_SLOT_PX = 36;

  private captureChart(key: string): { dataUrl: string; aspectRatio: number } | null {
    const inst = this.chartInstances[key];
    // Si el gráfico quedó oculto por un filtro (ej: sin datos en el período), su instancia
    // previa fue destruida por Angular pero la referencia queda guardada.
    if (!inst || (typeof inst.isDisposed === 'function' && inst.isDisposed())) return null;

    const baseSize = this.EXPORT_SIZES[key] ?? { w: 600, h: 400 };
    const origW = inst.getWidth();
    const origH = inst.getHeight();

    const option = inst.getOption() as any;
    const hasDataZoom = Array.isArray(option?.dataZoom) && option.dataZoom.length > 0;
    const numBars: number = (option?.series?.[0]?.data as unknown[])?.length ?? 0;

    let pdfStart = 0;
    let pdfEnd = Math.min(numBars - 1, this.PDF_BAR_VISIBLE - 1);
    let origDzStart = 0;
    let origDzEnd = 5;

    if (hasDataZoom && numBars > 0) {
      const dz = option.dataZoom[0];

      // Leer estado actual del dataZoom (puede ser absoluto o porcentual tras scroll del usuario)
      origDzStart = dz.startValue !== undefined
        ? Math.round(dz.startValue)
        : Math.round(((dz.start ?? 0) / 100) * (numBars - 1));
      origDzEnd = dz.endValue !== undefined
        ? Math.round(dz.endValue)
        : Math.round(((dz.end ?? 100) / 100) * (numBars - 1));

      // PDF: 12 barras terminando en el endValue actual; si faltan "hacia abajo" compensar "hacia arriba"
      pdfStart = Math.max(0, origDzEnd - this.PDF_BAR_VISIBLE + 1);
      pdfEnd   = Math.min(numBars - 1, pdfStart + this.PDF_BAR_VISIBLE - 1);
    }

    // Altura fija para exactamente PDF_BAR_VISIBLE barras
    const exportH = hasDataZoom ? this.PDF_BAR_VISIBLE * this.BAR_SLOT_PX : baseSize.h;

    inst.resize({ width: baseSize.w, height: exportH });

    if (hasDataZoom) {
      inst.dispatchAction({ type: 'dataZoom', dataZoomIndex: 0, startValue: pdfStart, endValue: pdfEnd });
    }

    const dataUrl = inst.getDataURL({ type: 'png', pixelRatio: 3 });

    // Restaurar estado original del dataZoom y tamaño
    if (hasDataZoom) {
      inst.dispatchAction({ type: 'dataZoom', dataZoomIndex: 0, startValue: origDzStart, endValue: origDzEnd });
    }
    inst.resize({ width: origW, height: origH });

    return { dataUrl, aspectRatio: baseSize.w / exportH };
  }

  abrirFullscreen(options: EChartsOption, titulo: string): void {
    this.dialog.open(ChartFullscreenDialogComponent, {
      data: { options, titulo },
      width: '92vw',
      maxWidth: '92vw',
      height: '88vh',
    });
  }

  async exportarPdfGeneral(): Promise<void> {
    if (!this.dashboard) return;
    this.exportandoPdfGeneral = true;
    try {
      const charts: { titulo: string; dataUrl: string; aspectRatio?: number }[] = [];
      const chartKeys: { key: string; titulo: string }[] = [
        { key: 'inasistenciasCurso', titulo: 'Promedio de Inasistencias por Curso' },
        { key: 'distribucion', titulo: 'Distribución Porcentual de Inasistencias' },
        { key: 'tendencia', titulo: 'Evolución de Tendencia de Inasistencia' },
        { key: 'subtipos', titulo: this.tituloSubtipos },
      ];
      for (const ck of chartKeys) {
        try {
          const result = this.captureChart(ck.key);
          if (result) {
            charts.push({ titulo: ck.titulo, dataUrl: result.dataUrl, aspectRatio: result.aspectRatio });
          }
        } catch {
          // Gráfico no disponible para este filtro (ej: sin datos en el período) — se omite del PDF
        }
      }

      const turnoLabel = this.turno === 'TARDE' ? ' (Turno Tarde)' : '';
      const data: DashboardPdfData = {
        titulo: `Dashboard Estratégico - General${turnoLabel}`,
        subtitulo: `Año lectivo: ${this.anioLectivo}`,
        nombreArchivo: `dashboard-general-${this.anioLectivo}.pdf`,
        filtrosAplicados: this.buildFiltrosTexto(),
        kpis: this.cardsGeneral.map(kpi => ({
          label: kpi.label,
          valor: `${kpi.format === '1.0-0' ? Math.round(this.val(kpi.key)) : this.val(kpi.key).toFixed(1)}${kpi.suffix}`,
        })),
        charts,
      };
      await this.pdfService.exportarDashboardGeneralPdf(data);
    } finally {
      this.exportandoPdfGeneral = false;
    }
  }

  async exportarPdfEC(): Promise<void> {
    if (!this.dashboard) return;
    this.exportandoPdfEC = true;
    try {
      const charts: { titulo: string; dataUrl: string; aspectRatio?: number }[] = [];
      const chartKeys: { key: string; titulo: string }[] = [
        { key: 'asistenciaEC', titulo: 'Porcentaje de Asistencia por Espacio Curricular' },
        { key: 'distribucionEC', titulo: 'Distribución de Inasistencias por EC' },
      ];
      for (const ck of chartKeys) {
        try {
          const result = this.captureChart(ck.key);
          if (result) {
            charts.push({ titulo: ck.titulo, dataUrl: result.dataUrl, aspectRatio: result.aspectRatio });
          }
        } catch {
          // Gráfico no disponible para este filtro (ej: sin datos en el período) — se omite del PDF
        }
      }

      const data: DashboardPdfData = {
        titulo: 'Dashboard Estratégico - Espacios Curriculares',
        subtitulo: `Año lectivo: ${this.anioLectivo}`,
        nombreArchivo: `dashboard-ec-${this.anioLectivo}.pdf`,
        filtrosAplicados: this.buildFiltrosTexto(),
        layout: 'ec',
        kpis: this.cardsEC.map(kpi => ({
          label: kpi.label,
          valor: `${kpi.format === '1.0-0' ? Math.round(this.val(kpi.key)) : this.val(kpi.key).toFixed(1)}${kpi.suffix}`,
        })),
        charts,
      };
      await this.pdfService.exportarDashboardGeneralPdf(data);
    } finally {
      this.exportandoPdfEC = false;
    }
  }

  private buildFiltrosTexto(): string {
    const partes: string[] = [];
    if (this.fechaDesde || this.fechaHasta) {
      const desde = this.fechaDesde ? this.fmtDateDisplay(this.fechaDesde) : '—';
      const hasta = this.fechaHasta ? this.fmtDateDisplay(this.fechaHasta) : '—';
      partes.push(`Período: ${desde} al ${hasta}`);
    }
    const cursosRealesPdf = this.cursoIds.filter(v => v !== '__todos__');
    if (cursosRealesPdf.length > 0) {
      const labels = this.cursos
        .filter(c => cursosRealesPdf.includes(c.id))
        .map(c => c.label);
      if (labels.length > 0) partes.push(`Cursos: ${labels.join(', ')}`);
    }
    if (this.turno === 'TARDE') partes.push('Turno: Tarde');
    return partes.length > 0 ? partes.join(' · ') : 'Sin filtros adicionales';
  }

  private fmtDateDisplay(d: Date): string {
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  private fmtDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
