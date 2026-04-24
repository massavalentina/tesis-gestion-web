export interface TutorFicha {
  idTutor: string;
  nombre: string;
  apellido: string;
  documento: string;
  telefono: number;
  correo: string;
  relacionEstudiante: string;
  fechaNacimiento: string;
  domicilio: string | null;
  disponibilidad: string;
  esPrincipal: boolean;
  /** Fecha en que se actualizaron por última vez los datos del tutor (ISO 8601, UTC). */
  fechaUltimaActualizacion: string;
  /** Fecha en que se envió por última vez una notificación de actualización. Null si nunca. */
  fechaUltimaNotificacion: string | null;
}
