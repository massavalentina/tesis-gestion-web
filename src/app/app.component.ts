import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { WeatherforecastService } from './weatherforecast.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  weatherForecastService = inject(WeatherforecastService);
  weathers: any[] = [];
  
  constructor() {
    this.weatherForecastService.getWeatherForecast().subscribe((data) => {
      this.weathers = data;
    });
  }
}
