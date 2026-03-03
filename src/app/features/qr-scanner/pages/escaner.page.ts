import { AfterViewChecked, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BreakpointObserver, Breakpoints, LayoutModule } from '@angular/cdk/layout';
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
    LayoutModule,
    MatButtonModule,
    MatIconModule,
    ComponenteConfiguracionEscaner,
    MatDialogModule
  ],
  template: `
    <div class="page-content">
      <section class="scanner-shell">
        <div class="scanner-copy">
          <div class="scanner-badge">Escaneo QR</div>
          <h1>Toma de asistencia por escaneo QR</h1>
          <p>
            Selecciona curso, turno y tipo de asistencia antes de abrir la camara.
          </p>
        </div>

        <app-configuracion-escaner
          #config
          [puedeEnviar]="alumnosEscaneados.length > 0 && !escanerActivo"
          (confirmarRegistro)="confirmarRegistro()"
          (cancelarRegistro)="cancelarRegistro()">
        </app-configuracion-escaner>

        <div class="scan-counter" *ngIf="alumnosEscaneados.length > 0">
          {{ alumnosEscaneados.length }} alumno(s) escaneado(s)
        </div>

        <div class="scan-error" *ngIf="errorEscaner">
          {{ errorEscaner }}
        </div>
      </section>
    </div>

    <div *ngIf="escanerActivo" class="scanner-container">
      <button class="close-scanner" (click)="cerrarEscaner()">✕</button>
      <video #video autoplay muted playsinline></video>
    </div>

    <div class="bottom-bar" *ngIf="esMobile">
      <div class="bottom-bar__glow"></div>

      <button
        mat-fab
        color="primary"
        class="scan-btn"
        [disabled]="!puedeEscanear(config)"
        [class.scan-btn--disabled]="!puedeEscanear(config)"
        [class.scan-btn--ready]="puedeEscanear(config)"
        (click)="alHacerClickEnEscanear(config)">
        <mat-icon>qr_code_scanner</mat-icon>
      </button>

      <div class="scan-warning" *ngIf="mostrarAdvertenciaEscaneo">
        Completá los campos para comenzar
      </div>

      <div class="scan-status" [class.scan-status--ready]="puedeEscanear(config)">
        {{ puedeEscanear(config) ? 'Escáner habilitado' : 'Completá la configuración para habilitar el escáner' }}
      </div>
    </div>

    <div class="scan-warning scan-warning--desktop" *ngIf="!esMobile">
      El escaneo QR está disponible solo en dispositivos móviles.
    </div>
  `,
  styleUrls: ['../scss/escaner.page.scss']
})
export class PaginaEscanerAsistencia implements AfterViewChecked, OnDestroy {
  @ViewChild('video') video?: ElementRef<HTMLVideoElement>;

  escanerActivo = false;
  procesando = false;
  mostrarAdvertenciaEscaneo = false;
  esMobile = false;
  errorEscaner = '';
  private inicioPendiente = false;

  turno!: string;
  idCurso!: string;
  idTipoAsistencia!: string;
  etiquetaTipoAsistencia!: string;

  alumnosEscaneados: AlumnoEscaneado[] = [];

  constructor(
    private servicioEscanerQr: ServicioEscanerQr,
    private servicioAsistencia: ServicioAsistencia,
    private dialogo: MatDialog,
    private breakpointObserver: BreakpointObserver
  ) {
    this.breakpointObserver.observe([Breakpoints.Handset]).subscribe(result => {
      this.esMobile = result.matches;

      if (!this.esMobile && this.escanerActivo) {
        this.cerrarEscaner();
      }
    });
  }

  ngAfterViewChecked(): void {
    if (!this.inicioPendiente || !this.video) {
      return;
    }

    this.inicioPendiente = false;
    void this.iniciarCamara();
  }

  ngOnDestroy(): void {
    this.servicioEscanerQr.detener();
  }

  iniciarEscaneo(componenteConfiguracion: ComponenteConfiguracionEscaner): void {
    if (!this.esMobile) {
      this.errorEscaner = 'El escaneo QR está disponible solo en dispositivos móviles.';
      return;
    }

    const configuracion: ConfiguracionEscaneo | null =
      componenteConfiguracion.obtenerConfiguracion();

    if (!configuracion) return;

    this.idCurso = configuracion.idCurso;
    this.turno = configuracion.turno;
    this.idTipoAsistencia = configuracion.idTipoAsistencia;
    this.etiquetaTipoAsistencia = configuracion.etiquetaTipoAsistencia;
    this.errorEscaner = '';
    this.escanerActivo = true;
    this.inicioPendiente = true;
  }

  reanudarEscaner() {
    this.procesando = false;
    this.errorEscaner = '';

    setTimeout(() => {
      if (!this.video || !this.escanerActivo) {
        return;
      }

      void this.iniciarCamara();
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
    if (!this.puedeEscanear(componenteConfiguracion)) {
      this.mostrarAdvertenciaTemporal();
      return;
    }

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
    this.inicioPendiente = false;
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
        totalAlumnos: 30 //TODO: traer esto del backend getEstudiantesPorCurso o algo así
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

  puedeEscanear(componenteConfiguracion: ComponenteConfiguracionEscaner): boolean {
    return componenteConfiguracion.esValido() && !this.escanerActivo;
  }

  private async iniciarCamara(): Promise<void> {
    if (!this.video) {
      this.inicioPendiente = true;
      return;
    }

    try {
      await this.servicioEscanerQr.iniciar(this.video, qr => this.alEscanearQr(qr));
    } catch {
      this.servicioEscanerQr.detener();
      this.escanerActivo = false;
      this.procesando = false;
      this.errorEscaner =
        'No se pudo abrir la cámara. Revisá los permisos del navegador e intentá nuevamente.';
    }
  }
}
