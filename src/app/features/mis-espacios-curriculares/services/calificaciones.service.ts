import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AuditoriaCalificacionesResponse,
  CalificacionVigente,
  GestionManualEstudiante,
  GuardarCalificacionesManualRequest,
  GuardarCalificacionesManualResponse,
  InstanciaEvaluativaResumen,
} from '../models/calificaciones.model';

@Injectable({ providedIn: 'root' })
export class CalificacionesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/calificaciones`;

  getInstancias(idEC: string): Observable<InstanciaEvaluativaResumen[]> {
    return this.http.get<InstanciaEvaluativaResumen[]>(`${this.base}/ec/${idEC}/instancias`);
  }

  getEstudiantes(idEC: string): Observable<GestionManualEstudiante[]> {
    return this.http.get<GestionManualEstudiante[]>(`${this.base}/ec/${idEC}/estudiantes`);
  }

  getCalificacionesVigentes(idEC: string): Observable<CalificacionVigente[]> {
    return this.http.get<CalificacionVigente[]>(`${this.base}/ec/${idEC}/calificaciones-vigentes`);
  }

  guardarGestionManual(
    idEC: string,
    payload: GuardarCalificacionesManualRequest,
  ): Observable<GuardarCalificacionesManualResponse> {
    return this.http.put<GuardarCalificacionesManualResponse>(
      `${this.base}/ec/${idEC}/gestion-manual`,
      payload,
    );
  }

  getAuditoria(
    idEC: string,
    skip = 0,
    take = 5,
  ): Observable<AuditoriaCalificacionesResponse> {
    const params = new HttpParams()
      .set('skip', skip)
      .set('take', take);

    return this.http.get<AuditoriaCalificacionesResponse>(
      `${this.base}/ec/${idEC}/auditoria`,
      { params },
    );
  }
}
