import { Routes } from '@angular/router';
import { WeatherComponent } from '../app/deploy-test/weather.component';
import { PaginaEscanerAsistencia } from './features/qr-scanner/pages/escaner.page';
import { PaginaGeneracionCredencialesQr } from './features/qr-credential-generation/pages/qr-credential-generation.page';
import { LayoutComponent } from './layouts/layout.component';
import { cambiosSinGuardarGuard } from './features/asistencia-general-manual/guards/cambios-sin-guardar.guard';

export const routes: Routes = [
  {
    path: 'weather-test',
    component: WeatherComponent
  },
  {
    path: 'qr-credentials/generation',
    component: PaginaGeneracionCredencialesQr
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
        canDeactivate: [cambiosSinGuardarGuard],
      },
      {
        path: 'parte-diario-digital',
        loadComponent: () =>
          import('../app/features/proximamente/proximamente.component')
            .then(m => m.ProximamenteComponent),
      },
      
      {
        path: 'attendance/scan',
        component: PaginaEscanerAsistencia
      },
      {
        path: 'credenciales-qr',
        loadComponent: () =>
          import('../app/features/credenciales-qr/components/credenciales-qr/credenciales-qr.component')
            .then(m => m.CredencialesQrComponent),
      },
      {
        path: 'cuenta',
        loadComponent: () =>
          import('../app/features/proximamente/proximamente.component')
            .then(m => m.ProximamenteComponent),
      }
    ],
  }
];
