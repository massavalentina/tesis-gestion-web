import { EstudianteManual } from './estudiante-manual.model';

export interface FilaAsistenciaManual {
  estudiante:    EstudianteManual;
  tipoManianaId: string | null;
  tipoTardeId:   string | null;
  /** Solo se usa en modo desarrollo para testear con hora explícita */
  horaManana:    string | null;   // "HH:mm"
  horaTarde:     string | null;
  guardado:      boolean;
  error:         string | null;
}








