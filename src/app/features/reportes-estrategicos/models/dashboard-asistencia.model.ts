export interface DashboardAsistencia {
  porcentajeAsistenciaGeneral: number;
  porcentajeAsistenciaPorEC: number;
  promedioInasistenciasPorCurso: number;
  porcentajeLlegadasTarde: number;
  porcentajeRetirosAnticipados: number;
  alumnosTeaGeneral: number;
  alumnosTeaPorEspacio: number;
  inasistenciasPorCurso: CursoInasistencia[];
  asistenciaPorEC: EcAsistencia[];
  tendenciaMensual: TendenciaMensual[];
  distribucionInasistencias: DistribucionInasistencias;
  distribucionSubtipos: DistribucionSubtipos;
  distribucionInasistenciasEC: DistribucionInasistenciasEC;
}

export interface CursoInasistencia {
  curso: string;
  promedio: number;
}

export interface EcAsistencia {
  nombreEC: string;
  porcentajeAsistencia: number;
}

export interface TendenciaMensual {
  curso: string;
  valoresMensuales: (number | null)[];
}

export interface DistribucionInasistencias {
  ausentes: number;
  llegadasTarde: number;
  retirosAnticipados: number;
}

export interface DistribucionSubtipos {
  llt: number;
  llte: number;
  lltc: number;
  re: number;
  ra: number;
  rae: number;
}

export interface DistribucionInasistenciasEC {
  ausencias: number;
  llegadasTarde: number;
  retirosAnticipados: number;
}

export interface DashboardFiltros {
  anioLectivo: number;
  desde?: string;
  hasta?: string;
  cursoId?: string;
  ecId?: string;
}

export interface OpcionCurso {
  id: string;
  label: string;
}

export interface OpcionEC {
  idEC: string;
  nombre: string;
}
