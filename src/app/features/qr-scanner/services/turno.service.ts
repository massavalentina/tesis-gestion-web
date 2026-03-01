import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { OpcionSeleccion } from '../models/escaner.models';

@Injectable({ providedIn: 'root' })
export class ServicioTurno {

  private readonly urlBase = 'http://localhost:5050/api/attendance/turnos';

  constructor(private http: HttpClient) {}

  obtenerTurnos(): Observable<OpcionSeleccion[]> {
    return this.http.get<OpcionSeleccion[]>(this.urlBase);
  }
}
