import { Routes } from '@angular/router';
import { WeatherComponent } from '../app/deploy-test/weather.component';
import { PaginaEscanerAsistencia } from './features/qr-scanner/pages/escaner.page';

export const routes: Routes = [
  {
    path: 'weather-test',
    component: WeatherComponent
  },
  {
    path: 'attendance/scan',
    component: PaginaEscanerAsistencia
  }
];
