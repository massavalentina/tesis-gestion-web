import { Routes } from '@angular/router';
import { WeatherComponent } from '../app/deploy-test/weather.component';
import { AttendanceScanPage } from './features/qr-scanner/pages/scanner.page';

export const routes: Routes = [
  {
    path: 'weather-test',
    component: WeatherComponent
  },
  {
    path: 'attendance/scan',
    component: AttendanceScanPage
  }
];
