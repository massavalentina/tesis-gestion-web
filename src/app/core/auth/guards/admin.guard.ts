import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth.service';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  if (!authService.estaLogueado()) return router.createUrlTree(['/dev-login']);
  return authService.tieneRol('Administrador')
    ? true
    : router.createUrlTree(['/sin-permiso']);
};
