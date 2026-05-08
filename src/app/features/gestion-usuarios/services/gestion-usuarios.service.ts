import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CrearUsuarioRequest, Usuario } from '../models/usuario.model';

@Injectable({ providedIn: 'root' })
export class GestionUsuariosService {
  private readonly base = `${environment.apiUrl}/api/usuario`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.base);
  }

  getOne(id: string): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.base}/${id}`);
  }

  crear(dto: CrearUsuarioRequest): Observable<Usuario> {
    return this.http.post<Usuario>(this.base, dto);
  }

  desactivar(id: string): Observable<void> {
    return this.http.patch<void>(`${this.base}/${id}/desactivar`, {});
  }

  activar(id: string): Observable<void> {
    return this.http.patch<void>(`${this.base}/${id}/activar`, {});
  }

  verificarEmail(email: string): Observable<void> {
    return this.http.get<void>(`${this.base}/verificar-email`, { params: { email } });
  }

  verificarDocumento(documento: string): Observable<void> {
    return this.http.get<void>(`${this.base}/verificar-documento`, { params: { documento } });
  }
}
