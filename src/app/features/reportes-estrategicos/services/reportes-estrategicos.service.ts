import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { DashboardAsistencia, DashboardFiltros, OpcionCurso, OpcionEC } from '../models/dashboard-asistencia.model';

@Injectable({ providedIn: 'root' })
export class ReportesEstrategicosService {

  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  obtenerDashboardAsistencia(filtros: DashboardFiltros): Observable<DashboardAsistencia> {
    let params = new HttpParams().set('anioLectivo', filtros.anioLectivo.toString());
    if (filtros.desde) params = params.set('desde', filtros.desde);
    if (filtros.hasta) params = params.set('hasta', filtros.hasta);
    if (filtros.cursoId) params = params.set('cursoId', filtros.cursoId);
    if (filtros.ecId) params = params.set('ecId', filtros.ecId);

    return this.http.get<DashboardAsistencia>(
      `${this.apiUrl}/api/reportes-estrategicos/asistencia`,
      { params }
    );
  }

  obtenerCursos(): Observable<OpcionCurso[]> {
    return this.http.get<OpcionCurso[]>(`${this.apiUrl}/api/asistencia/cursos`);
  }

  obtenerEspaciosCurriculares(cursoId: string): Observable<OpcionEC[]> {
    return this.http.get<OpcionEC[]>(
      `${this.apiUrl}/api/cursos/${cursoId}/espacios-curriculares`
    );
  }
}
