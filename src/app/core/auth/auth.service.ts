import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

export interface UsuarioLogueado {
  idUsuario: string;
  nombre: string;
  roles: string[];
  permisos: string[];
  esAdmin: boolean;
  esPreceptorDelegado: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';

  constructor(private router: Router) {}

  guardarTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
  }

  obtenerAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  obtenerRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  obtenerUsuario(): UsuarioLogueado | null {
    const token = this.obtenerAccessToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        idUsuario: payload['idUsuario'] ?? '',
        nombre: payload['nombre'] ?? '',
        roles: this.parsearClaim(payload['roles']),
        permisos: this.parsearClaim(payload['permisos']),
        esAdmin: payload['es_admin'] === 'true',
        esPreceptorDelegado: payload['tipo_preceptor'] === 'delegado',
      };
    } catch {
      return null;
    }
  }

  tienePermiso(codigo: string): boolean {
    return this.obtenerUsuario()?.permisos.includes(codigo) ?? false;
  }

  tieneRol(rol: string): boolean {
    return this.obtenerUsuario()?.roles.includes(rol) ?? false;
  }

  estaLogueado(): boolean {
    const token = this.obtenerAccessToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload['exp'] > Date.now() / 1000;
    } catch {
      return false;
    }
  }

  cerrarSesion(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }

  private parsearClaim(valor: unknown): string[] {
    if (Array.isArray(valor)) return valor as string[];
    if (typeof valor === 'string') return [valor];
    return [];
  }
}
