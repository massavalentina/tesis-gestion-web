export interface ReporteDocenteItem {
  idEstudiante: string;
  nombre: string;
  apellido: string;
  documento: string;
  presencias: number;
  inasistencias: number;
  llegadasTarde: number;
  retirosAnticipados: number;
  porcentajeAsistencia: number;
  teaGeneral: boolean;
}

export interface ReporteDocenteResponse {
  totalClasesDictadas: number;
  nombreEspacio: string;
  estudiantes: ReporteDocenteItem[];
}
