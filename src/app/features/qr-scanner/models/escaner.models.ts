export interface ConfiguracionEscaneo {
  turno?: string | null;
  idTipoAsistencia?: string | null;
  etiquetaTipoAsistencia?: string | null;
  modoRafaga: boolean;
}

export interface SolicitudVistaPreviaAsistencia {
  qr: string;
  turno?: string | null;
}

export interface RespuestaVistaPreviaAsistencia {
  student: {
    id: string;
    name: string;
    lastName: string;
    course: string;
    profileImagePath?: string | null;
  };
  attendance: {
    time: string;
    attendanceType: string;
    attendanceTypeCode?: string | null;
    alreadyRegisteredTurno?: boolean;
    turno: string;
  };
}

export interface ErrorApi {
  code: string;
  message: string;
}

export interface AlumnoEscaneado {
  id: string;
  nombre: string;
  apellido: string;
  curso: string;
  turno: string;
  attendanceTypeId: string;
  attendanceTypeCode: string;
  attendanceTypeLabel: string;
}

export interface OpcionSeleccion {
  id: string;
  label: string;
}

export interface TurnoSesionResponse {
  turno: string;
  serverTime: string;
  cutoffTime: string;
}

export interface ConfirmarAsistenciaItemPayload {
  studentId: string;
  attendanceTypeId: string;
  turno: string;
}

export interface ErrorConfirmacionDetalle {
  studentId: string;
  code: string;
  message: string;
}
