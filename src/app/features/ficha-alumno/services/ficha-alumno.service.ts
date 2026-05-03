import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CursoFicha } from '../models/curso-ficha.model';
import { EstudianteFicha } from '../models/estudiante-ficha.model';
import { EstudianteBusquedaFicha } from '../models/estudiante-busqueda-ficha.model';
import { FichaDetalle } from '../models/ficha-detalle.model';
import { TutorFicha } from '../models/tutor-ficha.model';

export interface UpdateEstudianteDto {
  nombre: string;
  apellido: string;
  documento: string;
  fechaNacimiento: string;
  domicilio: string | null;
  sexo?: string | null;
}

export interface UpdateTutorDto {
  nombre: string;
  apellido: string;
  documento: string;
  telefono: number; // long en backend (bigint en DB)
  correo: string;
  relacionEstudiante: string;
  disponibilidad: string;
  domicilio: string | null;
}

export interface CreateTutorDto extends UpdateTutorDto {
  fechaNacimiento: string;
  esPrincipal: boolean;
}

export type QrCredentialEstado = 'NO_GENERADO' | 'ACTIVO' | 'INACTIVO';

export interface QrCredentialStatusDto {
  idEstudiante: string;
  estado: QrCredentialEstado;
  versionQr: number;
  fechaGeneracion?: string | null;
}

export interface QrCredentialRegenerationResponseDto {
  idEstudiante: string;
  idQr: string;
  codigoQr: string;
  credencialesDesactivadas: number;
  mensaje: string;
}

@Injectable({ providedIn: 'root' })
export class FichaAlumnoService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getCursos(anioLectivo: number = 2026): Observable<CursoFicha[]> {
    return this.http.get<CursoFicha[]>(`${this.apiUrl}/api/cursos`, {
      params: { anioLectivo: anioLectivo.toString() }
    });
  }

  getEstudiantesPorCurso(idCurso: string): Observable<EstudianteFicha[]> {
    return this.http.get<EstudianteFicha[]>(
      `${this.apiUrl}/api/cursos/${idCurso}/estudiantes`
    );
  }

  buscarEstudiantes(texto: string, anioLectivo: number = 2026): Observable<EstudianteBusquedaFicha[]> {
    return this.http.get<EstudianteBusquedaFicha[]>(
      `${this.apiUrl}/api/cursos/buscar-estudiantes`,
      { params: { texto, anioLectivo: anioLectivo.toString() } }
    );
  }

  getFichaEstudiante(idEstudiante: string, anioLectivo: number = 2026): Observable<FichaDetalle> {
    return this.http.get<FichaDetalle>(
      `${this.apiUrl}/api/ficha/estudiante/${idEstudiante}`,
      { params: { anioLectivo: anioLectivo.toString() } }
    );
  }

  updateEstudiante(idEstudiante: string, data: UpdateEstudianteDto): Observable<void> {
    return this.http.put<void>(
      `${this.apiUrl}/api/ficha/estudiante/${idEstudiante}`,
      data
    );
  }

  updateTutor(idTutor: string, data: UpdateTutorDto): Observable<void> {
    return this.http.put<void>(
      `${this.apiUrl}/api/ficha/tutor/${idTutor}`,
      data
    );
  }

  addTutor(idEstudiante: string, data: CreateTutorDto): Observable<TutorFicha> {
    return this.http.post<TutorFicha>(
      `${this.apiUrl}/api/ficha/estudiante/${idEstudiante}/tutores`,
      data
    );
  }

  removeTutor(idEstudiante: string, idTutor: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/api/ficha/estudiante/${idEstudiante}/tutores/${idTutor}`
    );
  }

  setPrincipal(idEstudiante: string, idTutor: string): Observable<void> {
    return this.http.patch<void>(
      `${this.apiUrl}/api/ficha/estudiante/${idEstudiante}/tutores/${idTutor}/principal`,
      {}
    );
  }

  /**
   * Envía un mail al tutor principal del estudiante solicitando que actualice
   * sus datos de contacto. El backend rechaza el envío si el tutor fue
   * actualizado hace menos de 6 meses.
   */
  notificarTutorDesactualizado(
    idEstudiante: string
  ): Observable<{ enviado: boolean; mensaje: string }> {
    return this.http.post<{ enviado: boolean; mensaje: string }>(
      `${this.apiUrl}/api/ficha/estudiante/${idEstudiante}/notificar-tutor-desactualizado`,
      {}
    );
  }

  /**
   * Envía mails a todos los tutores principales del curso cuyos datos
   * llevan más de 6 meses sin actualizarse. El backend filtra y envía
   * solo los que corresponden.
   */
  notificarTutoresCurso(
    idCurso: string
  ): Observable<{ enviados: number; omitidos: number; mensaje: string }> {
    return this.http.post<{ enviados: number; omitidos: number; mensaje: string }>(
      `${this.apiUrl}/api/ficha/curso/${idCurso}/notificar-tutores-desactualizados`,
      {}
    );
  }

  obtenerEstadoCredencialQr(idEstudiante: string): Observable<QrCredentialStatusDto> {
    return this.http.get<QrCredentialStatusDto>(
      `${this.apiUrl}/api/qr-credentials/student/${idEstudiante}/status`
    );
  }

  obtenerImagenCredencialQr(idEstudiante: string): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/api/qr-credentials/delivery/student/${idEstudiante}/qr-image`,
      { responseType: 'blob' }
    );
  }

  regenerarCredencialQr(idEstudiante: string): Observable<QrCredentialRegenerationResponseDto> {
    return this.http.post<QrCredentialRegenerationResponseDto>(
      `${this.apiUrl}/api/qr-credentials/student/${idEstudiante}/regenerate`,
      {}
    );
  }
}
