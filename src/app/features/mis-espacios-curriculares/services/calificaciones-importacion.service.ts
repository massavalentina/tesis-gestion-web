import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ConfirmarImportacionPayload,
  ConfirmarImportacionResponse,
  ImportacionAnalisis,
} from '../models/calificaciones-importacion.model';

@Injectable({ providedIn: 'root' })
export class CalificacionesImportacionService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/calificaciones/importaciones`;

  analizar(idEC: string, archivo: File): Observable<ImportacionAnalisis> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return this.http.post<ImportacionAnalisis>(
      `${this.base}/ec/${idEC}/analizar`,
      formData,
    );
  }

  confirmar(
    idEC: string,
    archivo: File,
    payload: ConfirmarImportacionPayload,
  ): Observable<ConfirmarImportacionResponse> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    formData.append('payloadJson', JSON.stringify(payload));
    return this.http.post<ConfirmarImportacionResponse>(
      `${this.base}/ec/${idEC}/confirmar`,
      formData,
    );
  }
}
