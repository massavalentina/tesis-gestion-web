import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  DocenteECsResponse,
  ECsinDocente,
  PreceptorCursosResponse,
  CursoSinPreceptor,
} from '../models/asignacion.model';

@Injectable({ providedIn: 'root' })
export class AsignacionService {
  private readonly api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ── Docente ────────────────────────────────────────────────────────────
  getECsDocente(idDocente: string): Observable<DocenteECsResponse> {
    return this.http.get<DocenteECsResponse>(`${this.api}/api/docentes/${idDocente}/espacios-curriculares`);
  }

  getECsSinDocente(): Observable<ECsinDocente[]> {
    return this.http.get<ECsinDocente[]>(`${this.api}/api/espacios-curriculares/sin-docente`);
  }

  asignarEC(idDocente: string, idEC: string): Observable<void> {
    return this.http.post<void>(`${this.api}/api/docentes/${idDocente}/espacios-curriculares`, { idEC });
  }

  desasignarECs(idDocente: string, motivo: string): Observable<void> {
    return this.http.post<void>(`${this.api}/api/docentes/${idDocente}/desasignar`, { motivo });
  }

  desasignarEC(idDocente: string, idDocenteEC: string, motivo: string): Observable<void> {
    return this.http.post<void>(`${this.api}/api/docentes/${idDocente}/espacios-curriculares/${idDocenteEC}/desasignar`, { motivo });
  }

  // ── Preceptor ──────────────────────────────────────────────────────────
  getCursosPreceptor(idPreceptor: string): Observable<PreceptorCursosResponse> {
    return this.http.get<PreceptorCursosResponse>(`${this.api}/api/preceptores/${idPreceptor}/cursos`);
  }

  getCursosSinPreceptor(): Observable<CursoSinPreceptor[]> {
    return this.http.get<CursoSinPreceptor[]>(`${this.api}/api/cursos/sin-preceptor`);
  }

  asignarCurso(idPreceptor: string, idCurso: string): Observable<void> {
    return this.http.post<void>(`${this.api}/api/preceptores/${idPreceptor}/cursos`, { idCurso });
  }

  desasignarCursos(idPreceptor: string, motivo: string): Observable<void> {
    return this.http.post<void>(`${this.api}/api/preceptores/${idPreceptor}/desasignar`, { motivo });
  }

  desasignarCurso(idPreceptor: string, idPreceptorCurso: string, motivo: string): Observable<void> {
    return this.http.post<void>(`${this.api}/api/preceptores/${idPreceptor}/cursos/${idPreceptorCurso}/desasignar`, { motivo });
  }
}
