import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ConfirmarAsistenciaItemPayload,
  RespuestaVistaPreviaAsistencia,
  SolicitudVistaPreviaAsistencia,
  TurnoSesionResponse
} from '../models/escaner.models';

@Injectable({ providedIn: 'root' })
export class ServicioAsistencia {

  private readonly urlBase = `${environment.apiUrl}/api/asistencia/scanner`;

  constructor(private http: HttpClient) {}

  vistaPrevia(
    qr: string,
    turno?: string | null
  ): Observable<RespuestaVistaPreviaAsistencia> {
    const solicitud: SolicitudVistaPreviaAsistencia = { qr, turno };

    return this.http.post<RespuestaVistaPreviaAsistencia>(
      `${this.urlBase}/preview`,
      solicitud
    );
  }

  obtenerTurnoSesion(turno?: string | null): Observable<TurnoSesionResponse> {
    const url = turno
      ? `${this.urlBase}/session-turno?turno=${encodeURIComponent(turno)}`
      : `${this.urlBase}/session-turno`;
    return this.http.get<TurnoSesionResponse>(url);
  }

  confirmar(payload: { items: ConfirmarAsistenciaItemPayload[] }): Observable<void> {
    return this.http.post<void>(
      `${this.urlBase}/confirm`,
      payload
    );
  }
}
