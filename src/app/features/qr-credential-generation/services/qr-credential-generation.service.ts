import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  OpcionCurso,
  ProgresoGeneracionQr,
  RespuestaInicioJobQr,
  ResumenGeneracionQr,
  SolicitudCancelacionJobQr,
  SolicitudGeneracionQr
} from '../models/qr-credential-generation.models';

@Injectable({ providedIn: 'root' })
export class ServicioGeneracionCredencialesQr {
  private readonly cursosUrl = 'http://localhost:5050/api/asistencia/scanner/cursos';
  private readonly summaryUrl = 'http://localhost:5050/api/qr-credentials/summary';
  private readonly startJobUrl = 'http://localhost:5050/api/qr-credentials/generation/start-job';
  private readonly progressUrl = 'http://localhost:5050/api/qr-credentials/generation/progress';
  private readonly pauseUrl = 'http://localhost:5050/api/qr-credentials/generation/pause';
  private readonly resumeUrl = 'http://localhost:5050/api/qr-credentials/generation/resume';
  private readonly cancelUrl = 'http://localhost:5050/api/qr-credentials/generation/cancel';

  constructor(private http: HttpClient) {}

  obtenerCursos(): Observable<OpcionCurso[]> {
    return this.http.get<OpcionCurso[]>(this.cursosUrl);
  }

  obtenerResumen(idCurso?: string | null): Observable<ResumenGeneracionQr> {
    let params = new HttpParams();

    if (idCurso) {
      params = params.set('cursoId', idCurso);
    }

    return this.http.get<ResumenGeneracionQr>(this.summaryUrl, { params });
  }

  iniciarJob(payload: SolicitudGeneracionQr): Observable<RespuestaInicioJobQr> {
    return this.http.post<RespuestaInicioJobQr>(this.startJobUrl, payload);
  }

  obtenerProgreso(jobId: string): Observable<ProgresoGeneracionQr> {
    return this.http.get<ProgresoGeneracionQr>(`${this.progressUrl}/${jobId}`);
  }

  pausarJob(jobId: string): Observable<ProgresoGeneracionQr> {
    return this.http.post<ProgresoGeneracionQr>(`${this.pauseUrl}/${jobId}`, {});
  }

  reanudarJob(jobId: string): Observable<ProgresoGeneracionQr> {
    return this.http.post<ProgresoGeneracionQr>(`${this.resumeUrl}/${jobId}`, {});
  }

  cancelarJob(jobId: string, payload: SolicitudCancelacionJobQr): Observable<ProgresoGeneracionQr> {
    return this.http.post<ProgresoGeneracionQr>(`${this.cancelUrl}/${jobId}`, payload);
  }
}
