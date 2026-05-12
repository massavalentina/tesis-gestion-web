import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth.service';

export const credencialesQrGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const usuario = authService.obtenerUsuario();
  if (!usuario) return router.createUrlTree(['/dev-login']);
  if (usuario.esAdmin) return true;
  return usuario.esPreceptorDelegado && authService.tienePermiso('CREDENCIALES_QR_RW')
    ? true
    : router.createUrlTree(['/sin-permiso']);
};
