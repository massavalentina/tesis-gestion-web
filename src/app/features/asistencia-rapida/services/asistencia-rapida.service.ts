import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Alumno } from '../models/alumno.model';

@Injectable({
  providedIn: 'root'
})
export class AsistenciaRapidaService {

  buscarAlumnos(valor: string): Observable<Alumno[]> {
    const alumnosMock: Alumno[] = [
      { id: 1, nombre: 'Juan', apellido: 'Perez', curso: '1° C', dni: '45831621', registradoHoy: false },
      { id: 2, nombre: 'Juan', apellido: 'Gomez', curso: '4° B', dni: '45123456', registradoHoy: true }
    ];

    return of(
      alumnosMock.filter(a =>
        a.nombre.toLowerCase().includes(valor.toLowerCase()) ||
        a.apellido.toLowerCase().includes(valor.toLowerCase()) ||
        a.dni.includes(valor)
      )
    );
  }

  registrarAsistencia(alumno: Alumno): Observable<void> {
    alumno.registradoHoy = true;
    return of(void 0);
  }
}
