import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ProgramaResumen, ProgramaDetalle, CrearProgramaDto } from '../models/programa.model';

@Injectable({ providedIn: 'root' })
export class ProgramaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/programas`;

  getProgramasPorEC(idEC: string): Observable<ProgramaResumen[]> {
    return this.http.get<ProgramaResumen[]>(`${this.base}/ec/${idEC}`);
  }

  getPrograma(id: string): Observable<ProgramaDetalle> {
    return this.http.get<ProgramaDetalle>(`${this.base}/${id}`);
  }

  crear(dto: CrearProgramaDto): Observable<ProgramaDetalle> {
    return this.http.post<ProgramaDetalle>(this.base, dto);
  }

  actualizar(id: string, dto: CrearProgramaDto): Observable<ProgramaDetalle> {
    return this.http.put<ProgramaDetalle>(`${this.base}/${id}`, dto);
  }

  cambiarEstado(id: string, estado: string): Observable<void> {
    return this.http.patch<void>(`${this.base}/${id}/estado`, { estado });
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
