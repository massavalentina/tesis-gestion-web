export interface HorarioInfo {
  diaSemana: string;
  horarioEntrada: string;
  horarioSalida: string;
}

export interface DocenteECActivo {
  idDocenteEC: string;
  idEC: string;
  nombreCurricula: string;
  codigoCurricula: string;
  codigoCurso: string;
  fechaDesde: string;
  horarios: HorarioInfo[];
}

export interface DocenteECHistorial extends DocenteECActivo {
  fechaHasta?: string | null;
  motivo?: string | null;
}

export interface DocenteECsResponse {
  activos: DocenteECActivo[];
  historial: DocenteECHistorial[];
}

export interface ECsinDocente {
  idEC: string;
  nombreCurricula: string;
  codigoCurricula: string;
  codigoCurso: string;
  tieneHistorial: boolean;
  horarios: HorarioInfo[];
}

export interface PreceptorCursoActivo {
  idPreceptorCurso: string;
  idCurso: string;
  codigoCurso: string;
  anio: number;
  division: string;
  fechaDesde: string;
}

export interface PreceptorCursoHistorial extends PreceptorCursoActivo {
  fechaHasta?: string | null;
  motivo?: string | null;
}

export interface PreceptorCursosResponse {
  activos: PreceptorCursoActivo[];
  historial: PreceptorCursoHistorial[];
}

export interface CursoSinPreceptor {
  idCurso: string;
  codigo: string;
  anio: number;
  division: string;
  tieneHistorial: boolean;
}
