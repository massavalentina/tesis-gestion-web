import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
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
import { AsistenciaRapidaService } from '../../services/asistencia-rapida.service';
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

  // ✅ overlay mat-select vive fuera del componente; con None, tus estilos lo alcanzan
  encapsulation: ViewEncapsulation.None,

  // ✅ Scope para que estilos no afecten otras pantallas
  host: { class: 'asr-host' }
})
export class AsistenciaRapidaComponent implements OnInit, OnDestroy {

  // ===== Buscador =====
  searchCtrl = new FormControl<string>('', { nonNullable: true });
  private searchSub?: Subscription;

  // ===== Tipos =====
  tipos: TipoAsistenciaRapida[] = [];
  cargando = false;
  errorMsg = '';

  // ===== Resultados =====
  resultados$: Observable<EstudianteBusquedaRapida[]> = of([]);
  sinResultados = false;

  alumnoSeleccionado: EstudianteBusquedaRapida | null = null;

  // ===== Registro =====
  readonly turnoSeleccionado: 'MANANA' = 'MANANA';

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

  // =============================
  // Tipos
  // =============================
  cargarTipos(): void {
    this.cargando = true;
    this.errorMsg = '';

    this.asistenciaRapidaService.getTiposAsistencia().subscribe({
      next: (data) => {
        // Solo llegadas tarde
        this.tipos = (data ?? []).filter(t =>
          ['LLT', 'LLTE', 'LLTC'].includes((t.codigo ?? '').toUpperCase())
        );
      },
      error: (err) => {
        console.error(err);
        this.errorMsg = 'Error cargando tipos';
        this.cargando = false;
      },
      complete: () => this.cargando = false
    });
  }

  // =============================
  // Búsqueda (debounce 500ms)
  // =============================
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

  // =============================
  // Selección
  // =============================
  seleccionarAlumno(a: EstudianteBusquedaRapida): void {
    // ✅ permitir seleccionar aunque registradoHoy = true (corrección / borrado)
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
  }

  // =============================
  // Registro (corregir / registrar)
  // =============================
  confirmarRegistro(): void {
    if (!this.alumnoSeleccionado) return;

    if (!this.tipoSeleccionadoId) {
      this.tipoError = true;
      return;
    }

    this.registrando = true;
    this.errorMsg = '';

    this.asistenciaRapidaService.getServerTime().subscribe({
      next: st => {
        const tipo = this.tipos.find(t => t.id === this.tipoSeleccionadoId);
        const tipoTexto = tipo ? `${tipo.codigo} - ${tipo.descripcion}` : 'Tipo seleccionado';

        const data: AsistenciaConfirmDialogData = {
          titulo: this.alumnoSeleccionado!.registradoHoy
            ? 'El estudiante ya fue registrado hoy. ¿Desea corregir el tipo de llegada tarde?'
            : '¿Desea registrar la llegada tarde?',
          alumno: `${this.alumnoSeleccionado!.apellido}, ${this.alumnoSeleccionado!.nombre}`,
          curso: this.alumnoSeleccionado!.curso ?? '-',
          fecha: st.fecha,
          hora: st.hora,
          tipoTexto
        };

        const ref = this.dialog.open(AsistenciaConfirmDialogComponent, {
          width: '360px',
          disableClose: true,
          data
        });

        ref.afterClosed().subscribe(confirmado => {
          if (!confirmado) {
            this.registrando = false;
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
              const msg = `${resp.mensaje} (${st.fecha} ${st.hora})`;
              const sdata: AsistenciaSuccessDialogData = { mensaje: msg };

              const sref = this.dialog.open(AsistenciaSuccessDialogComponent, {
                width: '360px',
                disableClose: true,
                data: sdata
              });

              sref.afterClosed().subscribe(() => this.resetPantalla());
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

  // =============================
  // ✅ Borrar/Deshacer (nuevo)
  // =============================
  confirmarBorrado(): void {
    if (!this.alumnoSeleccionado) return;

    this.registrando = true;
    this.errorMsg = '';

    this.asistenciaRapidaService.getServerTime().subscribe({
      next: st => {
        const data: AsistenciaConfirmDialogData = {
          titulo: '¿Desea borrar (deshacer) el registro de llegada tarde de hoy?',
          alumno: `${this.alumnoSeleccionado!.apellido}, ${this.alumnoSeleccionado!.nombre}`,
          curso: this.alumnoSeleccionado!.curso ?? '-',
          fecha: st.fecha,
          hora: st.hora,
          tipoTexto: 'Se restablecerá el turno a Presente (P)'
        };

        const ref = this.dialog.open(AsistenciaConfirmDialogComponent, {
          width: '360px',
          disableClose: true,
          data
        });

        ref.afterClosed().subscribe(confirmado => {
          if (!confirmado) {
            this.registrando = false;
            return;
          }

          // ✅ Llama a POST /api/asistencia-rapida/deshacer
          this.asistenciaRapidaService.borrarAsistencia({
            estudianteId: this.alumnoSeleccionado!.id,
            fecha: st.fecha,
            turno: this.turnoSeleccionado
          }).subscribe({
            next: (resp: AsistenciaRapidaResponse) => {
              const sref = this.dialog.open(AsistenciaSuccessDialogComponent, {
                width: '360px',
                disableClose: true,
                data: { mensaje: resp.mensaje } as AsistenciaSuccessDialogData
              });

              sref.afterClosed().subscribe(() => this.resetPantalla());
            },
            error: err => {
              console.error(err);
              this.errorMsg = 'Error al borrar asistencia';
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

  private resetPantalla(): void {
    // ✅ Limpieza total para volver a buscar otro
    this.registrando = false;
    this.alumnoSeleccionado = null;
    this.tipoSeleccionadoId = null;
    this.tipoError = false;
    this.errorMsg = '';

    this.searchCtrl.setValue('', { emitEvent: true });
    this.resultados$ = of([]);
    this.sinResultados = false;
  }
}