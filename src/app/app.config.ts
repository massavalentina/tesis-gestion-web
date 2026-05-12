import { APP_INITIALIZER, ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideNativeDateAdapter } from '@angular/material/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { AuthService } from './features/auth/services/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withFetch()
    , withInterceptors([authInterceptor])
    ),
    provideNativeDateAdapter(),
    provideAnimations(),
    {
      provide: APP_INITIALIZER,
      useFactory: (authService: AuthService) => () => authService.initFromStorage(),
      deps: [AuthService],
      multi: true,
    },
  ]
};
