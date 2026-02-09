import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';

import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';

import { Observable, of } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  switchMap,
  tap
} from 'rxjs/operators';

import { Alumno } from '../../models/alumno.model';
import { AsistenciaRapidaService } from '../../services/asistencia-rapida.service';

@Component({
  standalone: true,
  selector: 'app-asistencia-rapida',
  templateUrl: './asistencia-rapida.component.html',
  styleUrls: ['./asistencia-rapida.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatInputModule,
    MatListModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatButtonModule
  ]
})
export class AsistenciaRapidaComponent implements OnInit {

  buscador = new FormControl<string>('');
  resultados$: Observable<Alumno[]> = of([]);

  cargando = false;
  sinResultados = false;

  alumnoSeleccionado: Alumno | null = null;
  alumnoConfirmado: Alumno | null = null;
  fechaHoraRegistro: Date | null = null;

  tipoLlegadaSeleccionado: string | null = null;

  tiposLlegadaTarde = [
    { codigo: 'LLT', descripcion: 'Llegada Tarde (0–25 min)' },
    { codigo: 'LLTE', descripcion: 'Llegada Tarde Extendida (25–35 min)' },
    { codigo: 'LLTC', descripcion: 'Llegada Tarde Completa (+35 min)' }
  ];

  constructor(private asistenciaService: AsistenciaRapidaService) {}

  ngOnInit(): void {
    this.buscador.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      filter(valor => (valor ?? '').trim().length >= 3),
      tap(() => {
        this.cargando = true;
        this.sinResultados = false;
        this.alumnoSeleccionado = null;
      }),
      switchMap(valor =>
        this.asistenciaService.buscarAlumnos(valor ?? '')
      )
    ).subscribe(alumnos => {
      this.cargando = false;
      this.sinResultados = alumnos.length === 0;
      this.resultados$ = of(alumnos);
    });
  }

  seleccionarAlumno(alumno: Alumno): void {
    this.alumnoSeleccionado = alumno;
    this.tipoLlegadaSeleccionado = null;
  }

  confirmarRegistro(): void {
    if (!this.alumnoSeleccionado) return;
    if (!this.tipoLlegadaSeleccionado) return;
    if (this.alumnoSeleccionado.registradoHoy) return;

    this.asistenciaService.registrarAsistencia(this.alumnoSeleccionado)
      .subscribe(() => {
        this.alumnoConfirmado = this.alumnoSeleccionado;
        this.fechaHoraRegistro = new Date();

        setTimeout(() => this.resetear(), 2000);
      });
  }

  cancelar(): void {
    this.alumnoSeleccionado = null;
    this.tipoLlegadaSeleccionado = null;
  }

  private resetear(): void {
    this.alumnoConfirmado = null;
    this.alumnoSeleccionado = null;
    this.tipoLlegadaSeleccionado = null;
    this.fechaHoraRegistro = null;
    this.buscador.reset();
    this.resultados$ = of([]);
  }
}
