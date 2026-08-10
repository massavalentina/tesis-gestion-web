export interface ImportacionAnalisis {
  estado: string;
  nombreArchivoOriginal: string;
  hashArchivoSha256: string;
  contexto: ImportacionContexto;
  resumen: ImportacionAnalisisResumen;
  bloqueos: ImportacionIssue[];
  estudiantesCurso: ImportacionStudentOption[];
  slots: ImportacionSlot[];
  rows: ImportacionRevisionRow[];
  resumenConfirmacionInicial: ImportacionConfirmacionResumen;
  puedeConfirmar: boolean;
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
  severidad: 'clean' | 'info' | 'review' | 'blocking' | string;
  mensaje: string;
  slotKey: string | null;
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
  admiteCargaNotas: boolean;
}

export interface ImportacionRevisionRow {
  rowId: string;
  orden: number;
  estudiantePdf: string;
  estado: 'clean' | 'review' | 'blocking' | string;
  mensaje: string | null;
  estudianteAsociadoId: string | null;
  requiereAsociacionManual: boolean;
  candidatosEstudianteIds: string[];
  issues: ImportacionIssue[];
  cells: ImportacionRevisionCell[];
}

export interface ImportacionRevisionCell {
  slotKey: string;
  idCalificacionBase: string | null;
  evaluacionNumero: number;
  tipoCalificacion: 'N' | 'R1' | 'R2' | string;
  valorImportadoRaw: string | null;
  valorImportado: number | null;
  valorDb: number | null;
  valorFinal: number | null;
  estado: 'clean' | 'review' | 'blocking' | string;
  resolucion: 'keep_db' | 'use_imported' | 'clear_db' | 'pending' | string;
  mensaje: string | null;
}

export interface ConfirmarImportacionPayload {
  hashArchivoSha256: string;
  rows: ConfirmarImportacionRow[];
}

export interface ConfirmarImportacionRow {
  rowId: string;
  estudianteAsociadoId: string | null;
  cells: ConfirmarImportacionCell[];
}

export interface ConfirmarImportacionCell {
  slotKey: string;
  resolucion: string;
  idCalificacionBase: string | null;
}

export interface ImportacionConfirmacionResumen {
  estudiantesValidados: number;
  notasNuevas: number;
  notasExistentesMantenidas: number;
  notasReemplazadas: number;
  notasQuitadas: number;
}

export interface ConfirmarImportacionResponse {
  idImportacionCalificaciones: string;
  estado: string;
  rutaArchivoFinal: string | null;
  cambiosAplicados: number;
  idSesionAuditoria: string | null;
}
