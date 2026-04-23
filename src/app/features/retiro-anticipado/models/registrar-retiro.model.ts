export interface RegistrarRetiro {
  estudianteId:           string;
  fecha:                  string;
  turno:                  'MANANA' | 'TARDE';
  /** "HH:mm:ss" */
  horarioRetiro:          string;
  conReingreso:           boolean;
  /** "HH:mm:ss" | null */
  horarioLimiteReingreso: string | null;
  motivo:                 string;
  idTutor:                string | null;
  nombreResponsable:      string | null;
  apellidoResponsable:    string | null;
  dniResponsable:         string | null;
  relacionResponsable:    string | null;
  telefonoResponsable:    string | null;
  correoResponsable:      string | null;
  nombrePreceptor:        string;
}
