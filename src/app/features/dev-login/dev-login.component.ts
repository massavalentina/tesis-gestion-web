// ⚠️ SOLO DESARROLLO — Eliminar este componente y su ruta antes de pasar a producción
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { environment } from '../../../environments/environment';

interface UsuarioDevItem {
  idUsuario: string;
  mail: string;
  roles: string[];
}

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

@Component({
  selector: 'app-dev-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- ⚠️ SOLO DESARROLLO - Eliminar antes de producción -->
    <div style="max-width:480px;margin:80px auto;font-family:monospace;border:2px dashed orange;padding:24px;border-radius:8px">
      <h2 style="margin:0 0 4px;color:darkorange">⚠️ DEV LOGIN</h2>
      <p style="margin:0 0 20px;color:#999;font-size:12px">Solo para desarrollo. Eliminar antes de producción.</p>

      <p *ngIf="cargando && !seleccionando" style="color:#999">Cargando usuarios...</p>
      <p *ngIf="seleccionando" style="color:#999">Iniciando sesión...</p>

      <ul *ngIf="!cargando && !seleccionando" style="list-style:none;padding:0;margin:0">
        <li
          *ngFor="let u of usuarios"
          (click)="seleccionar(u.idUsuario)"
          style="padding:12px;margin-bottom:8px;border:1px solid #e0e0e0;border-radius:6px;cursor:pointer;background:#fafafa"
        >
          <div style="font-weight:bold;font-size:14px">{{ u.mail }}</div>
          <div style="font-size:12px;color:#888;margin-top:2px">{{ u.roles.join(', ') || 'Sin roles' }}</div>
        </li>
        <li *ngIf="usuarios.length === 0" style="color:#999;text-align:center;padding:16px">
          No hay usuarios disponibles.
        </li>
      </ul>
    </div>
  `,
})
export class DevLoginComponent implements OnInit {
  usuarios: UsuarioDevItem[] = [];
  cargando = true;
  seleccionando = false;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.http
      .get<UsuarioDevItem[]>(`${environment.apiUrl}/api/dev/login/usuarios`)
      .subscribe({
        next: u => {
          this.usuarios = u;
          this.cargando = false;
        },
        error: () => (this.cargando = false),
      });
  }

  seleccionar(id: string): void {
    this.seleccionando = true;
    this.http
      .get<TokenResponse>(`${environment.apiUrl}/api/dev/login/${id}`)
      .subscribe({
        next: tokens => {
          this.authService.guardarTokens(tokens.accessToken, tokens.refreshToken);
          this.router.navigate(['/']);
        },
        error: () => (this.seleccionando = false),
      });
  }
}
