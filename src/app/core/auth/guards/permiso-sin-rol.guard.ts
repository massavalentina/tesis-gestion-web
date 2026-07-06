import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../../features/auth/services/auth.service';

/** Igual que permisoGuard, pero bloquea explícitamente a los roles indicados
 *  aunque el usuario tenga el permiso (ej: permiso que no debería aplicar para ese rol). */
export const permisoSinRolGuard = (codigo: string, rolesExcluidos: string[]): CanActivateFn =>
  () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const usuario = authService.obtenerUsuario();
    if (usuario?.esAdmin) return true;
    if (rolesExcluidos.some(r => authService.tieneRol(r))) {
      return router.createUrlTree(['/sin-permiso']);
    }
    return authService.tienePermiso(codigo)
      ? true
      : router.createUrlTree(['/sin-permiso']);
  };
