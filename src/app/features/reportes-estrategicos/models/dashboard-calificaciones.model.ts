export interface DashboardCalificaciones {
  // ── Real: ya implementado en backend ─────────────────────────────────────
  avanceProgramas: number | null;
  /** Total de archivos IE habilitados (examen original + cada recuperatorio cuenta como examen realizado) */
  examenesRealizados: number;
  porcentajeSinRecuperatorio: number;
  porcentajeConRecuperatorio1: number;
  porcentajeConRecuperatorio2: number;

  // ── Calculados desde calificaciones vigentes ──────────────────────────────
  promedioGeneral: number | null;
  tasaAprobacionGeneral: number;
  alumnosEnRiesgo: number | null;

  // ── Rankings y distribuciones ─────────────────────────────────────────────
  top5EcMayorDesaprobacion: EcDesaprobacion[];
  top5EcMejorPromedio: EcPromedio[];
  top5CursosMayorTasa: CursoTasaDesaprobacion[];
  distribucionEstados: DistribucionEstados;
  tasaAprobacionPorAnio: AnioTasaAprobacion[];
  tasaAprobacionPorCurso: CursoTasaAprobacion[];
}

export interface EcDesaprobacion {
  nombre: string;
  // Tasa = (desaprobados + desap. por tema) / total × 100
  tasaDesaprobacion: number;
}

export interface EcPromedio {
  nombre: string;
  promedio: number;
}

export interface CursoTasaDesaprobacion {
  curso: string;
  tasaDesaprobacion: number;
}

export interface DistribucionEstados {
  // Aprobado = puntaje >= 7
  // DesaprobadoPorTema = 4 ≤ puntaje < 7
  // Desaprobado = puntaje < 4
  aprobado: number;
  desaprobado: number;
  desaprobadoPorTema: number;
}

export interface CursoLabel {
  id: string;
  label: string;
}

export interface AnioTasaAprobacion {
  anio: number;
  tasaAprobacion: number;
}

export interface CursoTasaAprobacion {
  curso: string;
  tasaAprobacion: number;
}
