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
  permisos: string[];
  esAdmin: boolean;
  esPreceptorDelegado: boolean;
  requiresPasswordChange: boolean;
  exp: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/api/auth`;
  private readonly ACCESS_TOKEN_KEY = 'accessToken';
  private readonly REFRESH_TOKEN_KEY = 'refreshToken';
  private readonly _currentUser$ = new BehaviorSubject<UsuarioSesion | null>(null);

  get currentUser$(): Observable<UsuarioSesion | null> {
    return this._currentUser$.asObservable();
  }

  get currentUser(): UsuarioSesion | null {
    return this._currentUser$.value;
  }

  get isAuthenticated(): boolean {
    const user = this._currentUser$.value;
    if (!user) return false;
    return user.exp * 1000 > Date.now();
  }

  get requiresPasswordChange(): boolean {
    return this._currentUser$.value?.requiresPasswordChange ?? false;
  }

  constructor(private http: HttpClient, private router: Router) {}

  // ── HTTP methods ──────────────────────────────────────────────────────────

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

  // ── Session management ────────────────────────────────────────────────────

  /** Stores tokens and updates the current user session (used by dev-login). */
  guardarTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    const payload = this._decodificarToken(accessToken);
    this._currentUser$.next(payload);
  }

  logout(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    this._currentUser$.next(null);
    this.router.navigate(['/login']);
  }

  /** Alias for logout() — used by guards and components that call cerrarSesion(). */
  cerrarSesion(): void {
    this.logout();
  }

  initFromStorage(): void {
    const token = localStorage.getItem(this.ACCESS_TOKEN_KEY);
    if (!token) return;

    const payload = this._decodificarToken(token);
    if (!payload) {
      this.logout();
      return;
    }

    if (payload.exp * 1000 <= Date.now()) {
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      this._currentUser$.next(null);
      return;
    }

    this._currentUser$.next(payload);
  }

  // ── Token accessors ───────────────────────────────────────────────────────

  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  obtenerAccessToken(): string | null {
    return this.getAccessToken();
  }

  obtenerRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  // ── User info ─────────────────────────────────────────────────────────────

  obtenerUsuario(): UsuarioSesion | null {
    return this._currentUser$.value;
  }

  estaLogueado(): boolean {
    return this.isAuthenticated;
  }

  tienePermiso(codigo: string): boolean {
    return this._currentUser$.value?.permisos.includes(codigo) ?? false;
  }

  tieneRol(rol: string): boolean {
    return this._currentUser$.value?.roles.includes(rol) ?? false;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private _guardarSesion(res: LoginResponse): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, res.accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, res.refreshToken);
    const payload = this._decodificarToken(res.accessToken);
    this._currentUser$.next(payload);
  }

  private _decodificarToken(token: string): UsuarioSesion | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(atob(parts[1]));
      return {
        idUsuario:              payload['idUsuario'] ?? '',
        email:                  payload['email'] ?? '',
        nombre:                 payload['nombre'] ?? '',
        apellido:               payload['apellido'] ?? '',
        roles:                  this._parsearClaim(payload['roles']),
        permisos:               this._parsearClaim(payload['permisos']),
        esAdmin:                payload['es_admin'] === 'true',
        esPreceptorDelegado:    payload['tipo_preceptor'] === 'delegado',
        requiresPasswordChange: payload['requiresPasswordChange'] === 'true',
        exp:                    payload['exp'],
      };
    } catch {
      return null;
    }
  }

  private _parsearClaim(valor: unknown): string[] {
    if (Array.isArray(valor)) return valor as string[];
    if (typeof valor === 'string') return [valor];
    return [];
  }
}
