import { Routes } from '@angular/router';
import { WeatherComponent } from '../app/deploy-test/weather.component';
import { LayoutComponent } from './layouts/layout.component';

export const routes: Routes = [
  {
    path: 'weather-test',
    component: WeatherComponent
  },
  {
     path: '',
    component: LayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('../app/features/home/home/home.component').then(m => m.HomeComponent),
      },
    ],
  }
  
];
