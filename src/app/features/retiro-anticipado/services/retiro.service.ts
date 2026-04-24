import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment }        from '../../../../environments/environment';
import { RetiroActivo }       from '../models/retiro-activo.model';
import { TutorEstudiante }   from '../models/tutor-estudiante.model';
import { RegistrarRetiro }   from '../models/registrar-retiro.model';
import { RegistrarReingreso } from '../models/registrar-reingreso.model';

@Injectable({ providedIn: 'root' })
export class RetiroService {

  private readonly base = `${environment.apiUrl}/api/retiro`;

  constructor(private http: HttpClient) {}

  getTutoresEstudiante(estudianteId: string): Observable<TutorEstudiante[]> {
    return this.http.get<TutorEstudiante[]>(`${this.base}/estudiante/${estudianteId}/tutores`);
  }

  getRetirosActivos(estudianteId: string, fecha: string): Observable<RetiroActivo[]> {
    return this.http.get<RetiroActivo[]>(`${this.base}/activos`, {
      params: { estudianteId, fecha },
    });
  }

  registrarRetiro(dto: RegistrarRetiro): Observable<RetiroActivo> {
    return this.http.post<RetiroActivo>(this.base, dto);
  }

  registrarReingreso(dto: RegistrarReingreso): Observable<RetiroActivo> {
    return this.http.post<RetiroActivo>(`${this.base}/reingreso`, dto);
  }

  actualizarRetiro(idRetiro: string, dto: {
    horarioRetiro:          string;
    nombrePreceptor:        string;
    motivo?:                string;
    conReingreso?:          boolean;
    horarioLimiteReingreso?: string;
    horarioReingreso?:       string;
    nombreResponsable?:      string;
    apellidoResponsable?:    string;
    dNIResponsable?:         string;
    relacionResponsable?:    string;
    telefonoResponsable?:    string;
    correoResponsable?:      string;
  }): Observable<RetiroActivo> {
    return this.http.put<RetiroActivo>(`${this.base}/${idRetiro}`, dto);
  }

  cancelarRetiro(idRetiro: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${idRetiro}`);
  }
}
