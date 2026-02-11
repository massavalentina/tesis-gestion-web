import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SelectOption } from '../models/scanner.models';

@Injectable({ providedIn: 'root' })
export class TurnoService {

  private readonly baseUrl = 'http://localhost:5050/api/attendance/turnos';

  constructor(private http: HttpClient) {}

  getTurnos(): Observable<SelectOption[]> {
    return this.http.get<SelectOption[]>(this.baseUrl);
  }
}
