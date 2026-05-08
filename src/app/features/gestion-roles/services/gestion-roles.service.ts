import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { UsuarioConRoles } from '../models/usuario-con-roles.model';
import { Rol } from '../models/rol.model';

@Injectable({ providedIn: 'root' })
export class GestionRolesService {
  private readonly base = `${environment.apiUrl}/api/usuarios-roles`;

  constructor(private http: HttpClient) {}

  getUsuarios(): Observable<UsuarioConRoles[]> {
    return this.http.get<UsuarioConRoles[]>(this.base);
  }

  getRoles(): Observable<Rol[]> {
    return this.http.get<Rol[]>(`${this.base}/roles`);
  }

  asignarRol(idUsuario: string, idRol: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${idUsuario}/roles/${idRol}`, null);
  }

  quitarRol(idUsuario: string, idRol: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${idUsuario}/roles/${idRol}`);
  }

  actualizarDelegado(idUsuario: string, esDelegado: boolean): Observable<void> {
    return this.http.patch<void>(
      `${this.base}/${idUsuario}/preceptor-delegado`,
      { esDelegado },
    );
  }
}
