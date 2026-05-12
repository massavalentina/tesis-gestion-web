import {
  HttpBackend,
  HttpClient,
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const httpBackend = inject(HttpBackend);

  const esRefresh = req.url.includes('/api/auth/refresh');
  const token = authService.obtenerAccessToken();

  const reqConToken =
    !esRefresh && token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(reqConToken).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !esRefresh) {
        const refreshToken = authService.obtenerRefreshToken();
        if (refreshToken) {
          // Usamos HttpBackend para evitar que esta llamada pase por el interceptor
          const httpSinInterceptores = new HttpClient(httpBackend);
          return httpSinInterceptores
            .post<RefreshResponse>(`${environment.apiUrl}/api/auth/refresh`, { refreshToken })
            .pipe(
              switchMap(tokens => {
                authService.guardarTokens(tokens.accessToken, tokens.refreshToken);
                const reintento = req.clone({
                  setHeaders: { Authorization: `Bearer ${tokens.accessToken}` },
                });
                return next(reintento);
              }),
              catchError(() => {
                authService.cerrarSesion();
                router.navigate(['/dev-login']);
                return throwError(() => error);
              })
            );
        }
        authService.cerrarSesion();
        router.navigate(['/dev-login']);
      }
      return throwError(() => error);
    })
  );
};
