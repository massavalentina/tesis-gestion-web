export interface AuditoriaAsistenciaEC {
  idAuditoria:     string;
  /** 1 = Registro General, 2 = Retiro, 3 = Cambio Manual, 4 = Cancelación de Retiro */
  tipoEvento:      1 | 2 | 3 | 4;
  tipoEventoLabel: string;
  nombreMateria:   string;
  /** null = sin registro previo al evento */
  estadoAnterior:  boolean | null;
  estadoNuevo:     boolean;
  /** "HH:mm" */
  horarioEvento:   string;
  fechaRegistro:   string;
  nombreUsuario:   string;
  apellidoUsuario: string;
}
