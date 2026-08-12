import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, forkJoin, of, switchMap } from 'rxjs';
import { NgxEchartsDirective } from 'ngx-echarts';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MisEspaciosCurricularesService } from '../../services/mis-espacios-curriculares.service';
import { MisEcItem } from '../../models/mis-ec.model';
import { ChartFullscreenDialogComponent } from '../../../reportes-estrategicos/components/chart-fullscreen-dialog/chart-fullscreen-dialog.component';
import { PlanificacionService } from '../../services/planificacion.service';
import { ArbolPlanificacionDto, UnidadArbolDto } from '../../models/planificacion.model';
import { EvaluacionesService } from '../../services/evaluaciones.service';
import { CalificacionesService } from '../../services/calificaciones.service';
import { CalificacionVigente, InstanciaEvaluativaResumen, GestionManualEstudiante } from '../../models/calificaciones.model';

const COLORS = { aprob: '#1f4e87', recup: '#7ba9d6', desapTema: '#f0a35e', desap: '#e23744' };
// Escala de azules para distribución de estados (claro = mejor, oscuro = peor)
const ESTADO_COLORS = { aprob: '#9cc1e3', recup: '#5b8bc4', desapTema: '#3f78b5', desap: '#11365b' };
// Histograma de calificaciones: oscuro = desaprobado (<7), claro = aprobado (>=7)
const NOTA_BAJA = '#11365b';
const NOTA_BUENA = '#9cc1e3';
const FONT = 'Inter, -apple-system, "Segoe UI", Roboto, sans-serif';

interface ExamenFinal {
  idIE: string;
  idEstudiante: string;
  nro: number;
  puntajeFinal: number;
  tieneRecuperatorio: boolean;
}

interface DistribucionEstados {
  aprobados: number;
  aprobConRecup: number;
  desapTema: number;
  desaprobados: number;
}

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

@Component({
  selector: 'app-mis-ec-reportes',
  standalone: true,
  imports: [
    CommonModule,
    NgxEchartsDirective,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  templateUrl: './mis-ec-reportes.component.html',
  styleUrl: './mis-ec-reportes.component.scss',
})
export class MisEcReportesComponent implements OnInit {
  loading = true;
  error = false;
  idEC = '';
  espacio: MisEcItem | null = null;
  hayDatos = false;

  activeTab: 'notas' | 'eval' | 'programa' = 'notas';
  showModal = false;

  // Pestaña Notas / Evaluaciones (datos reales)
  loadingNotas = true;
  alumnosCount = 0;
  recuperatoriosRealizados = 0;
  promedioRecuperatorios = '0.00';
  alumnosRiesgo: { nombre: string; promedio: number }[] = [];
  private histPorInstancia: Record<string, number[]> = {};
  private histTodas: number[] = new Array(10).fill(0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  optionPie: any = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  optionBarEstado: any = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  optionBarComp: any = {};

  // Pestaña Programa
  arbolPrograma: ArbolPlanificacionDto | null = null;
  loadingPrograma = false;
  errorPrograma = '';
  programaCargado = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  optionDonutAvance: any = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  optionDonutEval: any = {};
  evaluadosIdSet = new Set<string>();
  gestionCargada = false;
  private evalPorUnidadId = new Map<string, { evaluados: number; total: number }>();

  kpiPromedio = '';
  kpiModa = 0;
  kpiDesv = '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  histOptions: any = {};

  readonly instancias = [1, 2, 3, 4, 5, 6, 7, 8];

  constructor(
    private service: MisEspaciosCurricularesService,
    private planificacionService: PlanificacionService,
    private evaluacionesService: EvaluacionesService,
    private calificacionesService: CalificacionesService,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.idEC = this.route.snapshot.paramMap.get('idEC') ?? '';
    this.service.getEspacioCurricularPorId(this.idEC).pipe(
      catchError(() => {
        this.error = true;
        this.loading = false;
        return of(null);
      }),
    ).subscribe(espacio => {
      this.espacio = espacio;
      if (!this.espacio && !this.error) this.error = true;
      this.loading = false;
      if (this.espacio) this.cargarNotasYEvaluaciones();
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

  private cargarNotasYEvaluaciones(): void {
    this.loadingNotas = true;

    forkJoin({
      instancias: this.calificacionesService.getInstancias(this.idEC).pipe(catchError(() => of([]))),
      estudiantes: this.calificacionesService.getEstudiantes(this.idEC).pipe(catchError(() => of([]))),
      calificaciones: this.calificacionesService.getCalificacionesVigentes(this.idEC).pipe(catchError(() => of([]))),
    }).subscribe(({ instancias, estudiantes, calificaciones }) => {
      this.alumnosCount = estudiantes.length;

      const examenes = this.construirExamenesFinales(instancias, calificaciones);
      this.hayDatos = examenes.length > 0;

      this.histPorInstancia = this.buildHistPorInstancia(examenes);
      this.applyHistFilter('todas');

      const distribucion = this.buildDistribucion(examenes);
      this.optionPie = this.buildOptionPie(distribucion);
      this.optionBarEstado = this.buildOptionBarEstado(distribucion);
      this.optionBarComp = this.buildOptionBarComp(calificaciones, instancias);

      this.alumnosRiesgo = this.buildAlumnosRiesgo(examenes, estudiantes);

      const recuperatorios = calificaciones.filter(c =>
        (c.tipoCalificacion === 'R1' || c.tipoCalificacion === 'R2') && c.puntaje !== null);
      this.recuperatoriosRealizados = recuperatorios.length;
      this.promedioRecuperatorios = recuperatorios.length > 0
        ? (recuperatorios.reduce((a, c) => a + (c.puntaje ?? 0), 0) / recuperatorios.length).toFixed(2)
        : '0.00';

      this.loadingNotas = false;
    });
  }

  private construirExamenesFinales(
    instancias: InstanciaEvaluativaResumen[],
    calificaciones: CalificacionVigente[],
  ): ExamenFinal[] {
    const nroPorIE = new Map(instancias.map(i => [i.idIE, i.nro]));
    const porExamen = new Map<string, CalificacionVigente[]>();

    for (const c of calificaciones) {
      if (c.puntaje === null) continue;
      const key = `${c.idIE}|${c.idEstudiante}`;
      const arr = porExamen.get(key) ?? [];
      arr.push(c);
      porExamen.set(key, arr);
    }

    const resultado: ExamenFinal[] = [];
    for (const [key, califs] of porExamen) {
      const [idIE, idEstudiante] = key.split('|');
      const nro = nroPorIE.get(idIE);
      if (!nro) continue;

      const rec2 = califs.find(c => c.tipoCalificacion === 'R2');
      const rec1 = califs.find(c => c.tipoCalificacion === 'R1');
      // Igual criterio que la libreta de calificaciones: se toma la mejor nota entre N/R1/R2, no la vigente.
      const mejor = califs.reduce((a, b) => (b.puntaje! > a.puntaje! ? b : a));

      resultado.push({
        idIE,
        idEstudiante,
        nro,
        puntajeFinal: mejor.puntaje!,
        tieneRecuperatorio: !!rec1 || !!rec2,
      });
    }

    return resultado;
  }

  private buildHistPorInstancia(examenes: ExamenFinal[]): Record<string, number[]> {
    const hist: Record<string, number[]> = {};
    for (let n = 1; n <= 8; n++) hist[String(n)] = new Array(10).fill(0);

    for (const e of examenes) {
      const idx = Math.min(Math.max(Math.round(e.puntajeFinal), 1), 10) - 1;
      hist[String(e.nro)][idx]++;
    }

    this.histTodas = Object.values(hist)
      .reduce((acc: number[], h: number[]) => acc.map((v, i) => v + h[i]), new Array(10).fill(0) as number[]);

    return hist;
  }

  private buildDistribucion(examenes: ExamenFinal[]): DistribucionEstados {
    const d: DistribucionEstados = { aprobados: 0, aprobConRecup: 0, desapTema: 0, desaprobados: 0 };

    const porEstudiante = new Map<string, ExamenFinal[]>();
    for (const e of examenes) {
      const arr = porEstudiante.get(e.idEstudiante) ?? [];
      arr.push(e);
      porEstudiante.set(e.idEstudiante, arr);
    }

    // Estado por alumno según su PROMEDIO (no por examen suelto): igual criterio que la libreta de calificaciones.
    for (const instancias of porEstudiante.values()) {
      const promedio = instancias.reduce((s, e) => s + e.puntajeFinal, 0) / instancias.length;
      const algunaFallo = instancias.some(e => e.puntajeFinal < 7);
      const algunaRecuperada = instancias.some(e => e.tieneRecuperatorio);

      if (promedio < 7) {
        d.desaprobados++;
      } else if (algunaFallo) {
        d.desapTema++;
      } else if (algunaRecuperada) {
        d.aprobConRecup++;
      } else {
        d.aprobados++;
      }
    }

    return d;
  }

  private buildAlumnosRiesgo(
    examenes: ExamenFinal[],
    estudiantes: GestionManualEstudiante[],
  ): { nombre: string; promedio: number }[] {
    const porEstudiante = new Map<string, number[]>();
    for (const e of examenes) {
      const arr = porEstudiante.get(e.idEstudiante) ?? [];
      arr.push(e.puntajeFinal);
      porEstudiante.set(e.idEstudiante, arr);
    }

    const nombrePorId = new Map(estudiantes.map(e => [e.idEstudiante, `${e.apellido}, ${e.nombre}`]));
    const riesgo: { nombre: string; promedio: number }[] = [];

    for (const [idEst, notas] of porEstudiante) {
      const promedio = notas.reduce((a, b) => a + b, 0) / notas.length;
      if (promedio < 7) {
        riesgo.push({ nombre: nombrePorId.get(idEst) ?? 'Estudiante', promedio: +promedio.toFixed(2) });
      }
    }

    return riesgo.sort((a, b) => a.promedio - b.promedio);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private buildOptionPie(d: DistribucionEstados): any {
    return {
      textStyle: { fontFamily: FONT },
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)', confine: true },
      legend: { bottom: 8, icon: 'circle', itemWidth: 9, itemHeight: 9, textStyle: { fontSize: 12, color: '#64748b' } },
      series: [{
        type: 'pie', radius: ['46%', '72%'], center: ['50%', '44%'],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: '#fff', borderWidth: 2 },
        label: { show: true, formatter: '{d}%', fontSize: 11, color: '#475569' },
        labelLine: { length: 8, length2: 8 },
        data: [
          { value: d.aprobados,     name: 'Aprobados',        itemStyle: { color: ESTADO_COLORS.aprob } },
          { value: d.aprobConRecup, name: 'Aprob. con Recup.', itemStyle: { color: ESTADO_COLORS.recup } },
          { value: d.desapTema,     name: 'Desap. por Tema',  itemStyle: { color: ESTADO_COLORS.desapTema } },
          { value: d.desaprobados,  name: 'Desaprobados',     itemStyle: { color: ESTADO_COLORS.desap } },
        ],
      }],
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private buildOptionBarEstado(d: DistribucionEstados): any {
    const total = d.aprobados + d.aprobConRecup + d.desapTema + d.desaprobados;
    const pct = (n: number) => total > 0 ? Math.round((n / total) * 1000) / 10 : 0;

    return {
      textStyle: { fontFamily: FONT },
      grid: { left: 12, right: 52, top: 10, bottom: 12, containLabel: true },
      tooltip: { trigger: 'axis', valueFormatter: (v: number | string) => `${v}%`, confine: true },
      xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%', color: '#94a3b8' }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
      yAxis: { type: 'category', data: ['Aprobados', 'Aprob. con Recup.', 'Desap. por Tema', 'Desaprobados'], inverse: true, axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: '#475569', fontSize: 12 } },
      series: [{
        type: 'bar', barWidth: 14,
        itemStyle: { borderRadius: [0, 7, 7, 0] },
        label: { show: true, position: 'right', formatter: '{c}%', color: '#64748b', fontSize: 11 },
        data: [
          { value: pct(d.aprobados),     itemStyle: { color: ESTADO_COLORS.aprob } },
          { value: pct(d.aprobConRecup), itemStyle: { color: ESTADO_COLORS.recup } },
          { value: pct(d.desapTema),     itemStyle: { color: ESTADO_COLORS.desapTema } },
          { value: pct(d.desaprobados),  itemStyle: { color: ESTADO_COLORS.desap } },
        ],
      }],
    };
  }

  private buildOptionBarComp(
    calificaciones: CalificacionVigente[],
    instancias: InstanciaEvaluativaResumen[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): any {
    const nroPorIE = new Map(instancias.map(i => [i.idIE, i.nro]));
    const r1PorNro = new Array(8).fill(0);
    const r2PorNro = new Array(8).fill(0);

    for (const c of calificaciones) {
      if (c.puntaje === null) continue;
      const nro = nroPorIE.get(c.idIE);
      if (!nro) continue;
      if (c.tipoCalificacion === 'R1') r1PorNro[nro - 1]++;
      else if (c.tipoCalificacion === 'R2') r2PorNro[nro - 1]++;
    }

    return {
      textStyle: { fontFamily: FONT },
      grid: { left: 12, right: 16, top: 32, bottom: 14, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, confine: true },
      legend: { top: 0, icon: 'circle', itemWidth: 9, itemHeight: 9, itemGap: 14, textStyle: { fontSize: 11, color: '#64748b' } },
      xAxis: { type: 'category', data: ['1','2','3','4','5','6','7','8'], axisTick: { show: false }, axisLine: { lineStyle: { color: '#e2e8f0' } }, axisLabel: { color: '#64748b', fontSize: 11 } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f1f5f9' } }, axisLabel: { color: '#94a3b8' } },
      series: [
        { name: 'R1', type: 'bar', stack: 'rec', barWidth: '55%', itemStyle: { color: COLORS.aprob }, data: r1PorNro },
        { name: 'R2', type: 'bar', stack: 'rec', itemStyle: { color: COLORS.recup, borderRadius: [4,4,0,0] }, data: r2PorNro },
      ],
    };
  }

  applyHistFilter(key: string): void {
    const hist = key === 'todas' ? this.histTodas : (this.histPorInstancia[key] ?? this.histTodas);
    const s = estadisticas(hist);
    this.kpiPromedio = s.promedio.toFixed(2);
    this.kpiModa = s.moda;
    this.kpiDesv = s.desvio.toFixed(2);
    this.histOptions = {
      textStyle: { fontFamily: FONT },
      grid: { left: 12, right: 16, top: 22, bottom: 12, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (v: number | string) => `${v} calificaciones`,
        confine: true,
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
        data: hist.map((v, i) => ({ value: v, itemStyle: { color: i + 1 < 7 ? NOTA_BAJA : NOTA_BUENA } })),
      }],
    };
  }

  onFiltroChange(event: Event): void {
    this.applyHistFilter((event.target as HTMLSelectElement).value);
  }

  setTab(tab: 'notas' | 'eval' | 'programa'): void {
    this.activeTab = tab;
    if (tab === 'programa' && !this.programaCargado) {
      this.cargarPrograma();
    }
  }

  private cargarPrograma(): void {
    this.loadingPrograma = true;
    this.errorPrograma = '';

    this.planificacionService.getArbol(this.idEC).pipe(
      switchMap(arbol => {
        this.arbolPrograma = arbol;
        this.programaCargado = true;
        this.loadingPrograma = false;

        if (!arbol.sinPrograma && !arbol.bloqueado) {
          this.buildDonutAvance(arbol);
        }

        return this.evaluacionesService.getGestion(this.idEC).pipe(
          catchError(() => of(null)),
        );
      }),
      catchError(() => {
        this.errorPrograma = 'No se pudo cargar el programa. Verificá tu conexión e intentá de nuevo.';
        this.loadingPrograma = false;
        return of(null);
      }),
    ).subscribe(gestion => {
      const evaluados = new Set<string>();

      if (gestion) {
        for (const inst of gestion.instancias) {
          if ((inst.estadoGeneralIe ?? inst.estado) === 'Evaluada' && inst.notaOriginal) {
            inst.notaOriginal.idBloquesTema.forEach(id => evaluados.add(id));
          }
        }
      }

      this.evaluadosIdSet = evaluados;

      const evalMap = new Map<string, { evaluados: number; total: number }>();
      if (gestion) {
        for (const gu of gestion.unidades) {
          const total = gu.temas.length;
          const ev = gu.temas.filter(t => evaluados.has(t.idBloquePrograma)).length;
          evalMap.set(gu.idUnidad, { evaluados: ev, total });
        }
      }
      this.evalPorUnidadId = evalMap;
      this.gestionCargada = true;

      if (this.arbolPrograma && !this.arbolPrograma.sinPrograma && !this.arbolPrograma.bloqueado) {
        this.buildDonutEval();
      }
    });
  }

  private buildDonutAvance(arbol: ArbolPlanificacionDto): void {
    const dictados = arbol.temasCompletos;
    const pendientes = arbol.totalTemas - arbol.temasCompletos;
    const pct = Math.round(arbol.avance);
    this.optionDonutAvance = {
      textStyle: { fontFamily: FONT },
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)', confine: true },
      legend: { bottom: 8, icon: 'circle', itemWidth: 9, itemHeight: 9, textStyle: { fontSize: 12, color: '#64748b' }, selectedMode: false },
      graphic: [
        { type: 'text', left: 'center', top: '34%',
          style: { text: `${pct}%`, fontSize: 22, fontWeight: 700, fill: '#1f4e87', textAlign: 'center' } },
        { type: 'text', left: 'center', top: '43%',
          style: { text: `${dictados} / ${arbol.totalTemas} dictados`, fontSize: 11, fill: '#94a3b8', textAlign: 'center' } },
      ] as any,
      series: [{
        type: 'pie', radius: ['58%', '78%'], center: ['50%', '42%'],
        avoidLabelOverlap: false, label: { show: false },
        itemStyle: { borderColor: '#fff', borderWidth: 2 },
        data: [
          { value: dictados,   name: 'Temas dictados',   itemStyle: { color: '#1f4e87' } },
          { value: pendientes, name: 'Temas sin dictar', itemStyle: { color: '#e2e8f0' } },
        ],
      }],
    };
  }

  private buildDonutEval(): void {
    let total = 0, evaluados = 0;
    for (const v of this.evalPorUnidadId.values()) {
      total += v.total;
      evaluados += v.evaluados;
    }
    const sinEval = total - evaluados;
    const pct = total === 0 ? 0 : Math.round(evaluados / total * 100);
    this.optionDonutEval = {
      textStyle: { fontFamily: FONT },
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)', confine: true },
      legend: { bottom: 8, icon: 'circle', itemWidth: 9, itemHeight: 9, textStyle: { fontSize: 12, color: '#64748b' }, selectedMode: false },
      graphic: [
        { type: 'text', left: 'center', top: '34%',
          style: { text: `${pct}%`, fontSize: 22, fontWeight: 700, fill: '#1f4e87', textAlign: 'center' } },
        { type: 'text', left: 'center', top: '43%',
          style: { text: `${evaluados} / ${total} evaluados`, fontSize: 11, fill: '#94a3b8', textAlign: 'center' } },
      ] as any,
      series: [{
        type: 'pie', radius: ['58%', '78%'], center: ['50%', '42%'],
        avoidLabelOverlap: false, label: { show: false },
        itemStyle: { borderColor: '#fff', borderWidth: 2 },
        data: [
          { value: evaluados, name: 'Temas evaluados',   itemStyle: { color: '#7ba9d6' } },
          { value: sinEval,   name: 'Temas sin evaluar', itemStyle: { color: '#e2e8f0' } },
        ],
      }],
    };
  }

  dictadosUnidad(u: UnidadArbolDto): { dictados: number; total: number } {
    return { dictados: u.temas.filter(t => t.estado === 'Dado').length, total: u.temas.length };
  }

  dictadosPct(u: UnidadArbolDto): number {
    const n = u.temas.length;
    return n === 0 ? 0 : Math.round(u.temas.filter(t => t.estado === 'Dado').length / n * 100);
  }

  evalUnidad(u: UnidadArbolDto): { evaluados: number; total: number } {
    return this.evalPorUnidadId.get(u.idUnidad) ?? { evaluados: 0, total: 0 };
  }

  evaluadosPct(u: UnidadArbolDto): number {
    const ev = this.evalUnidad(u);
    return ev.total === 0 ? 0 : Math.round(ev.evaluados / ev.total * 100);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abrirFullscreen(options: any, titulo: string): void {
    this.dialog.open(ChartFullscreenDialogComponent, {
      data: { options, titulo },
      width: '92vw',
      maxWidth: '92vw',
      height: '88vh',
    });
  }

  volverAlDetalle(): void {
    this.router.navigate(['/mis-espacios-curriculares', this.idEC]);
  }

  volverAlListado(): void {
    this.router.navigate(['/mis-espacios-curriculares']);
  }
}
