import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ReporteAsistenciaResponse } from '../models/reporte-asistencia.model';
import { DetalleAsistencia } from '../models/detalle-asistencia.model';

@Injectable({ providedIn: 'root' })
export class ReporteAsistenciaService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getReporteCurso(
    cursoId: string,
    desde?: string,
    hasta?: string,
    anioLectivo: number = 2026
  ): Observable<ReporteAsistenciaResponse> {
    const params: Record<string, string> = { anioLectivo: anioLectivo.toString() };
    if (desde) params['desde'] = desde;
    if (hasta) params['hasta'] = hasta;
    return this.http.get<ReporteAsistenciaResponse>(
      `${this.apiUrl}/api/reporte-asistencia/curso/${cursoId}`,
      { params }
    );
  }

  getDetalleEstudiante(
    estudianteId: string,
    desde?: string,
    hasta?: string
  ): Observable<DetalleAsistencia[]> {
    const params: Record<string, string> = {};
    if (desde) params['desde'] = desde;
    if (hasta) params['hasta'] = hasta;
    return this.http.get<DetalleAsistencia[]>(
      `${this.apiUrl}/api/reporte-asistencia/estudiante/${estudianteId}`,
      { params }
    );
  }
}
