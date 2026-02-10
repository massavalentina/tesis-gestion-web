import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

import { Observable, of, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, switchMap, tap } from 'rxjs/operators';

import { TipoAsistenciaRapida } from '../../models/tipo-asistencia-rapida.model';
import { AsistenciaRapidaService } from '../../services/asistencia-rapida.service';
import { RegistrarAsistenciaRapida } from '../../models/registrar-asistencia-rapida.model';
import { AsistenciaRapidaResponse } from '../../models/asistencia-rapida-response.model';
import { EstudianteBusquedaRapida } from '../../models/estudiante-busqueda-rapida.model';

import { SearchBusService } from '../../../../core/services/search-bus.service';

@Component({
  selector: 'app-asistencia-rapida',
  standalone: true,
  imports: [
    CommonModule,
    MatListModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule
  ],
  templateUrl: './asistencia-rapida.component.html',
  styleUrls: ['./asistencia-rapida.component.css']
})
export class AsistenciaRapidaComponent implements OnInit, OnDestroy {

  // ===== TIPOS =====
  tipos: TipoAsistenciaRapida[] = [];
  cargando = false;
  errorMsg = '';

  // ===== RESULTADOS =====
  resultados$: Observable<EstudianteBusquedaRapida[]> = of([]);
  sinResultados = false;
  textoActual = ''; // para mostrar el hint

  alumnoSeleccionado: EstudianteBusquedaRapida | null = null;

  // ===== REGISTRO =====
  turnoSeleccionado: 'MANANA' | 'TARDE' = 'MANANA';
  registrando = false;

  okMsg = '';
  errorRegistro = '';
  respuesta: AsistenciaRapidaResponse | null = null;

  // ===== DROPDOWN OBLIGATORIO =====
  tipoSeleccionadoId: string | null = null;
  tipoError = false;

  private searchSub?: Subscription;

  constructor(
    private asistenciaRapidaService: AsistenciaRapidaService,
    private searchBus: SearchBusService
  ) {}

  ngOnInit(): void {
    this.cargarTipos();
    this.escucharBarraGlobal();
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
    this.searchBus.clear(); // limpia la barra cuando salís
  }

  cargarTipos(): void {
    this.cargando = true;
    this.errorMsg = '';

    this.asistenciaRapidaService.getTiposAsistencia()
      .subscribe({
        next: (data: TipoAsistenciaRapida[]) => {
          // Solo LLT / LLTE / LLTC
          this.tipos = data.filter(t => ['LLT', 'LLTE', 'LLTC'].includes(t.codigo));
        },
        error: (err: any) => {
          this.errorMsg = 'Error llamando al backend (mirá consola).';
          console.error('Error cargando tipos', err);
          this.cargando = false;
        },
        complete: () => this.cargando = false
      });
  }

  private escucharBarraGlobal(): void {
    this.searchSub = this.searchBus.query$
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        tap(q => {
          this.textoActual = (q ?? '').trim();
          // Si es corto, limpiamos resultados sin pegarle al backend
          if (this.textoActual.length < 3) {
            this.resultados$ = of([]);
            this.sinResultados = false;
            this.cargando = false;
          }
        }),
        filter(q => (q ?? '').trim().length >= 3),
        tap(() => this.prepararBusqueda()),
        switchMap(q => this.asistenciaRapidaService.buscarEstudiantesRapido((q ?? '').trim()))
      )
      .subscribe({
        next: (alumnos) => this.aplicarResultados(alumnos),
        error: (err) => {
          console.error('Error buscando estudiantes', err);
          this.cargando = false;
          this.errorMsg = 'Error buscando estudiantes (mirá consola).';
        }
      });
  }

  private prepararBusqueda(): void {
    this.cargando = true;
    this.sinResultados = false;
    this.alumnoSeleccionado = null;
    this.tipoSeleccionadoId = null;
    this.tipoError = false;
    this.okMsg = '';
    this.errorRegistro = '';
    this.respuesta = null;
  }

  private aplicarResultados(alumnos: EstudianteBusquedaRapida[]): void {
    this.cargando = false;
    this.sinResultados = alumnos.length === 0;
    this.resultados$ = of(alumnos);
  }

  seleccionarAlumno(a: EstudianteBusquedaRapida): void {
    if (a.registradoHoy) return;
    this.alumnoSeleccionado = a;
    this.tipoSeleccionadoId = null;
    this.tipoError = false;
    this.okMsg = '';
    this.errorRegistro = '';
  }

  cancelarSeleccion(): void {
    this.alumnoSeleccionado = null;
    this.tipoSeleccionadoId = null;
    this.tipoError = false;
  }

  onTipoChange(id: string | null): void {
    this.tipoSeleccionadoId = id;
    this.tipoError = false;
  }

  confirmarRegistro(): void {
    if (!this.alumnoSeleccionado) return;

    if (!this.tipoSeleccionadoId) {
      this.tipoError = true;
      return;
    }

    this.registrando = true;

    const dto: RegistrarAsistenciaRapida = {
      estudianteId: this.alumnoSeleccionado.id,
      fecha: new Date().toISOString().slice(0, 10),
      turno: this.turnoSeleccionado,
      tipoAsistenciaId: this.tipoSeleccionadoId
    };

    this.asistenciaRapidaService.registrarAsistencia(dto).subscribe({
      next: (resp: AsistenciaRapidaResponse) => {
        this.respuesta = resp;
        this.okMsg = resp.mensaje ?? 'Registrado correctamente';
        this.registrando = false;

        this.alumnoSeleccionado = null;
        this.tipoSeleccionadoId = null;
        this.resultados$ = of([]);
        this.searchBus.clear(); // borra el input de la navbar
      },
      error: (err: any) => {
        console.error(err);
        this.errorRegistro = 'Error al registrar asistencia';
        this.registrando = false;
      }
    });
  }
}

