import {
  AfterViewChecked,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BreakpointObserver, Breakpoints, LayoutModule } from '@angular/cdk/layout';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Observable, forkJoin, of } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  AlumnoEscaneado,
  ConfirmarAsistenciaItemPayload,
  ErrorConfirmacionDetalle,
  OpcionSeleccion,
  RespuestaVistaPreviaAsistencia
} from '../models/escaner.models';
import { ServicioEscanerQr } from '../services/escaner-qr.service';
import { ServicioAsistencia } from '../services/asistencia.service';
import { ServicioTipoAsistencia } from '../services/tipoasistencia.service';
import { ServicioTurno } from '../services/turno.service';
import { DialogoConfirmarAsistenciaComponent } from '../components/confirmar-asistencia-dialog.component';
import { DialogoErrorEscaneoComponent } from '../components/error-escaneo-dialog.component';
import { DialogoConfirmarRegistroComponent } from '../components/confirmar-registro-dialog.component';
import { DialogoCancelarRegistroComponent } from '../components/cancelar-registro-dialog.component';
import { DialogoAbandonoPendienteComponent } from '../components/abandono-pendiente-dialog.component';
import { DialogoExitoComponent } from '../components/exito-dialog.component';
import { ScannerUiStateService } from '../../../core/services/scanner-ui-state.service';

type TipoAsistenciaUi = OpcionSeleccion & { code: string };

@Component({
  selector: 'app-escaner-asistencia-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LayoutModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatSnackBarModule
  ],
  template: `
    <div class="page-content">
      <section class="scanner-shell">
        <div class="scanner-copy">
          <div class="scanner-badge">Escaneo QR</div>
          <h1>Toma de asistencia por escaneo QR</h1>
          <p>Turno y tipo inicial son opcionales. El turno puede resolverse automáticamente por hora de servidor.</p>
        </div>

        <div class="config">
          <mat-form-field appearance="fill" class="pill">
            <mat-label>Turno</mat-label>
            <mat-select [(ngModel)]="turnoSeleccionadoManual">
              <mat-option [value]="null">Automático por horario</mat-option>
              <mat-option *ngFor="let turno of turnos" [value]="turno.id">
                {{ turno.label }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="fill" class="pill">
            <mat-label>Tipo inicial</mat-label>
            <mat-select [(ngModel)]="tipoSeleccionadoId">
              <mat-select-trigger>
                <span *ngIf="obtenerTipoActivo() as tipo"
                      class="code-pill code-pill--trigger"
                      [class]="chipClassByCode(tipo.code)">
                  {{ tipo.code }}
                </span>
              </mat-select-trigger>
              <mat-option [value]="null">Presente (P) por defecto</mat-option>
              <mat-option *ngFor="let tipo of tiposAsistencia" [value]="tipo.id">
                <span class="code-pill" [class]="chipClassByCode(tipo.code)">{{ tipo.code }}</span>
                <span class="tipo-desc">· {{ tipo.label }}</span>
              </mat-option>
            </mat-select>
          </mat-form-field>

          <mat-slide-toggle class="rafaga-toggle" [(ngModel)]="modoRafaga">
            Modo Ráfaga
          </mat-slide-toggle>
          <span class="rafaga-hint" *ngIf="modoRafaga">
            Modo asistencia rápida sin bloqueantes.
          </span>
        </div>

        <div class="scan-counter" *ngIf="cantidadPendiente > 0 && !escanerActivo">
          {{ cantidadPendiente }} registro(s) pendiente(s) de cargar
        </div>

        <div class="pending-actions" *ngIf="mostrarAccionesPendientes && cantidadPendiente > 0 && !escanerActivo">
          <button mat-raised-button class="pending-btn pending-btn--primary" (click)="registrarPendientes()">
            Registrar pendientes
          </button>
          <button mat-stroked-button class="pending-btn pending-btn--ghost" (click)="resetearPendientes()">
            Resetear
          </button>
        </div>

        <div class="scan-error" *ngIf="errorEscaner">
          {{ errorEscaner }}
        </div>
      </section>
    </div>

    <div *ngIf="escanerActivo" class="scanner-container">
      <video #video autoplay muted playsinline></video>

      <div class="feedback-flash" *ngIf="flashEstado" [class.success]="flashEstado === 'success'" [class.error]="flashEstado === 'error'"></div>

      <button class="close-scanner" (click)="cerrarEscaner()">✕</button>

      <div class="overlay-footer">
        <div class="scan-counter scan-counter--overlay" [class.scan-counter--ghost]="cantidadPendiente === 0">
          {{ cantidadPendiente }} escaneado(s)
        </div>

        <mat-form-field
          appearance="outline"
          class="pill pill--overlay"
          [style.--overlay-accent]="colorByCode(obtenerTipoActivo()?.code)">
          <mat-select [(ngModel)]="tipoSeleccionadoId" panelClass="asr-select-panel">
            <mat-select-trigger>
              <span *ngIf="obtenerTipoActivo() as tipo"
                    class="overlay-code"
                    [style.color]="colorByCode(tipo.code)">
                {{ tipo.code }}
              </span>
            </mat-select-trigger>
            <mat-option *ngFor="let tipo of tiposAsistencia" [value]="tipo.id">
              <span class="code-pill" [class]="chipClassByCode(tipo.code)">{{ tipo.code }}</span>
            </mat-option>
          </mat-select>
        </mat-form-field>
      </div>
    </div>

    <div class="bottom-bar" *ngIf="esMobile">
      <div class="bottom-bar__glow"></div>

      <button
        mat-fab
        color="primary"
        class="scan-btn"
        [disabled]="!puedeIniciarEscaneo()"
        [class.scan-btn--disabled]="!puedeIniciarEscaneo()"
        [class.scan-btn--ready]="puedeIniciarEscaneo()"
        (click)="alHacerClickEnEscanear()">
        <mat-icon>qr_code_scanner</mat-icon>
      </button>

      <div class="scan-warning" *ngIf="mostrarAdvertenciaEscaneo">
        Cargá catálogos y configuración para comenzar
      </div>

      <div class="scan-status" [class.scan-status--ready]="puedeIniciarEscaneo()">
        {{ puedeIniciarEscaneo() ? 'Escáner habilitado' : 'Esperando catálogos para habilitar escáner' }}
      </div>
    </div>

    <div class="scan-warning scan-warning--desktop" *ngIf="!esMobile">
      El escaneo QR está disponible solo en dispositivos móviles.
    </div>
  `,
  styleUrls: ['../scss/escaner.page.scss']
})
export class PaginaEscanerAsistencia implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('video') video?: ElementRef<HTMLVideoElement>;

  escanerActivo = false;
  procesando = false;
  mostrarAdvertenciaEscaneo = false;
  mostrarAccionesPendientes = false;
  esMobile = false;
  errorEscaner = '';
  modoRafaga = false;
  turnoSeleccionadoManual: string | null = null;
  turnoSesion: string | null = null;
  tipoSeleccionadoId: string | null = null;
  turnos: OpcionSeleccion[] = [];
  tiposAsistencia: TipoAsistenciaUi[] = [];
  flashEstado: 'success' | 'error' | null = null;

  private inicioPendiente = false;
  private ultimoQr = '';
  private ultimaLecturaMs = 0;
  private readonly antiRelecturaMs = 1000;
  private readonly colaPorTurno = new Map<string, AlumnoEscaneado>();
  private flashTimeout?: ReturnType<typeof setTimeout>;

  constructor(
    private readonly servicioEscanerQr: ServicioEscanerQr,
    private readonly servicioAsistencia: ServicioAsistencia,
    private readonly servicioTurno: ServicioTurno,
    private readonly servicioTipoAsistencia: ServicioTipoAsistencia,
    private readonly dialogo: MatDialog,
    private readonly snackBar: MatSnackBar,
    private readonly breakpointObserver: BreakpointObserver,
    private readonly scannerUiStateService: ScannerUiStateService
  ) {
    this.scannerUiStateService.setScannerActive(false);

    this.breakpointObserver.observe([Breakpoints.Handset]).subscribe(result => {
      this.esMobile = result.matches;
      if (!this.esMobile && this.escanerActivo) {
        this.detenerEscaner();
      }
    });
  }

  ngOnInit(): void {
    forkJoin({
      turnos: this.servicioTurno.obtenerTurnos(),
      tipos: this.servicioTipoAsistencia.obtenerTipos()
    }).subscribe({
      next: ({ turnos, tipos }) => {
        this.turnos = turnos;
        this.tiposAsistencia = tipos.map(tipo => ({
          ...tipo,
          code: this.inferirCodigoTipo(tipo.label)
        }));
        if (!this.tipoSeleccionadoId && this.tiposAsistencia.length > 0) {
          this.tipoSeleccionadoId = this.tiposAsistencia[0].id;
        }
      },
      error: () => {
        this.errorEscaner = 'No se pudieron cargar los catálogos del scanner.';
      }
    });
  }

  ngAfterViewChecked(): void {
    if (!this.inicioPendiente || !this.video) return;
    this.inicioPendiente = false;
    void this.iniciarCamara();
  }

  ngOnDestroy(): void {
    this.detenerEscaner();
    this.scannerUiStateService.setScannerActive(false);
    if (this.flashTimeout) clearTimeout(this.flashTimeout);
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.tienePendientes()) return;
    event.preventDefault();
    event.returnValue = '';
  }

  get cantidadPendiente(): number {
    return this.colaPorTurno.size;
  }

  get alumnosEscaneados(): AlumnoEscaneado[] {
    return [...this.colaPorTurno.values()]
      .sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`));
  }

  tienePendientes(): boolean {
    return this.colaPorTurno.size > 0;
  }

  confirmarDescarteNavegacion(): Observable<boolean> {
    if (!this.tienePendientes()) return of(true);

    const dialogoRef = this.dialogo.open(DialogoAbandonoPendienteComponent, {
      disableClose: true,
      panelClass: 'scanner-dialog-panel'
    });
    return dialogoRef.afterClosed().pipe(
      map((confirmado: boolean) => {
        if (confirmado) this.descartarPendientes();
        return !!confirmado;
      })
    );
  }

  puedeIniciarEscaneo(): boolean {
    return this.tiposAsistencia.length > 0 && !this.escanerActivo && this.esMobile;
  }

  alHacerClickEnEscanear(): void {
    if (!this.puedeIniciarEscaneo()) {
      this.mostrarAdvertenciaTemporal();
      return;
    }

    this.iniciarEscaneo();
  }

  cerrarEscaner(): void {
    this.detenerEscaner();

    if (!this.tienePendientes()) {
      this.mostrarAccionesPendientes = false;
      return;
    }

    this.abrirConfirmacionCargaTotal();
  }

  registrarPendientes(): void {
    if (!this.tienePendientes()) return;
    this.abrirConfirmacionCargaTotal();
  }

  resetearPendientes(): void {
    const dialogoRef = this.dialogo.open(DialogoCancelarRegistroComponent, {
      disableClose: true,
      panelClass: 'scanner-dialog-panel'
    });
    dialogoRef.afterClosed().subscribe((confirmado: boolean) => {
      if (!confirmado) return;
      this.descartarPendientes();
      this.abrirToast('Cola pendiente reseteada.', 'neutral', 900);
    });
  }

  private iniciarEscaneo(): void {
    const turnoSeleccionado = this.turnoSeleccionadoManual ?? undefined;
    this.servicioAsistencia.obtenerTurnoSesion(turnoSeleccionado).subscribe({
      next: ({ turno }) => {
        this.turnoSesion = turno;
        this.ultimoQr = '';
        this.ultimaLecturaMs = 0;
        this.errorEscaner = '';
        this.mostrarAccionesPendientes = false;
        this.escanerActivo = true;
        this.procesando = false;
        this.scannerUiStateService.setScannerActive(true);
        this.inicioPendiente = true;
      },
      error: (error) => {
        this.errorEscaner = error?.error?.message ?? 'No se pudo resolver el turno de sesión.';
      }
    });
  }

  private async iniciarCamara(): Promise<void> {
    if (!this.video) {
      this.inicioPendiente = true;
      return;
    }

    try {
      await this.servicioEscanerQr.iniciar(this.video, qr => this.alEscanearQr(qr));
    } catch {
      this.detenerEscaner();
      this.errorEscaner = 'No se pudo abrir la cámara. Revisá permisos del navegador e intentá nuevamente.';
    }
  }

  private detenerEscaner(): void {
    this.servicioEscanerQr.detener();
    this.escanerActivo = false;
    this.inicioPendiente = false;
    this.procesando = false;
    this.scannerUiStateService.setScannerActive(false);
  }

  private alEscanearQr(qr: string): void {
    if (!this.turnoSesion || this.procesando) return;

    const ahora = Date.now();
    if (qr === this.ultimoQr && ahora - this.ultimaLecturaMs < this.antiRelecturaMs) {
      return;
    }
    this.ultimoQr = qr;
    this.ultimaLecturaMs = ahora;

    this.procesando = true;

    this.servicioAsistencia.vistaPrevia(qr, this.turnoSesion).subscribe({
      next: (respuesta) => this.procesarLecturaExitosa(respuesta),
      error: (error) => {
        this.procesando = false;
        this.mostrarFlash('error');
        this.dialogo.open(DialogoErrorEscaneoComponent, {
          disableClose: true,
          panelClass: 'scanner-dialog-panel',
          data: {
            titulo: 'Error de escaneo',
            mensaje: error?.error?.message ?? 'Código no reconocido'
          }
        });
      }
    });
  }

  private procesarLecturaExitosa(respuesta: RespuestaVistaPreviaAsistencia): void {
    const tipoActual = this.obtenerTipoActivo();
    if (!tipoActual || !this.turnoSesion) {
      this.procesando = false;
      this.mostrarFlash('error');
      this.dialogo.open(DialogoErrorEscaneoComponent, {
        disableClose: true,
        panelClass: 'scanner-dialog-panel',
        data: {
          titulo: 'Configuración incompleta',
          mensaje: 'No se pudo resolver el tipo de asistencia para este escaneo.'
        }
      });
      return;
    }

    const turnoRegistro = respuesta.attendance?.turno ?? this.turnoSesion;
    const clave = this.claveRegistro(respuesta.student.id, turnoRegistro);
    const registroPrevio = this.colaPorTurno.get(clave);
    const yaRegistradoEnTurno = !!respuesta.attendance?.alreadyRegisteredTurno;
    const tipoAnteriorPersistido = this.obtenerCodigoTipoPrevio(respuesta);
    const tipoAnterior = registroPrevio?.attendanceTypeCode ?? tipoAnteriorPersistido;

    if (this.modoRafaga) {
      const reemplazoLocal = this.upsertRegistro(respuesta, turnoRegistro, tipoActual);
      const reemplazo = reemplazoLocal || yaRegistradoEnTurno;
      this.procesando = false;
      this.mostrarFlash('success');
      if (reemplazo) {
        this.abrirToast('Registro modificado.', 'neutral', 700);
      } else {
        this.abrirToast('Asistencia marcada con éxito.', 'success', 650);
      }
      return;
    }

    const dialogoRef = this.dialogo.open(DialogoConfirmarAsistenciaComponent, {
      disableClose: true,
      panelClass: 'scanner-dialog-panel',
      data: {
        nombre: respuesta.student.name,
        apellido: respuesta.student.lastName,
        curso: respuesta.student.course,
        fotoEstudiante: respuesta.student.profileImagePath ?? null,
        turno: turnoRegistro,
        tipoAsistencia: tipoActual.code,
        esReemplazo: !!registroPrevio || yaRegistradoEnTurno,
        tipoAnterior: tipoAnterior ?? '—'
      }
    });

    dialogoRef.afterClosed().subscribe((aceptado: boolean) => {
      if (aceptado) {
        const tipoConfirmado = this.obtenerTipoActivo();
        if (tipoConfirmado) {
          const reemplazoLocal = this.upsertRegistro(respuesta, turnoRegistro, tipoConfirmado);
          const reemplazo = reemplazoLocal || yaRegistradoEnTurno;
          this.mostrarFlash('success');
          if (reemplazo) {
            this.abrirToast('Asistencia reemplazada en la cola.', 'neutral', 800);
          } else {
            this.abrirToast('Asistencia confirmada en cola.', 'success', 700);
          }
        }
      }
      this.procesando = false;
    });
  }

  private upsertRegistro(
    respuesta: RespuestaVistaPreviaAsistencia,
    turno: string,
    tipo: TipoAsistenciaUi
  ): boolean {
    const key = this.claveRegistro(respuesta.student.id, turno);
    const existe = this.colaPorTurno.has(key);

    this.colaPorTurno.set(key, {
      id: respuesta.student.id,
      nombre: respuesta.student.name,
      apellido: respuesta.student.lastName,
      curso: respuesta.student.course,
      turno,
      attendanceTypeId: tipo.id,
      attendanceTypeCode: tipo.code,
      attendanceTypeLabel: tipo.label
    });

    return existe;
  }

  private claveRegistro(studentId: string, turno: string): string {
    return `${studentId}::${turno}`;
  }

  obtenerTipoActivo(): TipoAsistenciaUi | null {
    if (this.tipoSeleccionadoId) {
      const tipoSeleccionado = this.tiposAsistencia.find(tipo => tipo.id === this.tipoSeleccionadoId);
      if (tipoSeleccionado) return tipoSeleccionado;
    }
    return this.tiposAsistencia[0] ?? null;
  }

  chipClassByCode(code?: string): string {
    return `chip-${(code ?? '').toLowerCase()}`;
  }

  colorByCode(code?: string): string {
    switch ((code ?? '').toUpperCase()) {
      case 'P':
        return '#15803d';
      case 'A':
        return '#b91c1c';
      case 'ANC':
        return '#0369a1';
      case 'LLT':
      case 'LLTE':
      case 'LLTC':
        return '#c2410c';
      default:
        return '#334155';
    }
  }

  private abrirConfirmacionCargaTotal(): void {
    const dialogoRef = this.dialogo.open(DialogoConfirmarRegistroComponent, {
      disableClose: true,
      panelClass: 'scanner-dialog-panel',
      data: {
        turno: this.turnoSesion ?? '-',
        cantidadEscaneados: this.cantidadPendiente,
        detalle: this.alumnosEscaneados.map(item => ({
          alumno: `${item.apellido}, ${item.nombre}`,
          codigo: item.attendanceTypeCode
        }))
      }
    });

    dialogoRef.afterClosed().subscribe((confirmado: boolean) => {
      if (confirmado) {
        this.guardarAsistencias();
      } else {
        this.mostrarAccionesPendientes = true;
      }
    });
  }

  private guardarAsistencias(): void {
    const items: ConfirmarAsistenciaItemPayload[] = this.alumnosEscaneados.map(item => ({
      studentId: item.id,
      attendanceTypeId: item.attendanceTypeId,
      turno: item.turno
    }));

    this.servicioAsistencia.confirmar({ items }).subscribe({
      next: () => {
        const cantidad = this.cantidadPendiente;
        this.descartarPendientes();
        this.dialogo.open(DialogoExitoComponent, {
          disableClose: true,
          panelClass: 'scanner-dialog-panel',
          data: {
            titulo: 'Asistencias registradas',
            mensaje: `${cantidad} asistencia(s) cargada(s) correctamente.`,
            subtitulo: 'Podés continuar escaneando o salir de la pantalla.'
          }
        });
      },
      error: (error) => {
        this.mostrarFlash('error');
        this.dialogo.open(DialogoErrorEscaneoComponent, {
          disableClose: true,
          panelClass: 'scanner-dialog-panel',
          data: {
            titulo: 'Error al confirmar',
            mensaje: this.formatearErrorConfirmacion(error)
          }
        });
        this.mostrarAccionesPendientes = true;
      }
    });
  }

  private formatearErrorConfirmacion(error: any): string {
    const mensajeBase = error?.error?.message ?? 'No se pudo confirmar la asistencia.';
    const detalles = error?.error?.details as ErrorConfirmacionDetalle[] | undefined;

    if (!Array.isArray(detalles) || detalles.length === 0) {
      return mensajeBase;
    }

    const detalleTexto = detalles
      .map((detalle) => `Alumno ${detalle.studentId}: ${detalle.message}`)
      .join('<br/>');

    return `${mensajeBase}<br/><br/>${detalleTexto}`;
  }

  private descartarPendientes(): void {
    this.colaPorTurno.clear();
    this.mostrarAccionesPendientes = false;
    this.turnoSesion = null;
  }

  private mostrarAdvertenciaTemporal(): void {
    this.mostrarAdvertenciaEscaneo = true;
    setTimeout(() => {
      this.mostrarAdvertenciaEscaneo = false;
    }, 2000);
  }

  private mostrarFlash(tipo: 'success' | 'error'): void {
    this.flashEstado = tipo;
    if (this.flashTimeout) clearTimeout(this.flashTimeout);
    this.flashTimeout = setTimeout(() => {
      this.flashEstado = null;
    }, 220);
  }

  private abrirToast(
    mensaje: string,
    variante: 'success' | 'neutral' = 'neutral',
    duracionMs = 900
  ): void {
    this.snackBar.open(mensaje, undefined, {
      duration: duracionMs,
      verticalPosition: 'bottom',
      horizontalPosition: 'center',
      panelClass: [
        'snack-rounded',
        'scanner-toast',
        variante === 'success' ? 'scanner-toast--success' : 'scanner-toast--neutral'
      ]
    });
  }

  private inferirCodigoTipo(label: string): string {
    const normalizado = this.normalizar(label);

    if (normalizado.includes('AUSENTE NO COMPUTABLE')) return 'ANC';
    if (normalizado === 'AUSENTE') return 'A';
    if (normalizado.includes('LLEGADA TARDE EXTENDIDA')) return 'LLTE';
    if (normalizado.includes('LLEGADA TARDE COMPLETA')) return 'LLTC';
    if (normalizado.includes('LLEGADA TARDE')) return 'LLT';
    if (normalizado.includes('PRESENTE')) return 'P';

    return label.trim().toUpperCase();
  }

  private normalizar(texto: string): string {
    return (texto ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase();
  }

  private obtenerCodigoTipoPrevio(respuesta: RespuestaVistaPreviaAsistencia): string | undefined {
    const codigo = this.normalizar(respuesta.attendance?.attendanceTypeCode ?? '');
    if (codigo) return codigo;

    const etiqueta = respuesta.attendance?.attendanceType ?? '';
    if (!etiqueta || this.normalizar(etiqueta) === this.normalizar('Pendiente de confirmar')) {
      return undefined;
    }

    return this.inferirCodigoTipo(etiqueta);
  }
}
