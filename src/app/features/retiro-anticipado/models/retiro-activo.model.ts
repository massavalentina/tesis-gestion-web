export interface RetiroActivo {
  idRetiro:               string;
  /** "MANANA" | "TARDE" */
  turno:                  string;
  /** "HH:mm" */
  horarioRetiro:          string;
  conReingreso:           boolean;
  /** "HH:mm" | null */
  horarioLimiteReingreso: string | null;
  /** "HH:mm" | null */
  horarioReingreso:       string | null;
  /** "ConReingreso" | "ReingresoVencido" | "Reingresado" | null */
  etiquetaEstado:         string | null;
  /** "RE" | "RA" | "RAE" */
  tipoRetiro:             string | null;
  nombrePreceptor:        string | null;
  motivo:                 string | null;

  // ── Responsable ──────────────────────────────────────────────────────────
  idTutor:               string | null;
  nombreResponsable:     string | null;
  apellidoResponsable:   string | null;
  dniResponsable:        string | null;
  relacionResponsable:   string | null;
  telefonoResponsable:   string | null;
  correoResponsable:     string | null;
}
