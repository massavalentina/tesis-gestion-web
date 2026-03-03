export interface ConfiguracionEscaneo {
  idCurso: string;
  turno: string;
  idTipoAsistencia: string;
  etiquetaTipoAsistencia: string;
}

export interface SolicitudVistaPreviaAsistencia {
  qr: string;
  idCurso: string;
  turno: string;
}

export interface RespuestaVistaPreviaAsistencia {
  student: {
    id: string;
    name: string;
    lastName: string;
    course: string;
  };
  attendance: {
    time: string;
    attendanceType: string;
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
}

export interface OpcionSeleccion {
  id: string;
  label: string;
}
