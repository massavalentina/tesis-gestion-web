import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { UiPlatformService } from '../../core/services/ui-platform.service';

@Component({
  selector: 'app-dispositivo-no-permitido',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  template: `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:70vh;gap:16px;font-family:sans-serif">
      <mat-icon style="font-size:64px;width:64px;height:64px;color:#e53935">
        {{ uiPlatformService.isMobile ? 'desktop_windows' : 'smartphone' }}
      </mat-icon>
      <h2 style="margin:0;color:#333">Dispositivo no permitido</h2>
      <p style="margin:0;color:#666;text-align:center;max-width:340px">
        El dispositivo que estás usando no está permitido para esta función.<br>
        {{ uiPlatformService.isMobile
          ? 'Esta sección solo está disponible desde una computadora.'
          : 'Esta sección solo está disponible desde el celular.' }}
      </p>
      <button mat-stroked-button (click)="volver()">Volver al inicio</button>
    </div>
  `,
})
export class DispositivoNoPermitidoComponent {
  constructor(
    private router: Router,
    protected uiPlatformService: UiPlatformService,
  ) {}

  volver(): void {
    this.router.navigate(['/']);
  }
}
