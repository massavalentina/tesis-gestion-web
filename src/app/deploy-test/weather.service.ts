import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';


export interface WeatherForecast {
  date: string;
  temperatureC: number;
  temperatureF: number;
  summary: string;
}

@Injectable({
  providedIn: 'root'
})
export class WeatherService {

  constructor() { }
  private http = inject(HttpClient);
  urlBase = environment.apiUrl + '/weatherforecast';

  public getWeatherForecast() {
    return this.http.get<any[]>(this.urlBase);
  }
}



