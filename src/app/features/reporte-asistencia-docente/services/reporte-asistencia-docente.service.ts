import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { EspacioCurricular } from '../models/espacio-curricular.model';
import { ReporteDocenteResponse } from '../models/reporte-asistencia-docente.model';
import { DetalleDocenteRegistro } from '../models/detalle-docente.model';

@Injectable({ providedIn: 'root' })
export class ReporteAsistenciaDocenteService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getEspaciosCurriculares(cursoId: string): Observable<EspacioCurricular[]> {
    return this.http.get<EspacioCurricular[]>(
      `${this.apiUrl}/api/cursos/${cursoId}/espacios-curriculares`
    );
  }

  getReporteEspacio(
    idEC: string,
    cursoId: string,
    desde?: string,
    hasta?: string,
    anioLectivo: number = 2026
  ): Observable<ReporteDocenteResponse> {
    const params: Record<string, string> = { cursoId, anioLectivo: anioLectivo.toString() };
    if (desde) params['desde'] = desde;
    if (hasta) params['hasta'] = hasta;
    return this.http.get<ReporteDocenteResponse>(
      `${this.apiUrl}/api/reporte-asistencia/espacio/${idEC}`,
      { params }
    );
  }

  getDetalleEstudiante(
    idEC: string,
    estudianteId: string,
    desde?: string,
    hasta?: string
  ): Observable<DetalleDocenteRegistro[]> {
    const params: Record<string, string> = {};
    if (desde) params['desde'] = desde;
    if (hasta) params['hasta'] = hasta;
    return this.http.get<DetalleDocenteRegistro[]>(
      `${this.apiUrl}/api/reporte-asistencia/espacio/${idEC}/estudiante/${estudianteId}`,
      { params }
    );
  }
}
