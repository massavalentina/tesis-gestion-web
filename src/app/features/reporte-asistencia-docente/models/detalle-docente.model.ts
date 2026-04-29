export interface DetalleDocenteRegistro {
  fecha: string;
  dictada: boolean;
  presente: boolean | null;
  /** Código actual del turno mañana (puede ser RA/RAE/RE si hubo retiro). */
  codigo: string | null;
  /** Código de llegada original (LLT/LLTE/LLTC/P/A). Nulo si coincide con codigo. */
  codigoLlegada: string | null;
  horaEntrada: string | null;
  /** Hora de salida anticipada (retiro) del turno mañana. */
  horaSalida: string | null;
  /** Hora real de reingreso (si el retiro tenía reingreso y el alumno volvió). */
  horaReingreso: string | null;
}
