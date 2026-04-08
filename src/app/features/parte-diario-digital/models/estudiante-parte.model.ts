export interface EstudianteParte {
  idEstudiante: string;
  nombre: string;
  apellido: string;
  documento: string;
  estado: 'Presente' | 'Ausente' | 'Retirado' | 'SinRegistro';
  codigoAsistencia: string | null;
  horaEntrada: string | null;
  horaSalida: string | null;
}
