import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { NgxEchartsDirective } from 'ngx-echarts';
import { MisEspaciosCurricularesService } from '../../services/mis-espacios-curriculares.service';
import { MisEcItem } from '../../models/mis-ec.model';

const ESPACIO_DEMO = '6°B Teatro';

const COLORS = { aprob: '#1f4e87', recup: '#7ba9d6', desapTema: '#f0a35e', desap: '#e23744' };
const FONT = 'Inter, -apple-system, "Segoe UI", Roboto, sans-serif';

// All demo data isolated here — swap for a service call when backend is ready
const DEMO_DATA = {
  alumnos: 30,
  recuperatoriosRealizados: 158,
  promedioRecuperatorios: 5.27,
  evaluacionesBase: 240,
  alumnosRiesgo: [
    { nombre: 'Díaz, Tomás',      promedio: 4.80 },
    { nombre: 'Pérez, Mora',      promedio: 5.90 },
    { nombre: 'Rojas, Valentina', promedio: 6.20 },
    { nombre: 'Gómez, Lucas',     promedio: 6.40 },
    { nombre: 'Acosta, Mía',      promedio: 6.75 },
  ] as { nombre: string; promedio: number }[],
  histPorInstancia: {
    '1': [0,0,0,1,1,2,5,9,8,4],
    '2': [0,0,0,0,1,2,5,8,9,5],
    '3': [0,0,1,1,1,2,6,9,7,3],
    '4': [0,0,0,0,1,1,4,9,10,5],
    '5': [0,0,0,1,1,2,5,9,8,4],
    '6': [0,0,0,0,1,1,5,8,10,5],
    '7': [0,0,1,1,1,2,6,8,8,3],
    '8': [0,0,0,1,1,2,5,9,8,4],
  } as Record<string, number[]>,
};

const HIST_TODAS: number[] = Object.values(DEMO_DATA.histPorInstancia)
  .reduce((acc: number[], h: number[]) => acc.map((v, i) => v + h[i]), new Array(10).fill(0) as number[]);

function estadisticas(hist: number[]): { promedio: number; desvio: number; moda: number } {
  const arr: number[] = [];
  hist.forEach((c, i) => { for (let k = 0; k < c; k++) arr.push(i + 1); });
  const n = arr.length || 1;
  const promedio = arr.reduce((a, b) => a + b, 0) / n;
  const varianza = arr.reduce((a, b) => a + (b - promedio) ** 2, 0) / n;
  let maxC = -1, moda = 0;
  hist.forEach((c, i) => { if (c > maxC) { maxC = c; moda = i + 1; } });
  return { promedio, desvio: Math.sqrt(varianza), moda };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const OPTION_PIE: any = {
  textStyle: { fontFamily: FONT },
  tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
  legend: { bottom: 0, icon: 'circle', itemWidth: 9, itemHeight: 9, textStyle: { fontSize: 12, color: '#64748b' } },
  series: [{
    type: 'pie', radius: ['46%', '72%'], center: ['50%', '44%'],
    avoidLabelOverlap: true,
    itemStyle: { borderColor: '#fff', borderWidth: 2 },
    label: { show: true, formatter: '{d}%', fontSize: 11, color: '#475569' },
    labelLine: { length: 8, length2: 8 },
    data: [
      { value: 120, name: 'Aprobados',         itemStyle: { color: COLORS.aprob } },
      { value: 88,  name: 'Aprob. con Recup.', itemStyle: { color: COLORS.recup } },
      { value: 14,  name: 'Desap. por Tema',   itemStyle: { color: COLORS.desapTema } },
      { value: 18,  name: 'Desaprobados',      itemStyle: { color: COLORS.desap } },
    ],
  }],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const OPTION_BAR_ESTADO: any = {
  textStyle: { fontFamily: FONT },
  grid: { left: 0, right: 40, top: 6, bottom: 0, containLabel: true },
  tooltip: { trigger: 'axis', valueFormatter: (v: number | string) => `${v}%` },
  xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%', color: '#94a3b8' }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
  yAxis: { type: 'category', data: ['Aprobados', 'Aprob. con Recup.', 'Desap. por Tema', 'Desaprobados'], inverse: true, axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: '#475569', fontSize: 12 } },
  series: [{
    type: 'bar', barWidth: 14,
    itemStyle: { borderRadius: [0, 7, 7, 0] },
    label: { show: true, position: 'right', formatter: '{c}%', color: '#64748b', fontSize: 11 },
    data: [
      { value: 50.0, itemStyle: { color: COLORS.aprob } },
      { value: 36.7, itemStyle: { color: COLORS.recup } },
      { value: 5.8,  itemStyle: { color: COLORS.desapTema } },
      { value: 7.5,  itemStyle: { color: COLORS.desap } },
    ],
  }],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const OPTION_BAR_COMP: any = {
  textStyle: { fontFamily: FONT },
  grid: { left: 0, right: 8, top: 28, bottom: 6, containLabel: true },
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  legend: { top: 0, icon: 'circle', itemWidth: 9, itemHeight: 9, itemGap: 14, textStyle: { fontSize: 11, color: '#64748b' } },
  xAxis: { type: 'category', data: ['1','2','3','4','5','6','7','8'], name: 'Instancia', nameLocation: 'middle', nameGap: 26, nameTextStyle: { color: '#94a3b8', fontSize: 11 }, axisTick: { show: false }, axisLine: { lineStyle: { color: '#e2e8f0' } }, axisLabel: { color: '#64748b', fontSize: 11 } },
  yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f1f5f9' } }, axisLabel: { color: '#94a3b8' } },
  series: [
    { name: 'R1', type: 'bar', stack: 'rec', barWidth: '55%', itemStyle: { color: COLORS.aprob }, data: [12,10,16,8,13,9,18,17] },
    { name: 'R2', type: 'bar', stack: 'rec', itemStyle: { color: COLORS.recup, borderRadius: [4,4,0,0] }, data: [6,5,8,4,7,5,10,10] },
  ],
};

@Component({
  selector: 'app-mis-ec-reportes',
  standalone: true,
  imports: [CommonModule, NgxEchartsDirective],
  templateUrl: './mis-ec-reportes.component.html',
  styleUrl: './mis-ec-reportes.component.scss',
})
export class MisEcReportesComponent implements OnInit {
  loading = true;
  error = false;
  idEC = '';
  espacio: MisEcItem | null = null;
  hayDatos = false;

  activeTab: 'notas' | 'eval' = 'notas';
  showModal = false;

  kpiPromedio = '';
  kpiModa = 0;
  kpiDesv = '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  histOptions: any = {};

  readonly optionPie = OPTION_PIE;
  readonly optionBarEstado = OPTION_BAR_ESTADO;
  readonly optionBarComp = OPTION_BAR_COMP;
  readonly alumnosRiesgo = [...DEMO_DATA.alumnosRiesgo].sort((a, b) => a.promedio - b.promedio);
  readonly demoData = DEMO_DATA;
  readonly instancias = [1, 2, 3, 4, 5, 6, 7, 8];

  constructor(
    private service: MisEspaciosCurricularesService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.idEC = this.route.snapshot.paramMap.get('idEC') ?? '';
    this.service.getMisEspaciosCurriculares().pipe(
      catchError(() => {
        this.error = true;
        this.loading = false;
        return of([]);
      }),
    ).subscribe(ecs => {
      this.espacio = ecs.find(e => e.idEC === this.idEC) ?? null;
      if (!this.espacio && !this.error) this.error = true;
      this.loading = false;
      const nombre = this.espacio
        ? `${this.espacio.anioNumero}°${this.espacio.division} ${this.espacio.nombreMateria}`
        : '';
      this.hayDatos = nombre === ESPACIO_DEMO;
      if (this.hayDatos) this.applyHistFilter('todas');
    });
  }

  get cursoLabel(): string {
    if (!this.espacio) return '';
    return `${this.espacio.anioNumero}°${this.espacio.division}`;
  }

  get fechaCorte(): string {
    const hoy = new Date();
    const d = hoy.getDate().toString().padStart(2, '0');
    const m = (hoy.getMonth() + 1).toString().padStart(2, '0');
    return `${d}/${m}/${hoy.getFullYear()}`;
  }

  applyHistFilter(key: string): void {
    const hist = key === 'todas' ? HIST_TODAS : (DEMO_DATA.histPorInstancia[key] ?? HIST_TODAS);
    const s = estadisticas(hist);
    this.kpiPromedio = s.promedio.toFixed(2);
    this.kpiModa = s.moda;
    this.kpiDesv = s.desvio.toFixed(2);
    this.histOptions = {
      textStyle: { fontFamily: FONT },
      grid: { left: 0, right: 8, top: 18, bottom: 0, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (v: number | string) => `${v} calificaciones`,
      },
      xAxis: { type: 'category', data: ['1','2','3','4','5','6','7','8','9','10'], axisTick: { show: false }, axisLine: { lineStyle: { color: '#e2e8f0' } }, axisLabel: { color: '#64748b', fontSize: 11 } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f1f5f9' } }, axisLabel: { color: '#94a3b8' } },
      series: [{
        type: 'bar', barWidth: '60%',
        itemStyle: { borderRadius: [4, 4, 0, 0] },
        label: {
          show: true, position: 'top', color: '#64748b', fontSize: 11,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter: (p: any) => (p.value ? String(p.value) : ''),
        },
        data: hist.map((v, i) => ({ value: v, itemStyle: { color: i + 1 < 7 ? COLORS.desap : COLORS.aprob } })),
      }],
    };
  }

  onFiltroChange(event: Event): void {
    this.applyHistFilter((event.target as HTMLSelectElement).value);
  }

  setTab(tab: 'notas' | 'eval'): void {
    this.activeTab = tab;
  }

  volverAlDetalle(): void {
    this.router.navigate(['/mis-espacios-curriculares', this.idEC]);
  }

  volverAlListado(): void {
    this.router.navigate(['/mis-espacios-curriculares']);
  }
}
