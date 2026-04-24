import { RetiroActivo } from '../../retiro-anticipado/models/retiro-activo.model';

export interface EstudianteParte {
  idEstudiante: string;
  nombre: string;
  apellido: string;
  documento: string;
  estado: 'Presente' | 'Ausente' | 'Retirado' | 'SinRegistro';
  codigoAsistencia: string | null;
  codigoLlegadaManiana?: string | null;
  horaEntrada: string | null;
  horaSalida: string | null;
  retiroActivo?: RetiroActivo | null;
}
