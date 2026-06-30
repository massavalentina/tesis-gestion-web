import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../../features/auth/services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.estaLogueado()) return true;

  // Access token expirado pero hay refresh token: dejar pasar.
  // El interceptor renovará la sesión en el primer 401.
  if (authService.obtenerRefreshToken()) return true;

  return router.createUrlTree(['/login']);
};
