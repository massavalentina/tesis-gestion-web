import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CursoFicha } from '../models/curso-ficha.model';
import { EstudianteFicha } from '../models/estudiante-ficha.model';
import { EstudianteBusquedaFicha } from '../models/estudiante-busqueda-ficha.model';

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
}
