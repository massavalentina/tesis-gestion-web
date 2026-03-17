import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type QrEstado = 'NO_GENERADO' | 'PENDIENTE_ENVIO' | 'ENVIADO';

export interface CursoDto {
  idCurso: string;
  codigo: string;
}

export interface QrEmailResumenRequestDto {
  idCurso: string;
  incluirYaEnviados: boolean;
  anioLectivo?: number;
}

export interface QrEmailResumenDto {
  anioLectivo: number;
  idCurso: string;
  cursoCodigo: string;

  totalAlumnosActivos: number;
  conQrPendiente: number;
  yaEnviados: number;
  sinQrGenerado: number;

  estimacionSegundos: number;
  puedeIniciarEnvio: boolean;
  mensaje: string;
}

export interface QrEmailStartRequestDto {
  idCurso: string;
  incluirYaEnviados: boolean;
  anioLectivo?: number;
}

export interface QrEmailStartResponseDto {
  anioLectivo: number;
  idCurso: string;

  totalAlumnosActivos: number;
  procesados: number;
  enviados: number;
  omitidos: number;
  errores: number;

  detallesOmitidos: string[];
  detallesErrores: string[];
  mensaje: string;
}

export interface QrAlumnoEstadoDto {
  idEstudiante: string;
  nombreCompleto: string;
  dni: string;
  estado: QrEstado;
}

export type QrJobEstado = 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface QrEmailStartJobResponseDto {
  jobId: string;
}

export interface QrEmailProgressDto {
  jobId: string;
  estado: QrJobEstado;

  total: number;
  procesados: number;
  enviados: number;
  omitidos: number;
  errores: number;

  ultimoDestino?: string;
  ultimoMensaje?: string;

  inicio: string;
  fin?: string;
}

@Injectable({ providedIn: 'root' })
export class QrEmailApiService {
  private readonly baseUrl = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) {}

  getCursos(anioLectivo?: number): Observable<CursoDto[]> {
    let params = new HttpParams();
    if (anioLectivo) params = params.set('anioLectivo', anioLectivo);
    return this.http.get<CursoDto[]>(`${this.baseUrl}/cursos`, { params });
  }

  getResumen(req: QrEmailResumenRequestDto): Observable<QrEmailResumenDto> {
    return this.http.post<QrEmailResumenDto>(`${this.baseUrl}/qr-email/resumen`, req);
  }

  startEnvio(req: QrEmailStartRequestDto): Observable<QrEmailStartResponseDto> {
    return this.http.post<QrEmailStartResponseDto>(`${this.baseUrl}/qr-email/start`, req);
  }

  // Tabla estados
  getAlumnosEstado(filters: { cursoId?: string; estado?: QrEstado; anioLectivo?: number }): Observable<QrAlumnoEstadoDto[]> {
    let params = new HttpParams();
    if (filters.cursoId) params = params.set('cursoId', filters.cursoId);
    if (filters.estado) params = params.set('estado', filters.estado);
    if (filters.anioLectivo) params = params.set('anioLectivo', filters.anioLectivo);

    return this.http.get<QrAlumnoEstadoDto[]>(`${this.baseUrl}/qr-email/alumnos`, { params });
  }

  // Job + progreso
  startEnvioJob(req: QrEmailStartRequestDto): Observable<QrEmailStartJobResponseDto> {
    return this.http.post<QrEmailStartJobResponseDto>(`${this.baseUrl}/qr-email/start-job`, req);
  }

  getProgress(jobId: string): Observable<QrEmailProgressDto> {
    return this.http.get<QrEmailProgressDto>(`${this.baseUrl}/qr-email/progress/${jobId}`);
  }
}
