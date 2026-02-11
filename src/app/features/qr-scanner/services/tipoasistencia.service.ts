import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SelectOption } from '../models/scanner.models';

@Injectable({ providedIn: 'root' })
export class TipoAsistenciaService {

  private readonly baseUrl =
    'http://localhost:5050/api/attendance/tipos-asistencia';

  constructor(private http: HttpClient) {}

  getTipos(): Observable<SelectOption[]> {
    return this.http.get<SelectOption[]>(this.baseUrl);
  }
}
