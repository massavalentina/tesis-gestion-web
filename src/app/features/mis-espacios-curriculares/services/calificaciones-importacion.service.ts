import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ActualizarImportacionRevisionRequest,
  ConfirmarImportacionResponse,
  ImportacionCalificacionesDetalle,
  ImportacionConfirmacion,
  ImportacionRevision,
} from '../models/calificaciones-importacion.model';

@Injectable({ providedIn: 'root' })
export class CalificacionesImportacionService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/calificaciones/importaciones`;

  getActiva(idEC: string): Observable<ImportacionCalificacionesDetalle | null> {
    return this.http.get<ImportacionCalificacionesDetalle>(
      `${this.base}/ec/${idEC}/activa`,
      { observe: 'response' },
    ).pipe(
      map((response: HttpResponse<ImportacionCalificacionesDetalle>) => response.body ?? null),
    );
  }

  analizar(idEC: string, archivo: File): Observable<ImportacionCalificacionesDetalle> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return this.http.post<ImportacionCalificacionesDetalle>(
      `${this.base}/ec/${idEC}/analizar`,
      formData,
    );
  }

  getDetalle(idImportacion: string): Observable<ImportacionCalificacionesDetalle> {
    return this.http.get<ImportacionCalificacionesDetalle>(`${this.base}/${idImportacion}`);
  }

  reanalizar(idImportacion: string): Observable<ImportacionCalificacionesDetalle> {
    return this.http.post<ImportacionCalificacionesDetalle>(
      `${this.base}/${idImportacion}/reanalyze`,
      {},
    );
  }

  getRevision(idImportacion: string): Observable<ImportacionRevision> {
    return this.http.get<ImportacionRevision>(`${this.base}/${idImportacion}/revision`);
  }

  guardarRevision(
    idImportacion: string,
    payload: ActualizarImportacionRevisionRequest,
  ): Observable<ImportacionRevision> {
    return this.http.put<ImportacionRevision>(
      `${this.base}/${idImportacion}/revision`,
      payload,
    );
  }

  getConfirmacion(idImportacion: string): Observable<ImportacionConfirmacion> {
    return this.http.get<ImportacionConfirmacion>(`${this.base}/${idImportacion}/confirmacion`);
  }

  confirmar(idImportacion: string): Observable<ConfirmarImportacionResponse> {
    return this.http.post<ConfirmarImportacionResponse>(
      `${this.base}/${idImportacion}/confirmar`,
      {},
    );
  }

  cancelar(idImportacion: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${idImportacion}/cancelar`, {});
  }
}
