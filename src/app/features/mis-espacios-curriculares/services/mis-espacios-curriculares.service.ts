import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { MisEcItem } from '../models/mis-ec.model';

@Injectable({ providedIn: 'root' })
export class MisEspaciosCurricularesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/docentes`;

  getMisEspaciosCurriculares(): Observable<MisEcItem[]> {
    return this.http.get<MisEcItem[]>(`${this.base}/mis-espacios-curriculares`);
  }

  getEspacioCurricularPorId(idEC: string): Observable<MisEcItem> {
    return this.http.get<MisEcItem>(`${environment.apiUrl}/api/espacios-curriculares/${idEC}`);
  }
}
