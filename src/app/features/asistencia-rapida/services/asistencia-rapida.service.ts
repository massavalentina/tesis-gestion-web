import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { TipoAsistenciaRapida } from '../models/tipo-asistencia-rapida.model';
import { AsistenciaRapidaResponse } from '../models/asistencia-rapida-response.model';
import { RegistrarAsistenciaRapida } from '../models/registrar-asistencia-rapida.model';
import { EstudianteBusquedaRapida } from '../models/estudiante-busqueda-rapida.model';

@Injectable({ providedIn: 'root' })
export class AsistenciaRapidaService {
  private readonly apiUrl = 'https://localhost:7146/api/asistencia-rapida';

  constructor(private http: HttpClient) {}

  getTiposAsistencia(): Observable<TipoAsistenciaRapida[]> {
    return this.http.get<TipoAsistenciaRapida[]>(`${this.apiUrl}/tipos`);
  }

  buscarEstudiantesRapido(texto: string): Observable<EstudianteBusquedaRapida[]> {
    return this.http.get<EstudianteBusquedaRapida[]>(
      `${this.apiUrl}/buscar-estudiantes`,
      { params: { texto } }
    );
  }

  registrarAsistencia(dto: RegistrarAsistenciaRapida): Observable<AsistenciaRapidaResponse> {
    return this.http.post<AsistenciaRapidaResponse>(`${this.apiUrl}`, dto);
  }

  // ✅ server time para el modal
  getServerTime(): Observable<{ fecha: string; hora: string }> {
    return this.http.get<{ fecha: string; hora: string }>(`${this.apiUrl}/servertime`);
  }
}

