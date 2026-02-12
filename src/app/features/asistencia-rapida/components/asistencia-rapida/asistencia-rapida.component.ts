import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
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
    MatInputModule,

    MatListModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,

    MatDialogModule
  ],
  templateUrl: './asistencia-rapida.component.html',
  styleUrls: ['./asistencia-rapida.component.css']
})
export class AsistenciaRapidaComponent implements OnInit, OnDestroy {

  // ✅ buscador local
  searchCtrl = new FormControl<string>('', { nonNullable: true });

  // ===== TIPOS =====
  tipos: TipoAsistenciaRapida[] = [];
  cargando = false;
  errorMsg = '';

  // ===== RESULTADOS =====
  resultados$: Observable<EstudianteBusquedaRapida[]> = of([]);
  sinResultados = false;

  alumnoSeleccionado: EstudianteBusquedaRapida | null = null;

  // ===== REGISTRO =====
  turnoSeleccionado: 'MANANA' | 'TARDE' = 'MANANA';
  registrando = false;

  // ===== DROPDOWN OBLIGATORIO =====
  tipoSeleccionadoId: string | null = null;
  tipoError = false;

  private searchSub?: Subscription;

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

    this.asistenciaRapidaService.getTiposAsistencia()
      .subscribe({
        next: (data) => {
          // ✅ solo llegadas tarde para esta vista
          this.tipos = data.filter(t => ['LLT', 'LLTE', 'LLTC'].includes(t.codigo));
        },
        error: (err) => {
          console.error('Error cargando tipos', err);
          this.errorMsg = 'Error llamando al backend (mirá consola).';
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
        tap(q => {
          const texto = (q ?? '').trim();
          if (texto.length < 3) {
            this.resultados$ = of([]);
            this.sinResultados = false;
            this.cargando = false;
            this.errorMsg = '';
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
    this.errorMsg = '';
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

  // ✅ flujo: ServerTime -> ConfirmDialog -> POST -> SuccessDialog
  confirmarRegistro(): void {
    if (!this.alumnoSeleccionado) return;

    if (!this.tipoSeleccionadoId) {
      this.tipoError = true;
      return;
    }

    this.registrando = true;

    // 1) Traer fecha/hora del servidor
    this.asistenciaRapidaService.getServerTime().subscribe({
      next: (st) => {

        const tipo = this.tipos.find(t => t.id === this.tipoSeleccionadoId);
        const tipoTexto = tipo ? `${tipo.codigo} - ${tipo.descripcion}` : 'Tipo seleccionado';

        // 2) Abrir confirm modal con fecha/hora servidor
        const data: AsistenciaConfirmDialogData = {
          titulo: '¿Desea registrar la operación?',
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

          // 3) POST (sin cambiar response/DTO; mandamos fecha servidor)
          const dto: RegistrarAsistenciaRapida = {
            estudianteId: this.alumnoSeleccionado!.id,
            fecha: st.fecha,
            turno: this.turnoSeleccionado,
            tipoAsistenciaId: this.tipoSeleccionadoId!
          };

          this.asistenciaRapidaService.registrarAsistencia(dto).subscribe({
            next: (resp: AsistenciaRapidaResponse) => {
              // 4) Success modal
              const msg = `${resp.mensaje ?? 'Registrado correctamente'} (${st.fecha} ${st.hora})`;

              const sdata: AsistenciaSuccessDialogData = { mensaje: msg };
              const sref = this.dialog.open(AsistenciaSuccessDialogComponent, {
                width: '360px',
                disableClose: true,
                data: sdata
              });

              sref.afterClosed().subscribe(() => {
                // ✅ reset visual
                this.registrando = false;
                this.alumnoSeleccionado = null;
                this.tipoSeleccionadoId = null;

                // refrescar lista si hay texto
                const q = this.searchCtrl.value.trim();
                if (q.length >= 3) {
                  this.prepararBusqueda();
                  this.asistenciaRapidaService.buscarEstudiantesRapido(q)
                    .subscribe({
                      next: (al) => this.aplicarResultados(al),
                      error: (err) => {
                        console.error(err);
                        this.cargando = false;
                        this.errorMsg = 'Error refrescando resultados.';
                      }
                    });
                } else {
                  this.resultados$ = of([]);
                }
              });
            },
            error: (err: any) => {
              console.error(err);
              this.registrando = false;
              this.errorMsg = 'Error al registrar asistencia (mirá consola / Network).';
            }
          });
        });
      },
      error: (err) => {
        console.error(err);
        this.registrando = false;
        this.errorMsg = 'No se pudo obtener la hora del servidor.';
      }
    });
  }
}
