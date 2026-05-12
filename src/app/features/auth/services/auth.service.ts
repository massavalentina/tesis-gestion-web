import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { LoginRequest } from '../models/login-request.model';
import { LoginResponse } from '../models/login-response.model';
import { SolicitarResetRequest } from '../models/solicitar-reset.model';
import { RestablecerContrasenaRequest } from '../models/restablecer-contrasena.model';
import { environment } from '../../../../environments/environment';

export interface UsuarioSesion {
  idUsuario: string;
  email: string;
  nombre: string;
  apellido: string;
  roles: string[];
  requiresPasswordChange: boolean;
  exp: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/api/auth`;
  private readonly _currentUser$ = new BehaviorSubject<UsuarioSesion | null>(null);

  get currentUser$(): Observable<UsuarioSesion | null> {
    return this._currentUser$.asObservable();
  }

  get isAuthenticated(): boolean {
    const user = this._currentUser$.value;
    if (!user) return false;
    return user.exp * 1000 > Date.now();
  }

  get currentUser(): UsuarioSesion | null {
    return this._currentUser$.value;
  }

  constructor(private http: HttpClient, private router: Router) {}

  login(dto: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, dto).pipe(
      tap(res => {
        if (!res.requiresPasswordChange) {
          this._guardarSesion(res);
        }
      })
    );
  }

  solicitarReset(dto: SolicitarResetRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/solicitar-reset`, dto);
  }

  restablecerContrasena(dto: RestablecerContrasenaRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/restablecer-contrasena`, dto).pipe(
      tap(res => this._guardarSesion(res))
    );
  }

  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    this._currentUser$.next(null);
    this.router.navigate(['/login']);
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  initFromStorage(): void {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const payload = this._decodificarToken(token);
    if (!payload) {
      this.logout();
      return;
    }

    if (payload.exp * 1000 <= Date.now()) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      this._currentUser$.next(null);
      return;
    }

    this._currentUser$.next(payload);
  }

  private _guardarSesion(res: LoginResponse): void {
    localStorage.setItem('accessToken', res.accessToken);
    localStorage.setItem('refreshToken', res.refreshToken);
    const payload = this._decodificarToken(res.accessToken);
    this._currentUser$.next(payload);
  }

  private _decodificarToken(token: string): UsuarioSesion | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(atob(parts[1]));
      return {
        idUsuario:              payload['sub'],
        email:                  payload['email'],
        nombre:                 payload['nombre'],
        apellido:               payload['apellido'],
        roles:                  Array.isArray(payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'])
                                  ? payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
                                  : payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
                                      ? [payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']]
                                      : [],
        requiresPasswordChange: payload['requiresPasswordChange'] === 'true',
        exp:                    payload['exp'],
      };
    } catch {
      return null;
    }
  }
}
