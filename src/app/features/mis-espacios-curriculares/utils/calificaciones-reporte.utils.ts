import {
  ArchivoIEResumen,
  InstanciaEvaluativaResumen,
  TipoCalificacion,
} from '../models/calificaciones.model';

export type ReporteEstadoFinal = 'aprobado' | 'desaprobado' | 'desaprobado_tema';

export interface ReporteEvaluacionAlumno {
  evaluacionNumero: number;
  n: number | null;
  r1: number | null;
  r2: number | null;
  mejorNota: number | null;
  usoRecuperatorio: boolean;
  apruebaTema: boolean;
  sinNotas: boolean;
  tieneEstructura: boolean;
}

export interface ReporteAlumno {
  idEstudiante: string;
  evaluaciones: Record<number, ReporteEvaluacionAlumno>;
  notaFinal: number | null;
  estadoFinal: ReporteEstadoFinal;
  usoRecuperatorioEnAlguna: boolean;
}

export interface ReporteResumenGlobal {
  promedioPorEvaluacion: Record<number, number | null>;
  promedioFinal: number | null;
  porcentajeRecuperatoriosPorEvaluacion: Record<number, number>;
  porcentajeRecuperatoriosFinal: number;
  porcentajeAprobadasPorEvaluacion: Record<number, number>;
  porcentajeAprobadosFinal: number;
}

export interface ReporteCalificacionesGlobal {
  rowsByStudentId: Record<string, ReporteAlumno>;
  summary: ReporteResumenGlobal;
}

export interface ReporteVariacionCalificacionesSerie {
  idEstudiante: string;
  valoresPorEvaluacion: Record<number, number | null>;
}

export interface ReporteVariacionCalificacionesGlobal {
  seriesByStudentId: Record<string, ReporteVariacionCalificacionesSerie>;
  promedioPorEvaluacion: Record<number, number | null>;
  desviacionPorEvaluacion: Record<number, number | null>;
  bandaInferiorPorEvaluacion: Record<number, number | null>;
  bandaSuperiorPorEvaluacion: Record<number, number | null>;
}

export interface ReporteVariacionTemporalPunto {
  evaluacionNumero: number;
  fecha: string;
  fechaTimestamp: number;
  valor: number;
  tipoOrigen: TipoCalificacion;
  etiqueta: string;
}

export interface ReporteVariacionTemporalSerie {
  idEstudiante: string;
  puntos: ReporteVariacionTemporalPunto[];
}

export interface ReporteVariacionTemporalGlobal {
  seriesByStudentId: Record<string, ReporteVariacionTemporalSerie>;
  promedioPorEvaluacion: Record<number, number | null>;
  desviacionPorEvaluacion: Record<number, number | null>;
  bandaInferiorPorEvaluacion: Record<number, number | null>;
  bandaSuperiorPorEvaluacion: Record<number, number | null>;
  fechaPorEvaluacion: Record<number, string | null>;
  fechaTimestampPorEvaluacion: Record<number, number | null>;
}

interface ReporteStudentLike {
  idEstudiante: string;
}

interface ReporteEvaluacionLike {
  numero: number;
}

const TIPOS: readonly TipoCalificacion[] = ['N', 'R1', 'R2'];

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return roundTo(values.reduce((total, value) => total + value, 0) / values.length, 2);
}

function standardDeviation(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  const mean = values.reduce((total, value) => total + value, 0) / values.length;
  const variance = values.reduce((total, value) => total + ((value - mean) ** 2), 0) / values.length;
  return roundTo(Math.sqrt(variance), 2);
}

function getArchivoPorTipo(archivos: InstanciaEvaluativaResumen['archivos'], tipo: TipoCalificacion): ArchivoIEResumen | null {
  switch (tipo) {
    case 'N':
      return archivos.notaOriginal ?? null;
    case 'R1':
      return archivos.recuperatorio1 ?? null;
    case 'R2':
      return archivos.recuperatorio2 ?? null;
    default:
      return null;
  }
}

function getTimestamp(fecha: string | null): number | null {
  if (!fecha) {
    return null;
  }

  const timestamp = Date.parse(fecha);
  return Number.isNaN(timestamp) ? null : timestamp;
}

export function buildCalificacionesReport(
  estudiantes: ReporteStudentLike[],
  evaluaciones: ReporteEvaluacionLike[],
  getSavedCellValue: (idEstudiante: string, evaluacion: number, tipo: TipoCalificacion) => number | null,
  isSlotEnabled: (evaluacion: number, tipo: TipoCalificacion) => boolean,
): ReporteCalificacionesGlobal {
  const rowsByStudentId: Record<string, ReporteAlumno> = {};
  const promedioPorEvaluacion: Record<number, number | null> = {};
  const porcentajeRecuperatoriosPorEvaluacion: Record<number, number> = {};
  const porcentajeAprobadasPorEvaluacion: Record<number, number> = {};

  const totalEstudiantes = estudiantes.length;

  for (const estudiante of estudiantes) {
    const evaluacionesReporte: Record<number, ReporteEvaluacionAlumno> = {};
    const mejoresNotas: number[] = [];
    let usoRecuperatorioEnAlguna = false;
    let todasApruebanTema = true;
    let tieneAlgunaEstructura = false;

    for (const evaluacion of evaluaciones) {
      const notas = {
        n: isSlotEnabled(evaluacion.numero, 'N')
          ? getSavedCellValue(estudiante.idEstudiante, evaluacion.numero, 'N')
          : null,
        r1: isSlotEnabled(evaluacion.numero, 'R1')
          ? getSavedCellValue(estudiante.idEstudiante, evaluacion.numero, 'R1')
          : null,
        r2: isSlotEnabled(evaluacion.numero, 'R2')
          ? getSavedCellValue(estudiante.idEstudiante, evaluacion.numero, 'R2')
          : null,
      };
      const tieneEstructura = TIPOS.some(tipo => isSlotEnabled(evaluacion.numero, tipo));
      const valores = [notas.n, notas.r1, notas.r2].filter((value): value is number => value !== null);
      const mejorNota = valores.length > 0 ? Math.max(...valores) : null;
      const usoRecuperatorio = notas.r1 !== null || notas.r2 !== null;
      const sinNotas = valores.length === 0;
      const apruebaTema = mejorNota !== null && mejorNota >= 7;

      evaluacionesReporte[evaluacion.numero] = {
        evaluacionNumero: evaluacion.numero,
        n: notas.n,
        r1: notas.r1,
        r2: notas.r2,
        mejorNota,
        usoRecuperatorio,
        apruebaTema,
        sinNotas,
        tieneEstructura,
      };

      if (!tieneEstructura) {
        continue;
      }

      tieneAlgunaEstructura = true;
      if (mejorNota !== null) {
        mejoresNotas.push(mejorNota);
      }
      if (usoRecuperatorio) {
        usoRecuperatorioEnAlguna = true;
      }
      if (!apruebaTema) {
        todasApruebanTema = false;
      }
    }

    const notaFinal = average(mejoresNotas);
    let estadoFinal: ReporteEstadoFinal = 'desaprobado';

    if (notaFinal !== null && notaFinal >= 7) {
      estadoFinal = todasApruebanTema ? 'aprobado' : 'desaprobado_tema';
    } else if (!tieneAlgunaEstructura) {
      estadoFinal = 'desaprobado';
    }

    rowsByStudentId[estudiante.idEstudiante] = {
      idEstudiante: estudiante.idEstudiante,
      evaluaciones: evaluacionesReporte,
      notaFinal,
      estadoFinal,
      usoRecuperatorioEnAlguna,
    };
  }

  for (const evaluacion of evaluaciones) {
    const reportes = estudiantes
      .map(estudiante => rowsByStudentId[estudiante.idEstudiante]?.evaluaciones[evaluacion.numero])
      .filter((item): item is ReporteEvaluacionAlumno => !!item && item.tieneEstructura);
    const mejoresNotas = reportes
      .map(reporte => reporte.mejorNota)
      .filter((value): value is number => value !== null);

    promedioPorEvaluacion[evaluacion.numero] = average(mejoresNotas);
    porcentajeRecuperatoriosPorEvaluacion[evaluacion.numero] = totalEstudiantes > 0
      ? roundTo((reportes.filter(reporte => reporte.usoRecuperatorio).length / totalEstudiantes) * 100, 1)
      : 0;
    porcentajeAprobadasPorEvaluacion[evaluacion.numero] = totalEstudiantes > 0
      ? roundTo((reportes.filter(reporte => reporte.apruebaTema).length / totalEstudiantes) * 100, 1)
      : 0;
  }

  const notasFinales = estudiantes
    .map(estudiante => rowsByStudentId[estudiante.idEstudiante]?.notaFinal)
    .filter((value): value is number => value !== null);

  const summary: ReporteResumenGlobal = {
    promedioPorEvaluacion,
    promedioFinal: average(notasFinales),
    porcentajeRecuperatoriosPorEvaluacion,
    porcentajeRecuperatoriosFinal: totalEstudiantes > 0
      ? roundTo(
          (
            estudiantes.filter(estudiante => rowsByStudentId[estudiante.idEstudiante]?.usoRecuperatorioEnAlguna).length
            / totalEstudiantes
          ) * 100,
          1,
        )
      : 0,
    porcentajeAprobadasPorEvaluacion,
    porcentajeAprobadosFinal: totalEstudiantes > 0
      ? roundTo(
          (
            estudiantes.filter(estudiante => rowsByStudentId[estudiante.idEstudiante]?.notaFinal !== null
              && rowsByStudentId[estudiante.idEstudiante].notaFinal! >= 7).length
            / totalEstudiantes
          ) * 100,
          1,
        )
      : 0,
  };

  return {
    rowsByStudentId,
    summary,
  };
}

export function buildCalificacionesVariacionReport(
  estudiantes: ReporteStudentLike[],
  evaluaciones: ReporteEvaluacionLike[],
  getSavedCellValue: (idEstudiante: string, evaluacion: number, tipo: TipoCalificacion) => number | null,
  isSlotEnabled: (evaluacion: number, tipo: TipoCalificacion) => boolean,
): ReporteVariacionCalificacionesGlobal {
  const seriesByStudentId: Record<string, ReporteVariacionCalificacionesSerie> = {};
  const promedioPorEvaluacion: Record<number, number | null> = {};
  const desviacionPorEvaluacion: Record<number, number | null> = {};
  const bandaInferiorPorEvaluacion: Record<number, number | null> = {};
  const bandaSuperiorPorEvaluacion: Record<number, number | null> = {};

  for (const estudiante of estudiantes) {
    const valoresPorEvaluacion: Record<number, number | null> = {};

    for (const evaluacion of evaluaciones) {
      const notas = TIPOS.map(tipo => (
        isSlotEnabled(evaluacion.numero, tipo)
          ? getSavedCellValue(estudiante.idEstudiante, evaluacion.numero, tipo)
          : null
      )).filter((value): value is number => value !== null);

      valoresPorEvaluacion[evaluacion.numero] = notas.length > 0 ? Math.max(...notas) : null;
    }

    seriesByStudentId[estudiante.idEstudiante] = {
      idEstudiante: estudiante.idEstudiante,
      valoresPorEvaluacion,
    };
  }

  for (const evaluacion of evaluaciones) {
    const valores = estudiantes
      .map(estudiante => seriesByStudentId[estudiante.idEstudiante]?.valoresPorEvaluacion[evaluacion.numero] ?? null)
      .filter((value): value is number => value !== null);
    const promedio = average(valores);
    const desvio = standardDeviation(valores);

    promedioPorEvaluacion[evaluacion.numero] = promedio;
    desviacionPorEvaluacion[evaluacion.numero] = desvio;
    if (promedio === null || desvio === null) {
      bandaInferiorPorEvaluacion[evaluacion.numero] = null;
      bandaSuperiorPorEvaluacion[evaluacion.numero] = null;
      continue;
    }

    bandaInferiorPorEvaluacion[evaluacion.numero] = roundTo(Math.max(0, promedio - desvio), 2);
    bandaSuperiorPorEvaluacion[evaluacion.numero] = roundTo(Math.min(10, promedio + desvio), 2);
  }

  return {
    seriesByStudentId,
    promedioPorEvaluacion,
    desviacionPorEvaluacion,
    bandaInferiorPorEvaluacion,
    bandaSuperiorPorEvaluacion,
  };
}

export function buildCalificacionesVariacionTemporalReport(
  estudiantes: ReporteStudentLike[],
  instancias: InstanciaEvaluativaResumen[],
  getSavedCellValue: (idEstudiante: string, idIE: string, tipo: TipoCalificacion) => number | null,
): ReporteVariacionTemporalGlobal {
  const seriesByStudentId: Record<string, ReporteVariacionTemporalSerie> = {};
  const promedioPorEvaluacion: Record<number, number | null> = {};
  const desviacionPorEvaluacion: Record<number, number | null> = {};
  const bandaInferiorPorEvaluacion: Record<number, number | null> = {};
  const bandaSuperiorPorEvaluacion: Record<number, number | null> = {};
  const fechaPorEvaluacion: Record<number, string | null> = {};
  const fechaTimestampPorEvaluacion: Record<number, number | null> = {};

  const tiposOrdenados: readonly TipoCalificacion[] = ['N', 'R1', 'R2'];

  for (const estudiante of estudiantes) {
    const puntos: ReporteVariacionTemporalPunto[] = [];

    for (const instancia of instancias) {
      const notas = tiposOrdenados
        .map(tipo => {
          const archivo = getArchivoPorTipo(instancia.archivos, tipo);
          const puntaje = archivo ? getSavedCellValue(estudiante.idEstudiante, instancia.idIE, tipo) : null;
          return {
            tipo,
            archivo,
            puntaje,
          };
        })
        .filter(item => item.archivo !== null && item.puntaje !== null);

      if (notas.length === 0) {
        continue;
      }

      const mejor = notas.reduce((current, candidate) => {
        if (candidate.puntaje! > current.puntaje!) {
          return candidate;
        }
        return current;
      });

      const fecha = mejor.archivo?.fechaEjecucion ?? instancia.archivos.notaOriginal?.fechaEjecucion
        ?? instancia.archivos.recuperatorio1?.fechaEjecucion
        ?? instancia.archivos.recuperatorio2?.fechaEjecucion
        ?? null;
      const timestamp = getTimestamp(fecha);
      if (!fecha || timestamp === null) {
        continue;
      }

      puntos.push({
        evaluacionNumero: instancia.nro,
        fecha,
        fechaTimestamp: timestamp,
        valor: mejor.puntaje!,
        tipoOrigen: mejor.tipo,
        etiqueta: `IE ${instancia.nro} / ${mejor.tipo}`,
      });
    }

    seriesByStudentId[estudiante.idEstudiante] = {
      idEstudiante: estudiante.idEstudiante,
      puntos: puntos.sort((a, b) => a.fechaTimestamp - b.fechaTimestamp),
    };
  }

  for (const instancia of instancias) {
    const puntos = estudiantes
      .map(estudiante => {
        const serie = seriesByStudentId[estudiante.idEstudiante];
        return serie?.puntos.find(p => p.evaluacionNumero === instancia.nro) ?? null;
      })
      .filter((item): item is ReporteVariacionTemporalPunto => !!item);
    const valores = puntos.map(item => item.valor);
    const promedio = average(valores);
    const desvio = standardDeviation(valores);
    const fechaBase = instancia.archivos.notaOriginal?.fechaEjecucion
      ?? instancia.archivos.recuperatorio1?.fechaEjecucion
      ?? instancia.archivos.recuperatorio2?.fechaEjecucion
      ?? null;

    promedioPorEvaluacion[instancia.nro] = promedio;
    desviacionPorEvaluacion[instancia.nro] = desvio;
    fechaPorEvaluacion[instancia.nro] = fechaBase;
    fechaTimestampPorEvaluacion[instancia.nro] = getTimestamp(fechaBase);

    if (promedio === null || desvio === null) {
      bandaInferiorPorEvaluacion[instancia.nro] = null;
      bandaSuperiorPorEvaluacion[instancia.nro] = null;
      continue;
    }

    bandaInferiorPorEvaluacion[instancia.nro] = roundTo(Math.max(0, promedio - desvio), 2);
    bandaSuperiorPorEvaluacion[instancia.nro] = roundTo(Math.min(10, promedio + desvio), 2);
  }

  return {
    seriesByStudentId,
    promedioPorEvaluacion,
    desviacionPorEvaluacion,
    bandaInferiorPorEvaluacion,
    bandaSuperiorPorEvaluacion,
    fechaPorEvaluacion,
    fechaTimestampPorEvaluacion,
  };
}
