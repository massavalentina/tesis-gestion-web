import { Routes } from '@angular/router';
import { WeatherComponent } from '../app/deploy-test/weather.component';
import { LayoutComponent } from './layouts/layout.component';

export const routes: Routes = [
  {
    path: 'weather-test',
    component: WeatherComponent,
  },
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('../app/features/home/home/home.component')
            .then(m => m.HomeComponent),
      },
      {
        path: 'asistencia-rapida',
        loadComponent: () =>
          import('../app/features/asistencia-rapida/components/asistencia-rapida/asistencia-rapida.component')
            .then(m => m.AsistenciaRapidaComponent),
      },
      {
        path: 'asistencia-manual-curso',
        loadComponent: () =>
          import('../app/features/asistencia-general-manual/components/asistencia-general-manual.component')
            .then(m => m.AsistenciaGeneralManualComponent),
      },
      {
        path: 'asistencia-qr',
        loadComponent: () =>
          import('../app/features/proximamente/proximamente.component')
            .then(m => m.ProximamenteComponent),
      },
      {
        path: 'parte-diario-digital',
        loadComponent: () =>
          import('../app/features/proximamente/proximamente.component')
            .then(m => m.ProximamenteComponent),
      },
      {
        path: 'credenciales-qr',
        loadComponent: () =>
          import('../app/features/proximamente/proximamente.component')
            .then(m => m.ProximamenteComponent),
      },
      {
        path: 'cuenta',
        loadComponent: () =>
          import('../app/features/proximamente/proximamente.component')
            .then(m => m.ProximamenteComponent),
      },
    ],
  }
];
