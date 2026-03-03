import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  RespuestaVistaPreviaAsistencia,
  SolicitudVistaPreviaAsistencia
} from '../models/escaner.models';

@Injectable({ providedIn: 'root' })
export class ServicioAsistencia {

  private readonly urlBase = 'http://localhost:5050/api/asistencia/scanner';

  constructor(private http: HttpClient) {}

  vistaPrevia(
    qr: string,
    idCurso: string,
    turno: string
  ): Observable<RespuestaVistaPreviaAsistencia> {
    const solicitud: SolicitudVistaPreviaAsistencia = { qr, idCurso, turno };

    return this.http.post<RespuestaVistaPreviaAsistencia>(
      `${this.urlBase}/preview`,
      solicitud
    );
  }

  confirmar(payload: {
    turno: string;
    attendanceTypeId: string;
    studentIds: string[];
  }): Observable<void> {
    return this.http.post<void>(
      `${this.urlBase}/confirm`,
      payload
    );
  }
}
