export interface DashboardCalificaciones {
  avanceProgramas: number | null;
  promedioGeneral: number;
  calificacionMasFrecuente: number;
  desviacionEstandar: number;
  examenesRealizados: number;

  porcentajeSinRecuperatorio: number;
  porcentajeConRecuperatorio1: number;
  porcentajeConRecuperatorio2: number;

  top5EcMayorDesaprobacion: EcDesaprobacion[];
  top5EcMejorPromedio: EcPromedio[];
  top5CursosMayorTasa: CursoTasaDesaprobacion[];
  distribucionEstados: DistribucionEstados;
}

export interface EcDesaprobacion {
  nombre: string;
  cantidadDesaprobados: number;
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
  aprobado: number;
  desaprobado: number;
  desaprobadoPorTema: number;
}
