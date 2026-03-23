export interface OpcionCursoEnvioQr {
  id: string;
  label: string;
}

export type AlcanceEnvioQr = 'PENDIENTES' | 'TODOS';

export type EstadoFilaEnvioQr =
  | 'ENVIADO'
  | 'PENDIENTE_ENVIO'
  | 'SIN_QR'
  | 'SIN_TUTOR_PRINCIPAL'
  | 'EMAIL_INVALIDO';

export type EstadoFiltroEnvioQr = 'TODOS' | EstadoFilaEnvioQr;

export interface ResumenEnvioQr {
  idCurso: string;
  cursoCodigo: string;
  anioLectivo: number;
  alcance: AlcanceEnvioQr;

  totalAlumnosActivos: number;
  totalTutoresPrincipales: number;
  totalQrEnviados: number;
  totalQrPendientesEnvio: number;
  totalSinQrGenerado: number;
  totalSinTutorPrincipal: number;
  totalEmailInvalido: number;

  totalCandidatosSegunAlcance: number;
  estimacionSegundos: number;
  puedeIniciarEnvio: boolean;
  mensaje: string;
}

export interface SolicitudInicioEnvioQr {
  idCurso: string;
  alcance: AlcanceEnvioQr;
  asunto?: string;
  mensajePersonalizado?: string;
}

export interface RespuestaInicioEnvioQr {
  jobId: string;
}

export interface ProgresoEnvioQr {
  jobId: string;
  estado: 'RUNNING' | 'COMPLETED' | 'FAILED';

  total: number;
  procesados: number;
  enviados: number;
  omitidos: number;
  errores: number;

  ultimoDestino?: string | null;
  ultimoEstudiante?: string | null;
  ultimoMensaje?: string | null;
  detallesErrores?: string[] | null;

  inicio: string;
  fin?: string | null;
}

export interface FilaEstadoEnvioQr {
  idEstudiante: string;
  nombreCompleto: string;
  dni: string;

  tutorPrincipalNombre?: string | null;
  tutorPrincipalEmail?: string | null;

  estado: EstadoFilaEnvioQr;
  fechaGeneracionQr?: string | null;
}

export interface PaginaEstadoEnvioQr {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  items: FilaEstadoEnvioQr[];
}
