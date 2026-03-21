import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ParteDiarioResumen } from '../models/parte-diario-resumen.model';
import { ComentarioParte }    from '../models/comentario-parte.model';
import { CursoManual }        from '../../asistencia-general-manual/models/curso-manual.model';

export interface ActualizarClaseDto {
  idEC:     string;
  fecha:    string;
  dictada:  boolean;
  tema?:    string;
  motivo?:  string;
}

export interface IntercambiarHorarioDto {
  idEC1:    string;
  idEC2:    string;
  cursoId:  string;
  fecha:    string;
}

export interface ReorganizarHorarioDto {
  cursoId:          string;
  fecha:            string;
  idECsOrdenados:   string[];
}

export interface AgregarComentarioDto {
  cursoId:   string;
  fecha:     string;
  contenido: string;
  autor:     string;
}

@Injectable({ providedIn: 'root' })
export class ParteDiarioService {

  private readonly apiUrl        = environment.apiUrl;
  private readonly parteUrl      = `${this.apiUrl}/api/parte-diario`;
  private readonly asistenciaUrl = `${this.apiUrl}/api/asistencia`;

  constructor(private http: HttpClient) {}

  getCursos(): Observable<CursoManual[]> {
    return this.http.get<CursoManual[]>(`${this.asistenciaUrl}/cursos`);
  }

  getResumen(cursoId: string, fecha: string): Observable<ParteDiarioResumen> {
    return this.http.get<ParteDiarioResumen>(this.parteUrl, {
      params: { cursoId, fecha },
    });
  }

  getComentarios(cursoId: string, fecha: string): Observable<ComentarioParte[]> {
    return this.http.get<ComentarioParte[]>(`${this.parteUrl}/comentarios`, {
      params: { cursoId, fecha },
    });
  }

  agregarComentario(dto: AgregarComentarioDto): Observable<ComentarioParte> {
    return this.http.post<ComentarioParte>(`${this.parteUrl}/comentarios`, dto);
  }

  actualizarClaseDictada(dto: ActualizarClaseDto): Observable<unknown> {
    return this.http.post(`${this.asistenciaUrl}/clase/estado`, dto);
  }

  intercambiarHorario(dto: IntercambiarHorarioDto): Observable<unknown> {
    return this.http.post(`${this.parteUrl}/horario/intercambiar`, dto);
  }

  resetearHorario(idEC: string, cursoId: string, fecha: string): Observable<unknown> {
    return this.http.post(`${this.parteUrl}/horario/resetear`, null, {
      params: { idEC, cursoId, fecha },
    });
  }

  reorganizarHorario(dto: ReorganizarHorarioDto): Observable<unknown> {
    return this.http.post(`${this.parteUrl}/horario/reorganizar`, dto);
  }
}
