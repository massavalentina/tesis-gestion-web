import { EstudianteManual } from './estudiante-manual.model';
import { RetiroActivo }    from '../../retiro-anticipado/models/retiro-activo.model';

export interface FilaAsistenciaManual {
  estudiante:       EstudianteManual;
  tipoManianaId:    string | null;
  tipoTardeId:      string | null;
  guardado:         boolean;
  error:            string | null;
  /** Indica cambios no guardados por turno */
  modificadoManana: boolean;
  modificadoTarde:  boolean;
  /** Spinner de guardado individual */
  guardandoFila:    boolean;
  valorTotalInasistencia: number | null;
  /** Código de llegada del turno mañana (LLT/LLTE/LLTC) — null si no hay llegada tardía */
  tipoLlegadaManianaId?: string | null;
  /** Retiro activo del turno mañana (null si no tiene) */
  retiroActivoManana?: RetiroActivo | null;
  /** Retiro activo del turno tarde (null si no tiene) */
  retiroActivoTarde?:  RetiroActivo | null;
}
