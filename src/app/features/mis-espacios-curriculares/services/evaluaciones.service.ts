import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { GestionEvaluaciones, InstanciaEvaluativaSlot } from '../models/evaluaciones.model';

@Injectable({ providedIn: 'root' })
export class EvaluacionesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/evaluaciones`;

  getGestion(idEC: string): Observable<GestionEvaluaciones> {
    return this.http.get<GestionEvaluaciones>(`${this.base}/ec/${idEC}`);
  }

  guardarArchivo(idEC: string, nro: number, tipo: string, form: FormData): Observable<InstanciaEvaluativaSlot> {
    return this.http.put<InstanciaEvaluativaSlot>(
      `${this.base}/ec/${idEC}/instancias/${nro}/archivos/${tipo}`,
      form,
    );
  }

  cambiarEstado(idEC: string, nro: number, estado: string): Observable<InstanciaEvaluativaSlot> {
    return this.http.put<InstanciaEvaluativaSlot>(`${this.base}/ec/${idEC}/instancias/${nro}/estado`, { estado });
  }

  eliminarArchivo(idEC: string, nro: number, tipo: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/ec/${idEC}/instancias/${nro}/archivos/${tipo}`);
  }
}
