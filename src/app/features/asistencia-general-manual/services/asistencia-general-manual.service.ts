import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CursoManual }               from '../models/curso-manual.model';
import { EstudianteManual }          from '../models/estudiante-manual.model';
import { TipoAsistenciaManual, CODIGOS_INTERNOS } from '../models/tipo-asistencia-manual.model';
import { RegistrarAsistenciaManual } from '../models/registrar-asistencia-manual.model';
import { AsistenciaEspacioItem }     from '../models/asistencia-estudiante-dia.model';
import { RetiroActivo }              from '../../retiro-anticipado/models/retiro-activo.model';

export interface AsistenciaManualResponse {
  id:         string;
  valorTotal: number;
  mensaje:    string;
}

export interface AsistenciaExistenteHoy {
  documento:           string;
  codigoManana:        string;
  codigoLlegadaManana: string | null;
  codigoTarde:         string;
  valorTotal:          number;
}

@Injectable({ providedIn: 'root' })
export class AsistenciaGeneralManualService {

  private readonly cursosUrl     = 'https://localhost:7146/api/cursos';
  private readonly asistenciaUrl = 'https://localhost:7146/api/asistencia';
  private readonly tiposUrl      = 'https://localhost:7146/api/asistencia-rapida/tipos';
  private readonly servertimeUrl = 'https://localhost:7146/api/asistencia-rapida/servertime';

  constructor(private http: HttpClient) {}

  // ── Cursos ────────────────────────────────────────────────────────────────
  getCursos(): Observable<CursoManual[]> {
    return this.http.get<CursoManual[]>(`${this.asistenciaUrl}/cursos`);
  }

  // ── Estudiantes de un curso ───────────────────────────────────────────────
  getEstudiantesByCurso(cursoId: string): Observable<EstudianteManual[]> {
    return this.http.get<EstudianteManual[]>(`${this.cursosUrl}/${cursoId}/estudiantes`);
  }

  // ── Tipos seleccionables (filtra RE y RAE — solo para <mat-option>) ────────
  getTiposAsistencia(): Observable<TipoAsistenciaManual[]> {
    return this.http.get<TipoAsistenciaManual[]>(this.tiposUrl).pipe(
      map(tipos => tipos.filter(t => !CODIGOS_INTERNOS.has(t.codigo.toUpperCase())))
    );
  }

  // ── Todos los tipos (incluyendo internos RE/RAE) — solo para display ──────
  getTodosTiposAsistencia(): Observable<TipoAsistenciaManual[]> {
    return this.http.get<TipoAsistenciaManual[]>(this.tiposUrl);
  }

  // ── Asistencias ya registradas hoy (para pre-cargar la tabla) ────────────
  getAsistenciasDelDia(fecha: string): Observable<AsistenciaExistenteHoy[]> {
    return this.http.get<AsistenciaExistenteHoy[]>(
      this.asistenciaUrl,
      { params: { fecha } }
    );
  }

  // ── Turnos disponibles de un curso para una fecha ────────────────────────
  getTurnosCurso(cursoId: string, fecha: string): Observable<{ tieneTarde: boolean }> {
    return this.http.get<{ tieneTarde: boolean }>(
      `${this.asistenciaUrl}/cursos/${cursoId}/turnos`,
      { params: { fecha } }
    );
  }

  // ── Registrar lote ────────────────────────────────────────────────────────
  registrarLote(lista: RegistrarAsistenciaManual[]): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(`${this.asistenciaUrl}/lote`, lista);
  }

  // ── Server time (reutiliza el endpoint existente) ─────────────────────────
  getServerTime(): Observable<{ fecha: string; hora: string }> {
    return this.http.get<{ fecha: string; hora: string }>(this.servertimeUrl);
  }

  // ── Asistencia por Espacio Curricular de un día ───────────────────────────
  getAsistenciaEspaciosDia(estudianteId: string, fecha: string): Observable<AsistenciaEspacioItem[]> {
    return this.http.get<AsistenciaEspacioItem[]>(
      `${this.asistenciaUrl}/estudiante/${estudianteId}/dia/${fecha}`
    ).pipe(map(items => items.map(i => ({ ...i, guardando: false, presenteOriginal: i.presente }))));
  }

  actualizarAsistenciaEspacio(dto: { estudianteId: string; idClaseDictada: string; presente: boolean }): Observable<void> {
    return this.http.put<void>(`${this.asistenciaUrl}/espacio`, dto);
  }

  // ── Retiro activo del estudiante para el día ──────────────────────────────
  getRetiroActivo(estudianteId: string, fecha: string): Observable<RetiroActivo | null> {
    return this.http.get<RetiroActivo | null>(
      `https://localhost:7146/api/retiro/activo`,
      { params: { estudianteId, fecha } }
    );
  }
}








