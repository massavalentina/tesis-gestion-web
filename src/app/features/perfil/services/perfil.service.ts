import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ActualizarPerfilRequest {
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
}

export interface PerfilUsuario {
  idUsuario: string;
  nombre: string;
  apellido: string;
  email: string;
  documento: string;
  telefono?: string | null;
  activo: boolean;
  fechaCreacion: string;
  roles: string[];
}

@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly apiUrl = `${environment.apiUrl}/api/usuario`;

  constructor(private http: HttpClient) {}

  obtener(id: string): Observable<PerfilUsuario> {
    return this.http.get<PerfilUsuario>(`${this.apiUrl}/${id}`);
  }

  actualizar(id: string, dto: ActualizarPerfilRequest): Observable<PerfilUsuario> {
    return this.http.put<PerfilUsuario>(`${this.apiUrl}/${id}/perfil`, dto);
  }
}
