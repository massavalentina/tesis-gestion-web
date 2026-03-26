import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { OpcionSeleccion } from '../models/escaner.models';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ServicioCurso {

  private readonly urlBase = `${environment.apiUrl}/api/asistencia/scanner/cursosscanner`;

  constructor(private http: HttpClient) {}

  obtenerCursos(): Observable<OpcionSeleccion[]> {
    return this.http.get<OpcionSeleccion[]>(this.urlBase);
  }
}
