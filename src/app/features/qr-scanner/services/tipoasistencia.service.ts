import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { OpcionSeleccion } from '../models/escaner.models';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ServicioTipoAsistencia {

  private readonly urlBase = `${environment.apiUrl}/api/asistencia/scanner/tipos-asistencia`;

  constructor(private http: HttpClient) {}

  obtenerTipos(): Observable<OpcionSeleccion[]> {
    return this.http.get<OpcionSeleccion[]>(this.urlBase);
  }
}
