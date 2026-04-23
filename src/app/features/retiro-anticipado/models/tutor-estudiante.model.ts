export interface TutorEstudiante {
  idTutor:            string;
  nombre:             string;
  apellido:           string;
  documento:          string;
  relacionEstudiante: string;
  esPrincipal:        boolean;
  telefono:           string | null;
  correo:             string | null;
}
