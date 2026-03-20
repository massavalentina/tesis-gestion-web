export interface ReporteAsistenciaItem {
  idEstudiante: string;
  nombre: string;
  apellido: string;
  documento: string;
  presencias: number;
  inasistencias: number;
  llegadasTarde: number;
  ausentePorLLT: number;
  retirosAnticipados: number;
  porcentajeAsistencia: number;
  teaGeneral: boolean;
}

export interface ReporteAsistenciaResponse {
  totalDiasDictados: number;
  estudiantes: ReporteAsistenciaItem[];
}
