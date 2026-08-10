import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UiPlatformService } from '../../services/ui-platform.service';
import { PlatformVisibility } from '../../navigation/platform-visibility.config';

export const plataformaGuard: CanActivateFn = (route) => {
  const uiPlatformService = inject(UiPlatformService);
  const router = inject(Router);
  const visibility = route.data['platformVisibility'] as PlatformVisibility | undefined;
  return uiPlatformService.matchesVisibility(visibility)
    ? true
    : router.createUrlTree(['/dispositivo-no-permitido']);
};
