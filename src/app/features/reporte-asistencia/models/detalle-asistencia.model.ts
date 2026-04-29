export interface DetalleAsistencia {
  fecha: string;
  /** Código principal del turno mañana (P, A, LLT, LLTE, LLTC, ANC…) */
  codigoManana: string;
  /** Código de retiro del turno mañana (RA, RAE, RE) — presente si hubo retiro además de llegada */
  codigoRetiroManana?: string;
  /** Código principal del turno tarde */
  codigoTarde: string;
  /** Código de retiro del turno tarde */
  codigoRetiroTarde?: string;
  valorTotal: number;
  horaEntradaManana?: string;
  /** Hora de salida anticipada (retiro) turno mañana */
  horaSalidaManana?: string;
  /** Hora de reingreso turno mañana (si el retiro tenía reingreso) */
  horaReingresoManana?: string;
  /** Hora de salida anticipada turno tarde */
  horaSalidaTarde?: string;
  /** Hora de reingreso turno tarde */
  horaReingresoTarde?: string;
}
