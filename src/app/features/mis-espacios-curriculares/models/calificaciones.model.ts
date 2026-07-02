export type TipoCalificacion = 'N' | 'R1' | 'R2';

export interface ArchivoIEResumen {
  idArchivoIE: string;
  tipoCalificacion: TipoCalificacion;
  tipoIE: string;
  titulo: string;
  fechaEjecucion: string;
  fechaCarga: string;
  nombreArchivo: string;
}

export interface InstanciaEvaluativaArchivos {
  notaOriginal: ArchivoIEResumen | null;
  recuperatorio1: ArchivoIEResumen | null;
  recuperatorio2: ArchivoIEResumen | null;
}

export interface InstanciaEvaluativaResumen {
  idIE: string;
  idEC: string;
  nro: number;
  estado: string;
  archivos: InstanciaEvaluativaArchivos;
}

export interface GestionManualEspacio {
  idEC: string;
  idCurso: string;
  nombreMateria: string;
  codigoCurso: string;
  anioNumero: number;
  division: string;
  anioLectivo: number;
}

export interface GestionManualEstudiante {
  idEstudiante: string;
  nombre: string;
  apellido: string;
  documento: string;
}

export interface CalificacionVigente {
  idCalificacion: string;
  idIE: string;
  idEstudiante: string;
  tipoCalificacion: TipoCalificacion;
  puntaje: number | null;
  fechaCarga: string;
  origen: string;
}

export interface GuardarCalificacionCambio {
  idIE: string;
  idEstudiante: string;
  tipoCalificacion: TipoCalificacion;
  puntaje: number | null;
}

export interface GuardarCalificacionesManualRequest {
  cambios: GuardarCalificacionCambio[];
}

export interface AuditoriaCalificacionDetalle {
  idDetalleAuditoria: string;
  idIE: string;
  idEstudiante: string;
  estudiante: string;
  documento: string;
  evaluacion: string;
  tipoCalificacion: TipoCalificacion;
  valorAnterior: number | null;
  valorNuevo: number | null;
}

export interface AuditoriaCalificacionSesion {
  idSesionAuditoria: string;
  timestamp: string;
  docente: string;
  origen: string;
  cantidadCambios: number;
  rutaArchivoImportacion: string | null;
  cambios: AuditoriaCalificacionDetalle[];
}

export interface AuditoriaCalificacionesResponse {
  items: AuditoriaCalificacionSesion[];
  totalSesiones: number;
  hasMore: boolean;
}

export interface GuardarCalificacionesManualResponse {
  cambiosAplicados: number;
  instanciasAfectadas: string[];
  sesionAuditoria: AuditoriaCalificacionSesion | null;
}
