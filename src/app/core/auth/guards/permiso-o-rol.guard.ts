import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth.service';

/** Permite el acceso si el usuario es admin, tiene alguno de los permisos
 *  indicados, O tiene alguno de los roles indicados. */
export const permisoORolGuard = (codigos: string[], roles: string[]): CanActivateFn =>
  () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const usuario = authService.obtenerUsuario();
    if (usuario?.esAdmin) return true;
    const tieneAcceso =
      codigos.some(c => authService.tienePermiso(c)) ||
      roles.some(r => authService.tieneRol(r));
    return tieneAcceso ? true : router.createUrlTree(['/sin-permiso']);
  };
