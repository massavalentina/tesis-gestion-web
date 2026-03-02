export interface OpcionCurso {
  id: string;
  label: string;
}

export type AlcanceGeneracionQr = 'ACTIVOS' | 'SIN_QR' | 'TODOS';

export interface ResumenGeneracionQr {
  idCurso?: string | null;
  cursoCodigo?: string | null;
  totalAlumnosActivos: number;
  totalQrActivos: number;
  totalPendientesGenerar: number;
}

export interface SolicitudGeneracionQr {
  idCurso: string;
  alcance: AlcanceGeneracionQr;
}

export interface RespuestaInicioJobQr {
  jobId: string;
}

export interface ProgresoGeneracionQr {
  jobId: string;
  estado: 'RUNNING' | 'COMPLETED' | 'FAILED';
  total: number;
  procesados: number;
  generados: number;
  desactivados: number;
  omitidos: number;
  errores: number;
  ultimoEstudiante?: string | null;
  ultimoMensaje?: string | null;
  inicio: string;
  fin?: string | null;
}
