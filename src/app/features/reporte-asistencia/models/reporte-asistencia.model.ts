export interface ReporteAsistenciaItem {
  idEstudiante: string;
  nombre: string;
  apellido: string;
  documento: string;
  presencias: number;
  inasistencias: number;
  ausentePorLLT: number;
  ausentePorRA: number;
  ausenciasPuras: number;
  porcentajeAsistencia: number;
  teaGeneral: boolean;
}

export interface ReporteAsistenciaResponse {
  totalDiasDictados: number;
  estudiantes: ReporteAsistenciaItem[];
}
