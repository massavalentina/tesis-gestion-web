import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ArbolPlanificacionDto,
  UnidadArbolDto,
  TemaArbolDto,
  ClasePlanificacionDto,
  CrearItemDto,
} from '../models/planificacion.model';

@Injectable({ providedIn: 'root' })
export class PlanificacionService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/planificaciones`;

  getArbol(idEC: string): Observable<ArbolPlanificacionDto> {
    return this.http.get<ArbolPlanificacionDto>(`${this.base}/ec/${idEC}`);
  }

  crearUnidad(idEC: string, dto: CrearItemDto): Observable<UnidadArbolDto> {
    return this.http.post<UnidadArbolDto>(`${this.base}/ec/${idEC}/unidades`, dto);
  }

  crearTema(idEC: string, idUnidad: string, dto: CrearItemDto): Observable<TemaArbolDto> {
    return this.http.post<TemaArbolDto>(`${this.base}/ec/${idEC}/unidades/${idUnidad}/temas`, dto);
  }

  crearClase(idEC: string, form: FormData): Observable<ClasePlanificacionDto> {
    return this.http.post<ClasePlanificacionDto>(`${this.base}/ec/${idEC}/clases`, form);
  }

  editarClase(idClase: string, form: FormData): Observable<ClasePlanificacionDto> {
    return this.http.put<ClasePlanificacionDto>(`${this.base}/clases/${idClase}`, form);
  }

  cambiarEstadoClase(idClase: string, estado: string): Observable<void> {
    return this.http.patch<void>(`${this.base}/clases/${idClase}/estado`, { estado });
  }

  eliminarClase(idClase: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/clases/${idClase}`);
  }
}
