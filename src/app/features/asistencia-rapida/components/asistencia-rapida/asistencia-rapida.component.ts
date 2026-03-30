import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Observable, of, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, switchMap, tap } from 'rxjs/operators';

import { TipoAsistenciaRapida } from '../../models/tipo-asistencia-rapida.model';
import {
  AsistenciaRapidaService,
  DeshacerAsistenciaRapidaDto
} from '../../services/asistencia-rapida.service';
import { RegistrarAsistenciaRapida } from '../../models/registrar-asistencia-rapida.model';
import { AsistenciaRapidaResponse } from '../../models/asistencia-rapida-response.model';
import { EstudianteBusquedaRapida } from '../../models/estudiante-busqueda-rapida.model';

import {
  AsistenciaConfirmDialogComponent,
  AsistenciaConfirmDialogData
} from '../asistencia-confirm-dialog/asistencia-confirm-dialog.component';

import {
  AsistenciaSuccessDialogComponent,
  AsistenciaSuccessDialogData
} from '../asistencia-success-dialog/asistencia-success-dialog.component';

@Component({
  selector: 'app-asistencia-rapida',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatListModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatDialogModule
  ],
  templateUrl: './asistencia-rapida.component.html',
  styleUrls: ['./asistencia-rapida.component.css'],
  host: { class: 'asr-host' }
})
export class AsistenciaRapidaComponent implements OnInit, OnDestroy {
  searchCtrl = new FormControl<string>('', { nonNullable: true });
  private searchSub?: Subscription;

  tipos: TipoAsistenciaRapida[] = [];
  cargando = false;
  errorMsg = '';

  resultados$: Observable<EstudianteBusquedaRapida[]> = of([]);
  sinResultados = false;

  alumnoSeleccionado: EstudianteBusquedaRapida | null = null;

  readonly turnoSeleccionado: 'MANANA' = 'MANANA';
  readonly SIN_DEFINIR_ID = '__SIN_DEFINIR__';

  tipoSeleccionadoId: string | null = null;
  tipoError = false;
  registrando = false;

  constructor(
    private asistenciaRapidaService: AsistenciaRapidaService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.cargarTipos();
    this.escucharBuscadorLocal();
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  cargarTipos(): void {
    this.cargando = true;
    this.errorMsg = '';

    this.asistenciaRapidaService.getTiposAsistencia().subscribe({
      next: (data) => {
        const orden: Record<string, number> = { LLT: 1, LLTE: 2, LLTC: 3 };
        const tiposReales = (data ?? [])
          .filter(t => ['LLT', 'LLTE', 'LLTC'].includes((t.codigo ?? '').toUpperCase()))
          .sort((a, b) => (orden[(a.codigo ?? '').toUpperCase()] ?? 99) - (orden[(b.codigo ?? '').toUpperCase()] ?? 99));

        this.tipos = [
          {
            id: this.SIN_DEFINIR_ID,
            codigo: 'SD',
            descripcion: 'Sin definir'
          } as TipoAsistenciaRapida,
          ...tiposReales
        ];
      },
      error: (err) => {
        console.error(err);
        this.errorMsg = 'Error cargando tipos';
        this.cargando = false;
      },
      complete: () => this.cargando = false
    });
  }

  private escucharBuscadorLocal(): void {
    this.searchSub = this.searchCtrl.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        tap(texto => {
          const t = (texto ?? '').trim();
          if (t.length < 3) {
            this.resultados$ = of([]);
            this.sinResultados = false;
            this.cargando = false;
            this.errorMsg = '';
          }
        }),
        filter(texto => (texto ?? '').trim().length >= 3),
        tap(() => this.prepararBusqueda()),
        switchMap(texto =>
          this.asistenciaRapidaService.buscarEstudiantesRapido((texto ?? '').trim())
        )
      )
      .subscribe({
        next: alumnos => this.aplicarResultados(alumnos ?? []),
        error: err => {
          console.error(err);
          this.errorMsg = 'Error buscando estudiantes';
          this.cargando = false;
        }
      });
  }

  private prepararBusqueda(): void {
    this.cargando = true;
    this.sinResultados = false;
    this.alumnoSeleccionado = null;
    this.tipoSeleccionadoId = null;
    this.tipoError = false;
    this.errorMsg = '';
  }

  private aplicarResultados(alumnos: EstudianteBusquedaRapida[]): void {
    this.cargando = false;
    this.sinResultados = alumnos.length === 0;
    this.resultados$ = of(alumnos);
  }

  seleccionarAlumno(a: EstudianteBusquedaRapida): void {
    this.alumnoSeleccionado = a;
    this.tipoSeleccionadoId = null;
    this.tipoError = false;
    this.errorMsg = '';
  }

  cancelarSeleccion(): void {
    this.alumnoSeleccionado = null;
    this.tipoSeleccionadoId = null;
    this.tipoError = false;
    this.errorMsg = '';
  }

  onTipoChange(id: string | null): void {
    this.tipoSeleccionadoId = id;
    this.tipoError = false;
    this.errorMsg = '';
  }

  confirmarOperacion(): void {
    if (!this.alumnoSeleccionado) return;

    if (!this.tipoSeleccionadoId) {
      this.tipoError = true;
      return;
    }

    const esSinDefinir = this.tipoSeleccionadoId === this.SIN_DEFINIR_ID;

    if (esSinDefinir && !this.alumnoSeleccionado.registradoHoy) {
      this.errorMsg = 'Sin definir solo se puede usar si el alumno ya fue registrado hoy.';
      return;
    }

    this.registrando = true;
    this.errorMsg = '';

    this.asistenciaRapidaService.getServerTime().subscribe({
      next: st => {
        const tipo = this.tipos.find(t => t.id === this.tipoSeleccionadoId);
        const tipoTexto = tipo ? `${tipo.codigo} - ${tipo.descripcion}` : 'Tipo seleccionado';

        const data: AsistenciaConfirmDialogData = {
          titulo: esSinDefinir
            ? '¿Desea dejar el turno en Sin definir?'
            : this.alumnoSeleccionado!.registradoHoy
              ? 'El estudiante ya fue registrado hoy. ¿Desea corregir el tipo de llegada tarde?'
              : '¿Desea registrar la llegada tarde?',
          alumno: `${this.alumnoSeleccionado!.apellido}, ${this.alumnoSeleccionado!.nombre}`,
          dni: this.alumnoSeleccionado!.documento,
          curso: this.alumnoSeleccionado!.curso ?? '-',
          fecha: st.fecha,
          hora: st.hora,
          tipoTexto,
          detalle: esSinDefinir
            ? 'El alumno volverá a figurar como no registrado hoy en la búsqueda rápida.'
            : this.alumnoSeleccionado!.registradoHoy
              ? 'Se actualizará el tipo del registro de hoy.'
              : 'Se registrará la llegada tarde para el turno mañana.'
        };

        const ref = this.dialog.open(AsistenciaConfirmDialogComponent, {
          width: '360px',
          maxWidth: '92vw',
          disableClose: true,
          data
        });

        ref.afterClosed().subscribe(confirmado => {
          if (!confirmado) {
            this.registrando = false;
            return;
          }

          if (esSinDefinir) {
            const dto: DeshacerAsistenciaRapidaDto = {
              estudianteId: this.alumnoSeleccionado!.id,
              fecha: st.fecha,
              turno: this.turnoSeleccionado
            };

            this.asistenciaRapidaService.deshacerAsistencia(dto).subscribe({
              next: (resp: AsistenciaRapidaResponse) => {
                const sdata: AsistenciaSuccessDialogData = {
                  titulo: 'Turno restablecido',
                  mensaje: `${resp.mensaje} (${st.fecha} ${st.hora}hs)`
                };

                const sref = this.dialog.open(AsistenciaSuccessDialogComponent, {
                  width: '360px',
                  maxWidth: '92vw',
                  disableClose: true,
                  data: sdata
                });

                sref.afterClosed().subscribe(() => this.recargarBusquedaActual());
              },
              error: err => {
                console.error(err);
                this.errorMsg = 'Error al restablecer el registro';
                this.registrando = false;
              }
            });

            return;
          }

          const dto: RegistrarAsistenciaRapida = {
            estudianteId: this.alumnoSeleccionado!.id,
            fecha: st.fecha,
            turno: this.turnoSeleccionado,
            tipoAsistenciaId: this.tipoSeleccionadoId!,
            hora: st.hora
          };

          this.asistenciaRapidaService.registrarAsistencia(dto).subscribe({
            next: (resp: AsistenciaRapidaResponse) => {
              const sdata: AsistenciaSuccessDialogData = {
                titulo: this.alumnoSeleccionado!.registradoHoy
                  ? 'Corrección realizada'
                  : 'Registro realizado',
                mensaje: `${resp.mensaje} (${st.fecha} ${st.hora}hs)`
              };

              const sref = this.dialog.open(AsistenciaSuccessDialogComponent, {
                width: '360px',
                maxWidth: '92vw',
                disableClose: true,
                data: sdata
              });

              sref.afterClosed().subscribe(() => this.recargarBusquedaActual());
            },
            error: err => {
              console.error(err);
              this.errorMsg = 'Error al registrar asistencia';
              this.registrando = false;
            }
          });
        });
      },
      error: err => {
        console.error(err);
        this.errorMsg = 'No se pudo obtener hora del servidor';
        this.registrando = false;
      }
    });
  }

  private recargarBusquedaActual(): void {
    const texto = (this.searchCtrl.value ?? '').trim();

    this.registrando = false;
    this.alumnoSeleccionado = null;
    this.tipoSeleccionadoId = null;
    this.tipoError = false;
    this.errorMsg = '';

    if (texto.length < 3) {
      this.resultados$ = of([]);
      this.sinResultados = false;
      this.cargando = false;
      return;
    }

    this.cargando = true;

    this.asistenciaRapidaService.buscarEstudiantesRapido(texto).subscribe({
      next: alumnos => this.aplicarResultados(alumnos ?? []),
      error: err => {
        console.error(err);
        this.errorMsg = 'Error actualizando resultados';
        this.cargando = false;
      }
    });
  }
}