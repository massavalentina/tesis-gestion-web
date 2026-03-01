import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ComponenteConfiguracionEscaner } from '../components/configuracion-escaner.component';
import {
  AlumnoEscaneado,
  ConfiguracionEscaneo,
  RespuestaVistaPreviaAsistencia
} from '../models/escaner.models';
import { ServicioEscanerQr } from '../services/escaner-qr.service';
import { ServicioAsistencia } from '../services/asistencia.service';
import { DialogoConfirmarAsistenciaComponent } from '../components/confirmar-asistencia-dialog.component';
import { DialogoErrorEscaneoComponent } from '../components/error-escaneo-dialog.component';
import { DialogoExitoComponent } from '../components/exito-dialog.component';
import { DialogoConfirmarRegistroComponent } from '../components/confirmar-registro-dialog.component';
import { DialogoCancelarRegistroComponent } from '../components/cancelar-registro-dialog.component';

@Component({
  selector: 'app-escaner-asistencia-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    ComponenteConfiguracionEscaner,
    MatDialogModule
  ],
  template: `
    <div class="page-content">
      <app-configuracion-escaner
        #config
        [puedeEnviar]="alumnosEscaneados.length > 0 && !escanerActivo"
        (confirmarRegistro)="confirmarRegistro()"
        (cancelarRegistro)="cancelarRegistro()">
      </app-configuracion-escaner>
    </div>

    <div *ngIf="escanerActivo" class="scanner-container">
      <button class="close-scanner" (click)="cerrarEscaner()">✕</button>
      <video #video autoplay muted playsinline></video>
    </div>

    <div class="scan-counter" *ngIf="alumnosEscaneados.length > 0">
      {{ alumnosEscaneados.length }} alumno(s) escaneado(s)
    </div>

    <div class="bottom-bar">
      <button
        mat-fab
        color="primary"
        class="scan-btn"
        [class.disabled]="!config.esValido() || escanerActivo"
        (click)="alHacerClickEnEscanear(config)">
        <mat-icon>qr_code_scanner</mat-icon>
      </button>

      <div class="scan-warning" *ngIf="mostrarAdvertenciaEscaneo">
        ⚠️ Completá los campos para comenzar
      </div>
    </div>
  `,
  styleUrls: ['../scss/escaner.page.scss']
})
export class PaginaEscanerAsistencia {
  @ViewChild('video') video!: ElementRef<HTMLVideoElement>;

  escanerActivo = false;
  procesando = false;
  mostrarAdvertenciaEscaneo = false;

  turno!: string;
  idCurso!: string;
  idTipoAsistencia!: string;
  etiquetaTipoAsistencia!: string;

  alumnosEscaneados: AlumnoEscaneado[] = [];

  constructor(
    private servicioEscanerQr: ServicioEscanerQr,
    private servicioAsistencia: ServicioAsistencia,
    private dialogo: MatDialog
  ) {}

  iniciarEscaneo(componenteConfiguracion: ComponenteConfiguracionEscaner): void {
    const configuracion: ConfiguracionEscaneo | null =
      componenteConfiguracion.obtenerConfiguracion();

    if (!configuracion) return;

    this.idCurso = configuracion.idCurso;
    this.turno = configuracion.turno;
    this.idTipoAsistencia = configuracion.idTipoAsistencia;
    this.etiquetaTipoAsistencia = configuracion.etiquetaTipoAsistencia;
    this.escanerActivo = true;

    setTimeout(() => {
      console.log('Video element:', this.video);
      this.servicioEscanerQr.iniciar(this.video, qr => this.alEscanearQr(qr));
    }, 0);
  }

  reanudarEscaner() {
    this.procesando = false;

    setTimeout(() => {
      this.servicioEscanerQr.iniciar(this.video, qr => this.alEscanearQr(qr));
    }, 500);
  }

  agregarAlumnoALaSesion(respuesta: RespuestaVistaPreviaAsistencia) {
    const yaAgregado = this.alumnosEscaneados.some(
      alumno => alumno.id === respuesta.student.id
    );

    if (yaAgregado) {
      this.dialogo.open(DialogoErrorEscaneoComponent, {
        disableClose: true,
        data: {
          titulo: 'Atención',
          mensaje: 'Este alumno ya fue escaneado en esta sesión'
        }
      });
      return;
    }

    this.alumnosEscaneados.push({
      id: respuesta.student.id,
      nombre: respuesta.student.name,
      apellido: respuesta.student.lastName,
      curso: respuesta.student.course
    });
    navigator.vibrate?.(150);
  }

  abrirDialogoConfirmacion(respuesta: RespuestaVistaPreviaAsistencia) {
    const referenciaDialogo = this.dialogo.open(DialogoConfirmarAsistenciaComponent, {
      disableClose: true,
      data: {
        nombre: respuesta.student.name,
        apellido: respuesta.student.lastName,
        curso: respuesta.student.course,
        turno: this.turno,
        tipoAsistencia: this.etiquetaTipoAsistencia
      }
    });

    referenciaDialogo.afterClosed().subscribe((aceptado: boolean) => {
      if (aceptado) {
        this.agregarAlumnoALaSesion(respuesta);
      }
      this.reanudarEscaner();
    });
  }

  alEscanearQr(qr: string): void {
    if (this.procesando) return;
    this.procesando = true;

    this.servicioEscanerQr.detener();

    this.servicioAsistencia.vistaPrevia(qr, this.idCurso, this.turno).subscribe({
      next: (respuesta) => {
        const yaAgregado = this.alumnosEscaneados.some(
          alumno => alumno.id === respuesta.student.id
        );

        if (yaAgregado) {
          this.dialogo.open(DialogoErrorEscaneoComponent, {
            disableClose: true,
            data: {
              titulo: 'Atención',
              mensaje: 'Este alumno ya fue escaneado en esta sesión'
            }
          }).afterClosed().subscribe(() => {
            this.reanudarEscaner();
          });
          return;
        }

        this.abrirDialogoConfirmacion(respuesta);
      },
      error: (error) => {
        const errorApi = error?.error;

        this.dialogo.open(DialogoErrorEscaneoComponent, {
          disableClose: true,
          data: {
            titulo: 'Atención',
            mensaje: errorApi?.message ?? 'Código no reconocido'
          }
        }).afterClosed().subscribe(() => {
          this.reanudarEscaner();
        });
      }
    });
  }

  alHacerClickEnEscanear(componenteConfiguracion: ComponenteConfiguracionEscaner): void {
    console.log('CLICK scan');

    if (!componenteConfiguracion.esValido() || this.escanerActivo) {
      console.log('Config inválida o scanner activo');
      this.mostrarAdvertenciaTemporal();
      return;
    }

    console.log('Config válida, iniciando scan');
    this.iniciarEscaneo(componenteConfiguracion);
  }

  private mostrarAdvertenciaTemporal(): void {
    this.mostrarAdvertenciaEscaneo = true;

    setTimeout(() => {
      this.mostrarAdvertenciaEscaneo = false;
    }, 2000);
  }

  cerrarEscaner() {
    this.servicioEscanerQr.detener();
    this.escanerActivo = false;
    this.procesando = false;
  }

  reiniciarSesion() {
    this.alumnosEscaneados = [];
    this.escanerActivo = false;
    this.procesando = false;
  }

  guardarAsistencias() {
    const turnoApi =
      this.turno?.trim().toUpperCase() === 'MAÑANA' ||
      this.turno?.trim().toUpperCase() === 'MANANA'
        ? 'MANANA'
        : 'TARDE';

    const payload = {
      turno: turnoApi,
      attendanceTypeId: this.idTipoAsistencia,
      studentIds: this.alumnosEscaneados.map(alumno => alumno.id)
    };

    this.servicioAsistencia.confirmar(payload).subscribe({
      next: () => {
        this.dialogo.open(DialogoExitoComponent, {
          disableClose: true,
          data: { mensaje: 'Asistencias cargadas correctamente' }
        }).afterClosed().subscribe(() => {
          this.reiniciarSesion();
        });
      },
      error: (error) => {
        this.dialogo.open(DialogoErrorEscaneoComponent, {
          disableClose: true,
          data: {
            titulo: 'Error',
            mensaje: error?.error?.message ?? 'Error al cargar asistencias'
          }
        });
      }
    });
  }

  confirmarRegistro() {
    const referenciaDialogo = this.dialogo.open(DialogoConfirmarRegistroComponent, {
      disableClose: true,
      data: {
        curso: this.alumnosEscaneados[0]?.curso,
        turno: this.turno,
        tipoAsistencia: this.etiquetaTipoAsistencia,
        cantidadEscaneados: this.alumnosEscaneados.length,
        totalAlumnos: 30
      }
    });

    referenciaDialogo.afterClosed().subscribe((confirmado: boolean) => {
      if (confirmado) {
        this.guardarAsistencias();
      }
    });
  }

  cancelarRegistro() {
    const referenciaDialogo = this.dialogo.open(DialogoCancelarRegistroComponent, {
      disableClose: true
    });

    referenciaDialogo.afterClosed().subscribe((confirmado: boolean) => {
      if (confirmado) {
        this.reiniciarSesion();
      }
    });
  }
}
