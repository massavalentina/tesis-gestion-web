import { EstudianteParte } from './estudiante-parte.model';
import { HorarioClase }    from './horario-clase.model';

export interface TurnoParte {
  disponible: boolean;
  presentes: number;
  ausentes: number;
  retirados: number;
  sinRegistro: number;
  totalEstudiantes: number;
  porcentajeAsistencia: number;
  estudiantes: EstudianteParte[];
  horarioClases: HorarioClase[];
}
