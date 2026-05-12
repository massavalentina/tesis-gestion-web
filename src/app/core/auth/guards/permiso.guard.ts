import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth.service';

export const permisoGuard = (codigo: string): CanActivateFn =>
  () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const usuario = authService.obtenerUsuario();
    if (usuario?.esAdmin) return true;
    return authService.tienePermiso(codigo)
      ? true
      : router.createUrlTree(['/sin-permiso']);
  };
