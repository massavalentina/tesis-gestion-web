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
  /** Inasistencias acumuladas por retiros anticipados (RA/RAE) */
  ausentePorRA?: number;
  /** Inasistencias generadas exclusivamente por código A (ausente al establecimiento) */
  ausenciasPuras?: number;
  /** Cantidad de Ausencias No Computables (código ANC) */
  ausentesNoComputables?: number;
  porcentajeAsistencia: number;
  teaGeneral: boolean;
}

export interface ReporteAsistenciaResponse {
  totalDiasDictados: number;
  estudiantes: ReporteAsistenciaItem[];
}
