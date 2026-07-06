import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  EventoInstitucional,
  EventoDocente,
  CrearEventoRequest,
  AuditoriaEvento,
  TipoEvento,
  CursoSeleccion,
  EcSeleccion,
} from '../models/calendario.model';

@Injectable({ providedIn: 'root' })
export class CalendarioService {
  private readonly base = `${environment.apiUrl}/api/calendario`;

  constructor(private http: HttpClient) {}

  obtenerEventos(anioLectivo: number): Observable<EventoInstitucional[]> {
    return this.http.get<EventoInstitucional[]>(
      `${this.base}/eventos`, { params: { anioLectivo } }
    );
  }

  obtenerEvento(id: string): Observable<EventoInstitucional> {
    return this.http.get<EventoInstitucional>(`${this.base}/eventos/${id}`);
  }

  crearEvento(dto: CrearEventoRequest): Observable<EventoInstitucional> {
    return this.http.post<EventoInstitucional>(`${this.base}/eventos`, dto);
  }

  actualizarEvento(id: string, dto: CrearEventoRequest): Observable<EventoInstitucional> {
    return this.http.put<EventoInstitucional>(`${this.base}/eventos/${id}`, dto);
  }

  eliminarEvento(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/eventos/${id}`);
  }

  obtenerAuditoriaEvento(id: string): Observable<AuditoriaEvento[]> {
    return this.http.get<AuditoriaEvento[]>(`${this.base}/eventos/${id}/auditoria`);
  }

  obtenerAuditoriaGeneral(anioLectivo: number): Observable<AuditoriaEvento[]> {
    return this.http.get<AuditoriaEvento[]>(
      `${this.base}/auditoria`, { params: { anioLectivo } }
    );
  }

  obtenerTiposEvento(): Observable<TipoEvento[]> {
    return this.http.get<TipoEvento[]>(`${this.base}/tipos-evento`);
  }

  obtenerCursos(anioLectivo: number): Observable<CursoSeleccion[]> {
    return this.http.get<CursoSeleccion[]>(
      `${this.base}/cursos`, { params: { anioLectivo } }
    );
  }

  obtenerEventosDocente(anioLectivo: number): Observable<EventoDocente[]> {
    return this.http.get<EventoDocente[]>(
      `${this.base}/eventos-docente`, { params: { anioLectivo } }
    );
  }

  obtenerEcsDocente(anioLectivo: number): Observable<EcSeleccion[]> {
    return this.http.get<EcSeleccion[]>(
      `${this.base}/espacios-curriculares`, { params: { anioLectivo } }
    );
  }
}
