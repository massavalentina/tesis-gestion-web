export interface AuditoriaAsistenciaEC {
  idAuditoria:     string;
  /** 1 = Registro General, 2 = Retiro, 3 = Cambio Manual */
  tipoEvento:      1 | 2 | 3;
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
