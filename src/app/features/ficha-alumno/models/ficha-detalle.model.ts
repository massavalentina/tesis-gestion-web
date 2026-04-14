import { TutorFicha } from './tutor-ficha.model';

export interface FichaDetalle {
  idEstudiante: string;
  nombre: string;
  apellido: string;
  documento: string;
  fechaNacimiento: string;
  domicilio: string | null;
  codigoCurso: string | null;
  credencialQrActiva: boolean | null;
  tutores: TutorFicha[];
}
