import { Component, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { WeatherService } from './weather.service';

@Component({
  selector: 'app-weather',
  standalone: true,
  imports: [CommonModule], 
  templateUrl: './weather.component.html'
})

export class WeatherComponent {
  weatherForecastService = inject(WeatherService);
  weathers: any[] = [];
  
  constructor() {
    console.log('🔥 ESTE COMPONENTE SE CREÓ');
    this.weatherForecastService.getWeatherForecast().subscribe((data) => {
      this.weathers = data;
      console.log(this.weathers);
    });
  }

  ngOnInit(): void {
  this.weatherForecastService.getWeatherForecast().subscribe({
    next: data => {
      this.weathers = data;
      console.log('GET OK', data);
    },
    error: err => console.error(err)
  });
}
}

