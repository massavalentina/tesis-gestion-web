import { Routes } from '@angular/router';
import { WeatherComponent } from '../app/deploy-test/weather.component';
import { PaginaEscanerAsistencia } from './features/qr-scanner/pages/escaner.page';
import { PaginaGeneracionCredencialesQr } from './features/qr-credential-generation/pages/qr-credential-generation.page';

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
    path: 'attendance/scan',
    component: PaginaEscanerAsistencia
  }
];
