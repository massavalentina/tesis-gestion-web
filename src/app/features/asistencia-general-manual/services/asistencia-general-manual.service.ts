import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CursoManual }               from '../models/curso-manual.model';
import { EstudianteManual }          from '../models/estudiante-manual.model';
import { TipoAsistenciaManual, CODIGOS_INTERNOS } from '../models/tipo-asistencia-manual.model';
import { RegistrarAsistenciaManual } from '../models/registrar-asistencia-manual.model';

export interface AsistenciaManualResponse {
  id:         string;
  valorTotal: number;
  mensaje:    string;
}

export interface AsistenciaExistenteHoy {
  documento:    string;
  codigoManana: string;
  codigoTarde:  string;
}

@Injectable({ providedIn: 'root' })
export class AsistenciaGeneralManualService {

  private readonly cursosUrl     = 'https://localhost:7146/api/cursos';
  private readonly asistenciaUrl = 'https://localhost:7146/api/asistencia';
  private readonly tiposUrl      = 'https://localhost:7146/api/asistencia-rapida/tipos';
  private readonly servertimeUrl = 'https://localhost:7146/api/asistencia-rapida/servertime';

  constructor(private http: HttpClient) {}

  // ── Cursos ────────────────────────────────────────────────────────────────
  getCursos(anioLectivo = 2026): Observable<CursoManual[]> {
    return this.http.get<CursoManual[]>(
      `${this.cursosUrl}`,
      { params: { anioLectivo: String(anioLectivo) } }
    );
  }

  // ── Estudiantes de un curso ───────────────────────────────────────────────
  getEstudiantesByCurso(cursoId: string): Observable<EstudianteManual[]> {
    return this.http.get<EstudianteManual[]>(`${this.cursosUrl}/${cursoId}/estudiantes`);
  }

  // ── Tipos (reutiliza el endpoint de asistencia-rápida, filtra RE y RAE) ───
  getTiposAsistencia(): Observable<TipoAsistenciaManual[]> {
    return this.http.get<TipoAsistenciaManual[]>(this.tiposUrl).pipe(
      map(tipos => tipos.filter(t => !CODIGOS_INTERNOS.has(t.codigo.toUpperCase())))
    );
  }

  // ── Asistencias ya registradas hoy (para pre-cargar la tabla) ────────────
  getAsistenciasDelDia(fecha: string): Observable<AsistenciaExistenteHoy[]> {
    return this.http.get<AsistenciaExistenteHoy[]>(
      this.asistenciaUrl,
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
}








