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
  /** Cantidad de Retiros Express (código RE) */
  retirosExpress: number;
  /** Cantidad de Retiros Anticipados Extendidos (código RAE) */
  retirosAnticipadosExtendidos: number;
  porcentajeAsistencia: number;
  teaGeneral: boolean;
}

export interface ReporteAsistenciaResponse {
  totalDiasDictados: number;
  estudiantes: ReporteAsistenciaItem[];
}
