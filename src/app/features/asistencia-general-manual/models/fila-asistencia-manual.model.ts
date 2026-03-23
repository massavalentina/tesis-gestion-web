import { EstudianteManual } from './estudiante-manual.model';

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
}
