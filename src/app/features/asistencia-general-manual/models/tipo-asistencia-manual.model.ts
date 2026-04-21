export interface TipoAsistenciaManual {
  id: string;
  codigo: string;
  descripcion: string;
  valorBase: number;
}

/** Tipos que requieren ingresar hora (llegadas tarde) */
export const CODIGOS_CON_HORA = new Set(['LLT', 'LLTE', 'LLTC']);

/** Códigos calculados por el backend — no se ofrecen al preceptor en el dropdown */
export const CODIGOS_INTERNOS = new Set(['RE', 'RAE', 'RA']);
