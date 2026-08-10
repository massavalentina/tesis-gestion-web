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
  // % de alumnos con promedio < 7 en esta materia, sobre el total de
  // alumnos evaluados en ella (nivel alumno, no tema individual).
  tasaDesaprobacion: number;
}

export interface EcPromedio {
  nombre: string;
  promedio: number;
}

export interface CursoTasaDesaprobacion {
  curso: string;
  // Promedio simple de las tasas (por alumno) de las materias que dicta
  // este curso — cada materia pesa igual.
  tasaDesaprobacion: number;
}

export interface DistribucionEstados {
  // Calculado por alumno + materia (EC): se promedian las notas de instancia
  // (máximo entre original y recuperatorios) de ese alumno en esa EC.
  // Tres estados mutuamente excluyentes, NO es aprobado salvo el primero:
  // Aprobado = promedio >= 7 y ninguna instancia individual < 7
  // DesaprobadoPorTema = promedio >= 7 pero al menos una instancia individual < 7
  //   (el promedio da bien, pero el alumno NO está aprobado: desaprobó un tema)
  // Desaprobado = promedio < 7
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
