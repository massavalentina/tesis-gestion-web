export interface RetiroReporteItem {
  idRetiro: string;
  fecha: string;
  estudianteId: string;
  nombre: string;
  apellido: string;
  documento: string;
  curso: string;
  turno: string;
  horarioRetiro: string;
  conReingreso: boolean;
  horarioLimiteReingreso: string | null;
  horarioReingreso: string | null;
  etiquetaEstado: string | null;
  tipoRetiro: string | null;
  motivo: string | null;
  nombrePreceptor: string | null;
  idTutor: string | null;
  nombreResponsable: string | null;
  apellidoResponsable: string | null;
  dniResponsable: string | null;
  relacionResponsable: string | null;
  telefonoResponsable: string | null;
  correoResponsable: string | null;
}
