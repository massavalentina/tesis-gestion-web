import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AlcanceEnvioQr,
  CampoOrdenTablaQr,
  DireccionOrdenTablaQr,
  EstadoFilaEnvioQr,
  OpcionCursoEnvioQr,
  PaginaEstadoEnvioQr,
  ProgresoEnvioQr,
  RespuestaEnvioIndividualQr,
  RespuestaInicioEnvioQr,
  ResumenEnvioQr,
  SolicitudEnvioIndividualQr,
  SolicitudInicioEnvioQr,
  TrabajoActivoEnvioQr
} from '../models/qr-credential-delivery.models';

@Injectable({ providedIn: 'root' })
export class ServicioEnvioCredencialesQr {
  private readonly baseUrl = environment.apiUrl;
  private readonly cursosUrl = `${this.baseUrl}/api/asistencia/cursos`;
  private readonly summaryUrl = `${this.baseUrl}/api/qr-credentials/delivery/summary`;
  private readonly startJobUrl = `${this.baseUrl}/api/qr-credentials/delivery/start-job`;
  private readonly activeJobsUrl = `${this.baseUrl}/api/qr-credentials/delivery/active-jobs`;
  private readonly progressUrl = `${this.baseUrl}/api/qr-credentials/delivery/progress`;
  private readonly pauseUrl = `${this.baseUrl}/api/qr-credentials/delivery/pause`;
  private readonly resumeUrl = `${this.baseUrl}/api/qr-credentials/delivery/resume`;
  private readonly cancelUrl = `${this.baseUrl}/api/qr-credentials/delivery/cancel`;
  private readonly studentsUrl = `${this.baseUrl}/api/qr-credentials/delivery/students`;
  private readonly studentQrImageUrl = `${this.baseUrl}/api/qr-credentials/delivery/student`;

  constructor(private http: HttpClient) {}

  obtenerCursos(): Observable<OpcionCursoEnvioQr[]> {
    return this.http.get<OpcionCursoEnvioQr[]>(this.cursosUrl);
  }

  obtenerResumen(idCurso?: string | null, alcance?: AlcanceEnvioQr | null): Observable<ResumenEnvioQr> {
    let params = new HttpParams();

    if (idCurso) {
      params = params.set('cursoId', idCurso);
    }

    if (alcance) {
      params = params.set('alcance', alcance);
    }

    return this.http.get<ResumenEnvioQr>(this.summaryUrl, { params });
  }

  iniciarJob(payload: SolicitudInicioEnvioQr): Observable<RespuestaInicioEnvioQr> {
    return this.http.post<RespuestaInicioEnvioQr>(this.startJobUrl, payload);
  }

  obtenerJobsActivos(cursoId?: string | null): Observable<TrabajoActivoEnvioQr[]> {
    let params = new HttpParams();

    if (cursoId) {
      params = params.set('cursoId', cursoId);
    }

    return this.http.get<TrabajoActivoEnvioQr[]>(this.activeJobsUrl, { params });
  }

  obtenerProgreso(jobId: string): Observable<ProgresoEnvioQr> {
    return this.http.get<ProgresoEnvioQr>(`${this.progressUrl}/${jobId}`);
  }

  pausarJob(jobId: string): Observable<ProgresoEnvioQr> {
    return this.http.post<ProgresoEnvioQr>(`${this.pauseUrl}/${jobId}`, {});
  }

  reanudarJob(jobId: string): Observable<ProgresoEnvioQr> {
    return this.http.post<ProgresoEnvioQr>(`${this.resumeUrl}/${jobId}`, {});
  }

  cancelarJob(jobId: string): Observable<ProgresoEnvioQr> {
    return this.http.post<ProgresoEnvioQr>(`${this.cancelUrl}/${jobId}`, {});
  }

  obtenerAlumnos(params: {
    cursoId: string;
    estado?: EstadoFilaEnvioQr | 'TODOS';
    busqueda?: string;
    page?: number;
    pageSize?: number;
    sortBy?: CampoOrdenTablaQr;
    sortDir?: DireccionOrdenTablaQr;
  }): Observable<PaginaEstadoEnvioQr> {
    let httpParams = new HttpParams().set('cursoId', params.cursoId);

    if (params.estado && params.estado !== 'TODOS') {
      httpParams = httpParams.set('estado', params.estado);
    }

    if (params.busqueda?.trim()) {
      httpParams = httpParams.set('busqueda', params.busqueda.trim());
    }

    if (params.page) {
      httpParams = httpParams.set('page', params.page);
    }

    if (params.pageSize) {
      httpParams = httpParams.set('pageSize', params.pageSize);
    }

    if (params.sortBy) {
      httpParams = httpParams.set('sortBy', params.sortBy);
    }

    if (params.sortDir) {
      httpParams = httpParams.set('sortDir', params.sortDir);
    }

    return this.http.get<PaginaEstadoEnvioQr>(this.studentsUrl, { params: httpParams });
  }

  obtenerImagenQrAlumno(estudianteId: string): Observable<Blob> {
    return this.http.get(`${this.studentQrImageUrl}/${estudianteId}/qr-image`, {
      responseType: 'blob'
    });
  }

  enviarAlumno(estudianteId: string, payload: SolicitudEnvioIndividualQr): Observable<RespuestaEnvioIndividualQr> {
    return this.http.post<RespuestaEnvioIndividualQr>(`${this.studentQrImageUrl}/${estudianteId}/send`, payload);
  }
}
