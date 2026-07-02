export interface ImportacionCalificacionesDetalle {
  idImportacionCalificaciones: string;
  estado: string;
  nombreArchivoOriginal: string;
  rutaArchivoFinal: string | null;
  fechaCreacion: string;
  fechaUltimaActualizacion: string;
  fechaConfirmacion: string | null;
  tieneSesionPendiente: boolean;
  puedeRevisar: boolean;
  puedeConfirmar: boolean;
  contexto: ImportacionContexto;
  resumen: ImportacionAnalisisResumen;
  bloqueos: ImportacionIssue[];
}

export interface ImportacionContexto {
  idEC: string;
  idCurso: string;
  nombreMateria: string;
  codigoCurso: string;
  anioNumero: number;
  division: string;
  anioLectivo: number;
}

export interface ImportacionAnalisisResumen {
  estudiantesDetectados: number;
  estudiantesSinConflicto: number;
  estudiantesConConflicto: number;
  evaluacionesDetectadasConNotas: number;
  notasNuevas: number;
  notasYaExistentes: number;
  conflictosDeNotas: number;
  notasInvalidas: number;
  pendientesDeRevision: number;
}

export interface ImportacionIssue {
  codigo: string;
  severidad: 'clean' | 'review' | 'blocking' | string;
  mensaje: string;
  slotKey: string | null;
}

export interface ImportacionRevision {
  idImportacionCalificaciones: string;
  estado: string;
  resumen: ImportacionAnalisisResumen;
  bloqueos: ImportacionIssue[];
  estudiantesCurso: ImportacionStudentOption[];
  slots: ImportacionSlot[];
  rows: ImportacionRevisionRow[];
  puedeConfirmar: boolean;
}

export interface ImportacionStudentOption {
  idEstudiante: string;
  label: string;
  documento: string;
}

export interface ImportacionSlot {
  slotKey: string;
  idIE: string | null;
  evaluacionNumero: number;
  tipoCalificacion: 'N' | 'R1' | 'R2' | string;
  label: string;
  tieneNotasImportadas: boolean;
  tieneEstructuraPrevia: boolean;
}

export interface ImportacionRevisionRow {
  rowId: string;
  orden: number;
  estudiantePdf: string;
  estado: 'clean' | 'review' | 'blocking' | string;
  mensaje: string | null;
  estudianteAsociadoId: string | null;
  omitida: boolean;
  candidatosEstudianteIds: string[];
  issues: ImportacionIssue[];
  cells: ImportacionRevisionCell[];
}

export interface ImportacionRevisionCell {
  slotKey: string;
  evaluacionNumero: number;
  tipoCalificacion: 'N' | 'R1' | 'R2' | string;
  valorImportadoRaw: string | null;
  valorImportado: number | null;
  valorDb: number | null;
  valorFinal: number | null;
  estado: 'clean' | 'review' | 'blocking' | string;
  resolucion: 'omit' | 'keep_db' | 'use_imported' | 'manual_edit' | 'pending' | string;
  mensaje: string | null;
  editable: boolean;
}

export interface ActualizarImportacionRevisionRequest {
  rows: ActualizarImportacionRevisionRow[];
}

export interface ActualizarImportacionRevisionRow {
  rowId: string;
  estudianteAsociadoId: string | null;
  omitida: boolean;
  cells: ActualizarImportacionRevisionCell[];
}

export interface ActualizarImportacionRevisionCell {
  slotKey: string;
  resolucion: string;
  valorFinal: number | null;
}

export interface ImportacionConfirmacion {
  idImportacionCalificaciones: string;
  estado: string;
  resumen: ImportacionConfirmacionResumen;
  puedeConfirmar: boolean;
  bloqueos: ImportacionIssue[];
}

export interface ImportacionConfirmacionResumen {
  estudiantesValidados: number;
  notasNuevas: number;
  notasExistentesMantenidas: number;
  notasReemplazadas: number;
  correccionesManuales: number;
  notasOmitidas: number;
}

export interface ConfirmarImportacionResponse {
  idImportacionCalificaciones: string;
  estado: string;
  rutaArchivoFinal: string | null;
  cambiosAplicados: number;
  idSesionAuditoria: string | null;
}
