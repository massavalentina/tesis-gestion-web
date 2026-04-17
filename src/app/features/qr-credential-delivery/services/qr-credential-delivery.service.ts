import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AlcanceEnvioQr,
  EstadoFilaEnvioQr,
  OpcionCursoEnvioQr,
  PaginaEstadoEnvioQr,
  ProgresoEnvioQr,
  RespuestaEnvioIndividualQr,
  RespuestaInicioEnvioQr,
  ResumenEnvioQr,
  SolicitudEnvioIndividualQr,
  SolicitudInicioEnvioQr
} from '../models/qr-credential-delivery.models';

@Injectable({ providedIn: 'root' })
export class ServicioEnvioCredencialesQr {
  private readonly baseUrl = environment.apiUrl;
  private readonly cursosUrl = `${this.baseUrl}/api/asistencia/scanner/cursosscanner`;
  private readonly summaryUrl = `${this.baseUrl}/api/qr-credentials/delivery/summary`;
  private readonly startJobUrl = `${this.baseUrl}/api/qr-credentials/delivery/start-job`;
  private readonly progressUrl = `${this.baseUrl}/api/qr-credentials/delivery/progress`;
  private readonly studentsUrl = `${this.baseUrl}/api/qr-credentials/delivery/students`;
  private readonly studentQrImageUrl = `${this.baseUrl}/api/qr-credentials/delivery/student`;

  constructor(private http: HttpClient) {}

  obtenerCursos(): Observable<OpcionCursoEnvioQr[]> {
    return this.http.get<OpcionCursoEnvioQr[]>(this.cursosUrl);
  }

  obtenerResumen(idCurso: string, alcance: AlcanceEnvioQr): Observable<ResumenEnvioQr> {
    const params = new HttpParams()
      .set('cursoId', idCurso)
      .set('alcance', alcance);

    return this.http.get<ResumenEnvioQr>(this.summaryUrl, { params });
  }

  iniciarJob(payload: SolicitudInicioEnvioQr): Observable<RespuestaInicioEnvioQr> {
    return this.http.post<RespuestaInicioEnvioQr>(this.startJobUrl, payload);
  }

  obtenerProgreso(jobId: string): Observable<ProgresoEnvioQr> {
    return this.http.get<ProgresoEnvioQr>(`${this.progressUrl}/${jobId}`);
  }

  obtenerAlumnos(params: {
    cursoId: string;
    estado?: EstadoFilaEnvioQr | 'TODOS';
    busqueda?: string;
    page?: number;
    pageSize?: number;
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
