import { inject, Injectable } from '@angular/core';
import { environment } from '../environments/environment.development';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class WeatherforecastService {

  constructor() { }
  private http = inject(HttpClient);
  urlBase = environment.apiUrl + '/weatherforecast';

  public getWeatherForecast() {
    return this.http.get<any[]>(this.urlBase);
  }
}
