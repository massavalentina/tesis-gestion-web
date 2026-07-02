import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { RetiroReporteItem } from '../models/retiro-reporte-item.model';

export interface OpcionCurso {
  id: string;
  label: string;
}

@Injectable({ providedIn: 'root' })
export class ReporteRetirosService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getCursos(): Observable<OpcionCurso[]> {
    return this.http.get<OpcionCurso[]>(`${this.apiUrl}/api/asistencia/cursos`);
  }

  getReporte(desde: string, hasta: string, cursoId?: string): Observable<RetiroReporteItem[]> {
    const params: Record<string, string> = { desde, hasta };
    if (cursoId) params['cursoId'] = cursoId;
    return this.http.get<RetiroReporteItem[]>(`${this.apiUrl}/api/retiro/reporte`, { params });
  }
}
