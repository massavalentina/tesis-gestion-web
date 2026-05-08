import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-sin-permiso',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  template: `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:70vh;gap:16px;font-family:sans-serif">
      <mat-icon style="font-size:64px;width:64px;height:64px;color:#e53935">lock</mat-icon>
      <h2 style="margin:0;color:#333">Sin permiso</h2>
      <p style="margin:0;color:#666;text-align:center;max-width:320px">
        No tenés permisos para acceder a esta sección.<br>
        Contactá al administrador si creés que es un error.
      </p>
      <button mat-stroked-button (click)="volver()">Volver al inicio</button>
    </div>
  `,
})
export class SinPermisoComponent {
  constructor(private router: Router) {}

  volver(): void {
    this.router.navigate(['/']);
  }
}
