import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs/operators';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import {
  QrEmailApiService,
  CursoDto,
  QrAlumnoEstadoDto,
  QrEmailResumenDto,
  QrEmailStartRequestDto,
  QrEmailStartJobResponseDto,
  QrEmailProgressDto,
  QrEstado
} from '../../services/qr-email-api.service';

@Component({
  selector: 'app-credenciales-qr',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,

    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatTableModule,
    MatChipsModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatProgressBarModule
  ],
  templateUrl: './credenciales-qr.component.html',
  styleUrls: ['./credenciales-qr.component.css']
})
export class CredencialesQrComponent implements OnInit, OnDestroy {
  readonly ANIO_LECTIVO = 2026;

  cursos: CursoDto[] = [];
  resumen: QrEmailResumenDto | null = null;

  alumnos: QrAlumnoEstadoDto[] = [];
  displayedColumns: string[] = ['nombre', 'dni', 'estado', 'detalle'];

  cargandoResumen = false;
  cargandoTabla = false;
  enviando = false;

  enviarForm = new FormGroup({
    idCurso: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    incluirYaEnviados: new FormControl<boolean>(false, { nonNullable: true })
  });

  filtroForm = new FormGroup({
    cursoId: new FormControl<string>(''),
    estado: new FormControl<QrEstado | ''>('')
  });

  private sub = new Subscription();
  private pollTimer: any = null;

  constructor(private api: QrEmailApiService, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.sub.add(
      this.api.getCursos(this.ANIO_LECTIVO).subscribe({
        next: (c) => (this.cursos = c),
        error: () => (this.cursos = [])
      })
    );

    // ✅ FIX: si cambia el curso o el toggle, recalcular resumen automáticamente
    // (así el botón Iniciar envío no queda desfasado)
    const idCursoCtrl = this.enviarForm.controls.idCurso;
    const incluirCtrl = this.enviarForm.controls.incluirYaEnviados;

    this.sub.add(
      idCursoCtrl.valueChanges.pipe(debounceTime(150), distinctUntilChanged()).subscribe(() => {
        this.resumen = null; // mata resumen viejo
        if (idCursoCtrl.valid) this.verResumen();
      })
    );

    this.sub.add(
      incluirCtrl.valueChanges
        .pipe(
          debounceTime(150),
          distinctUntilChanged(),
          filter(() => idCursoCtrl.valid)
        )
        .subscribe(() => {
          this.verResumen();
        })
    );

    this.refrescarTabla();
  }

  ngOnDestroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.sub.unsubscribe();
  }

  verResumen(): void {
    this.resumen = null;

    if (this.enviarForm.invalid) {
      this.enviarForm.markAllAsTouched();
      return;
    }

    this.cargandoResumen = true;

    const req = {
      idCurso: this.enviarForm.value.idCurso!,
      incluirYaEnviados: this.enviarForm.value.incluirYaEnviados!,
      anioLectivo: this.ANIO_LECTIVO
    };

    this.sub.add(
      this.api.getResumen(req).subscribe({
        next: (r) => {
          this.resumen = r;
          this.cargandoResumen = false;
        },
        error: () => {
          this.cargandoResumen = false;
          alert('Error al obtener el resumen.');
        }
      })
    );
  }

  iniciarEnvio(): void {
    // ✅ no te fíes de un resumen viejo
    // (con el auto-refresh ya queda bien igual, pero esto es doble seguro)
    if (this.enviarForm.invalid) return;

    if (!this.resumen?.puedeIniciarEnvio) {
      // si está desfasado por algún motivo, forzamos refresh y listo
      this.verResumen();
      return;
    }

    const cursoCodigo = this.resumen.cursoCodigo || 'Curso seleccionado';

    const confirmRef = this.dialog.open(NoCancelarDialogComponent, {
      width: '420px',
      disableClose: true,
      panelClass: 'nice-dialog',
      data: { cursoCodigo }
    });

    this.sub.add(
      confirmRef.afterClosed().subscribe((ok: boolean) => {
        if (ok) this.ejecutarEnvioConProgreso();
      })
    );
  }

  private ejecutarEnvioConProgreso(): void {
    this.enviando = true;

    const totalEsperado = this.resumen
      ? (this.enviarForm.value.incluirYaEnviados
          ? (this.resumen.conQrPendiente + this.resumen.yaEnviados)
          : this.resumen.conQrPendiente)
      : 0;

    const dlg = this.dialog.open(EnvioEnCursoDialogComponent, {
      width: '560px',
      disableClose: true,
      panelClass: 'nice-dialog',
      data: {
        titulo: 'Enviando credenciales QR',
        texto: `0/${totalEsperado} procesados`,
        porcentaje: 0
      }
    });

    const req: QrEmailStartRequestDto = {
      idCurso: this.enviarForm.value.idCurso!,
      incluirYaEnviados: this.enviarForm.value.incluirYaEnviados!,
      anioLectivo: this.ANIO_LECTIVO
    };

    this.sub.add(
      this.api.startEnvioJob(req).subscribe({
        next: (resp: QrEmailStartJobResponseDto) => {
          const jobId = resp.jobId;

          if (this.pollTimer) clearInterval(this.pollTimer);

          this.pollTimer = setInterval(() => {
            this.api.getProgress(jobId).subscribe({
              next: (p: QrEmailProgressDto) => {
                const total = p.total ?? totalEsperado ?? 0;
                const proc = p.procesados ?? 0;
                const percent = total > 0 ? Math.round((proc * 100) / total) : 0;

                dlg.componentInstance.texto =
                  `${proc}/${total} procesados\n` +
                  `Enviados: ${p.enviados} | Omitidos: ${p.omitidos} | Errores: ${p.errores}\n` +
                  `Último destino: ${p.ultimoDestino ?? '-'}`;

                dlg.componentInstance.porcentaje = percent;

                if (p.estado === 'COMPLETED' || p.estado === 'FAILED') {
                  clearInterval(this.pollTimer);
                  this.pollTimer = null;

                  this.enviando = false;
                  dlg.close();

                  this.verResumen();
                  this.refrescarTabla();

                  if (p.estado === 'FAILED') {
                    alert('El proceso terminó con error: ' + (p.ultimoMensaje ?? 'Error'));
                    return;
                  }

                  // ✅ Dialog final OK
                  this.dialog.open(EnvioOkDialogComponent, {
                    width: '520px',
                    disableClose: false,
                    panelClass: 'nice-dialog',
                    data: {
                      mensaje:
                        `Proceso finalizado correctamente.\n\n` +
                        `Enviados: ${p.enviados} | Omitidos: ${p.omitidos} | Errores: ${p.errores}`
                    }
                  });
                }
              },
              error: () => {
                clearInterval(this.pollTimer);
                this.pollTimer = null;

                this.enviando = false;
                dlg.close();
                alert('Error consultando el progreso.');
              }
            });
          }, 600);
        },
        error: () => {
          this.enviando = false;
          dlg.close();
          alert('Error al iniciar el envío.');
        }
      })
    );
  }

  refrescarTabla(): void {
    this.cargandoTabla = true;

    const cursoId = this.filtroForm.value.cursoId || undefined;
    const estado = (this.filtroForm.value.estado || undefined) as QrEstado | undefined;

    this.sub.add(
      this.api.getAlumnosEstado({ cursoId, estado, anioLectivo: this.ANIO_LECTIVO }).subscribe({
        next: (rows) => {
          this.alumnos = rows;
          this.cargandoTabla = false;
        },
        error: () => {
          this.alumnos = [];
          this.cargandoTabla = false;
        }
      })
    );
  }

  chipClass(estado: QrEstado): string {
    if (estado === 'ENVIADO') return 'chip-enviado';
    if (estado === 'PENDIENTE_ENVIO') return 'chip-pendiente';
    return 'chip-no-generado';
  }

  chipLabel(estado: QrEstado): string {
    if (estado === 'ENVIADO') return 'ENVIADO';
    if (estado === 'PENDIENTE_ENVIO') return 'PENDIENTE DE ENVÍO';
    return 'NO GENERADO';
  }
}

/** Dialog confirmación (sin cancelar envío) */
@Component({
  selector: 'app-no-cancelar-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <div class="dlg">

      <div class="dlg__head">
        <div class="dlg__icon" aria-hidden="true">
          <mat-icon>warning_amber</mat-icon>
        </div>

        <div class="dlg__titles">
          <div class="dlg__badge">Confirmación</div>
          <h2>¿Comenzar envío?</h2>
          <div class="dlg__sub">
            Curso: <b>{{ data.cursoCodigo }}</b>
          </div>
        </div>
      </div>

      <div class="dlg__body">
        <div class="dlg__callout">
          <mat-icon class="dlg__calloutIcon">block</mat-icon>
          <div>
            <div class="dlg__calloutTitle">No se puede cancelar</div>
            <div class="dlg__calloutText">
              Una vez iniciado, el proceso seguirá hasta finalizar.
            </div>
          </div>
        </div>
      </div>

      <div class="dlg__actions">
        <button mat-stroked-button class="btn-ghost" (click)="close(false)">
          Volver
        </button>

        <button mat-raised-button class="btn-primary" (click)="close(true)">
          Comenzar
        </button>
      </div>

    </div>
  `,
  styles: [`
    /* Paleta:
      #3c78b4  primary
      #f0f5fa  bg
      #c7d9eb  border
      #0f2f4b  texto oscuro (derivado)
    */

    .dlg{
      padding: 4px 4px;
      color: #0f2f4b;
    }

    .dlg__head{
      display: flex;
      gap: 14px;
      align-items: flex-start;
      margin-bottom: 14px;
    }

    .dlg__icon{
      width: 44px;
      height: 44px;
      border-radius: 14px;
      display: grid;
      place-items: center;
      background: #f0f5fa;
      border: 1px solid #c7d9eb;
      color: #3c78b4;
      flex: 0 0 auto;
    }

    .dlg__icon mat-icon{
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    .dlg__titles{
      min-width: 0;
      flex: 1;
    }

    .dlg__badge{
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: 999px;
      background: #f0f5fa;
      border: 1px solid #c7d9eb;
      font-size: 12px;
      font-weight: 900;
      color: #3c78b4;
      margin-bottom: 8px;
    }

    h2{
      margin: 0;
      font-weight: 1000;
      letter-spacing: -0.3px;
      line-height: 1.15;
      font-size: 18px;
      color: #0f2f4b;
    }

    .dlg__sub{
      margin-top: 6px;
      font-size: 13px;
      color: rgba(15,47,75,.8);
    }

    .dlg__body{
      margin-top: 6px;
    }

    .dlg__callout{
      display: flex;
      gap: 10px;
      align-items: flex-start;
      padding: 12px 12px;
      border-radius: 16px;
      background: #f0f5fa;
      border: 1px solid #c7d9eb;
    }

    .dlg__calloutIcon{
      color: #3c78b4;
      font-size: 20px;
      width: 20px;
      height: 20px;
      margin-top: 1px;
      flex: 0 0 auto;
    }

    .dlg__calloutTitle{
      font-weight: 1000;
      font-size: 13px;
      margin-bottom: 2px;
      color: #0f2f4b;
    }

    .dlg__calloutText{
      font-size: 13px;
      line-height: 1.35;
      color: rgba(15,47,75,.75);
    }

    .dlg__actions{
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 16px;
    }

    .btn-primary{
      background-color: #3c78b4 !important;
      color: #fff !important;
      border-radius: 12px !important;
      font-weight: 900 !important;
      padding: 10px 14px !important;
      box-shadow: 0 10px 22px rgba(60,120,180,.22) !important;
    }

    .btn-ghost{
      border-color: #c7d9eb !important;
      color: #3c78b4 !important;
      border-radius: 12px !important;
      font-weight: 900 !important;
      padding: 10px 14px !important;
      background: #ffffff !important;
    }

    .btn-ghost:hover{
      background: #f0f5fa !important;
    }
  `]
})
export class NoCancelarDialogComponent {
  constructor(
    private ref: MatDialogRef<NoCancelarDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { cursoCodigo: string }
  ) {}
  close(ok: boolean) { this.ref.close(ok); }
}
/** Dialog progreso bloqueante (contador real) */
@Component({
  selector: 'app-envio-en-curso-dialog',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule, MatDialogModule, MatProgressBarModule, MatIconModule],
  template: `
    <div class="dlg">

      <div class="dlg__head">
        <div class="dlg__icon" aria-hidden="true">
          <mat-icon>send</mat-icon>
        </div>

        <div class="dlg__titles">
          <div class="dlg__badge">En curso</div>
          <h3>{{ titulo }}</h3>
          <div class="dlg__sub">No cierres esta ventana hasta que finalice.</div>
        </div>
      </div>

      <div class="dlg__bar">
        <div class="dlg__barTop">
          <div class="dlg__percent">{{ porcentaje }}%</div>
          <div class="dlg__hint">completado</div>
        </div>

        <mat-progress-bar mode="determinate" [value]="porcentaje"></mat-progress-bar>
      </div>

      <div class="dlg__body">
        <div class="dlg__callout">
          <mat-spinner diameter="32"></mat-spinner>

          <div class="dlg__text">
            <div class="dlg__main">{{ texto }}</div>
            <div class="dlg__meta">Procesando…</div>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    /* Paleta:
      #3c78b4  primary
      #f0f5fa  bg
      #c7d9eb  border
      #0f2f4b  texto oscuro (derivado)
    */

    .dlg{
      padding: 4px 4px;
      color: #0f2f4b;
      min-width: 520px;
    }

    .dlg__head{
      display: flex;
      gap: 14px;
      align-items: flex-start;
      margin-bottom: 14px;
    }

    .dlg__icon{
      width: 44px;
      height: 44px;
      border-radius: 14px;
      display: grid;
      place-items: center;
      background: #f0f5fa;
      border: 1px solid #c7d9eb;
      color: #3c78b4;
      flex: 0 0 auto;
    }

    .dlg__icon mat-icon{
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    .dlg__titles{
      min-width: 0;
      flex: 1;
    }

    .dlg__badge{
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: 999px;
      background:#f0f5fa;
      border:1px solid #c7d9eb;
      font-size: 12px;
      font-weight: 900;
      color:#3c78b4;
      margin-bottom: 8px;
    }

    h3{
      margin: 0;
      font-weight: 1000;
      color:#0f2f4b;
      letter-spacing: -0.3px;
      line-height: 1.15;
      font-size: 18px;
    }

    .dlg__sub{
      margin-top: 6px;
      font-size: 13px;
      color: rgba(15,47,75,.78);
    }

    .dlg__bar{
      margin-top: 10px;
      padding: 12px 12px;
      border-radius: 16px;
      background: #ffffff;
      border: 1px solid rgba(199,217,235,.85);
      box-shadow: 0 8px 18px rgba(0,0,0,0.04);
    }

    .dlg__barTop{
      display:flex;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 10px;
    }

    .dlg__percent{
      font-weight: 1000;
      color:#3c78b4;
      font-size: 14px;
    }

    .dlg__hint{
      font-size: 12px;
      color: rgba(15,47,75,.65);
      font-weight: 800;
    }

    mat-progress-bar{
      border-radius: 999px;
      overflow: hidden;
      height: 10px;
    }

    .dlg__body{
      margin-top: 14px;
    }

    .dlg__callout{
      display: flex;
      gap: 12px;
      align-items: flex-start;
      padding: 12px 12px;
      border-radius: 16px;
      background: #f0f5fa;
      border: 1px solid #c7d9eb;
    }

    .dlg__text{
      width: 100%;
      min-width: 0;
    }

    .dlg__main{
      white-space: pre-line;
      font-weight: 900;
      color:#0f2f4b;
      line-height: 1.35;
      font-size: 13px;
    }

    .dlg__meta{
      margin-top: 6px;
      font-size: 12px;
      color: rgba(15,47,75,.65);
      font-weight: 800;
    }

    /* Responsive: en pantallas chicas, no fuerces ancho */
    @media (max-width: 600px){
      .dlg{ min-width: 0; width: 100%; }
    }
  `]
})
export class EnvioEnCursoDialogComponent {
  titulo = '';
  texto = '';
  porcentaje = 0;

  constructor(@Inject(MAT_DIALOG_DATA) public data: { titulo: string; texto: string; porcentaje?: number }) {
    this.titulo = data.titulo;
    this.texto = data.texto;
    this.porcentaje = data.porcentaje ?? 0;
  }
}


/** Dialog final OK */
@Component({
  selector: 'app-envio-ok-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <div class="dlg">

      <div class="dlg__head">
        <div class="dlg__icon ok" aria-hidden="true">
          <mat-icon>check_circle</mat-icon>
        </div>

        <div class="dlg__titles">
          <div class="dlg__badge ok">Listo</div>
          <h2>¡Proceso finalizado correctamente!</h2>
          <div class="dlg__sub">Resumen del resultado:</div>
        </div>
      </div>

      <div class="dlg__body">
        <div class="dlg__panel">
          <div class="dlg__panelTitle">Detalle</div>
          <div class="dlg__panelText">{{ data.mensaje }}</div>
        </div>
      </div>

      <div class="dlg__actions">
        <button mat-raised-button class="btn-primary" (click)="close()">
          Aceptar
        </button>
      </div>

    </div>
  `,
  styles: [`
    .dlg{
      padding: 4px 4px;
      color: #0f2f4b;
      min-width: 520px;
    }

    .dlg__head{
      display:flex;
      gap:14px;
      align-items:flex-start;
      margin-bottom: 14px;
    }

    .dlg__icon{
      width: 44px;
      height: 44px;
      border-radius: 14px;
      display:grid;
      place-items:center;
      background:#f0f5fa;
      border:1px solid #c7d9eb;
      color:#3c78b4;
      flex: 0 0 auto;
    }

    .dlg__icon mat-icon{
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    .dlg__icon.ok{
      background:#c9f7d5;
      border-color:#c7d9eb;
      color:#1a4d2e;
    }

    .dlg__titles{ flex:1; min-width:0; }

    .dlg__badge{
      display:inline-flex;
      align-items:center;
      padding:4px 10px;
      border-radius:999px;
      background:#f0f5fa;
      border:1px solid #c7d9eb;
      font-size:12px;
      font-weight: 900;
      color:#3c78b4;
      margin-bottom: 8px;
    }

    .dlg__badge.ok{
      background:#c9f7d5;
      color:#1a4d2e;
      border-color:#c7d9eb;
    }

    h2{
      margin:0;
      font-weight: 1000;
      color:#0f2f4b;
      letter-spacing: -0.3px;
      line-height: 1.15;
      font-size: 18px;
    }

    .dlg__sub{
      margin-top: 6px;
      font-size: 13px;
      color: rgba(15,47,75,.78);
    }

    .dlg__panel{
      margin-top: 10px;
      padding: 12px 12px;
      border-radius: 16px;
      background:#ffffff;
      border: 1px solid rgba(199,217,235,.85);
      box-shadow: 0 8px 18px rgba(0,0,0,0.04);
    }

    .dlg__panelTitle{
      font-weight: 1000;
      color:#3c78b4;
      font-size: 13px;
      margin-bottom: 6px;
    }

    .dlg__panelText{
      white-space: pre-line;
      color:#0f2f4b;
      font-weight: 900;
      font-size: 13px;
      line-height: 1.35;
    }

    .dlg__actions{
      display:flex;
      justify-content:flex-end;
      margin-top: 16px;
    }

    .btn-primary{
      background-color: #3c78b4 !important;
      color: #fff !important;
      border-radius: 12px !important;
      font-weight: 900 !important;
      padding: 10px 14px !important;
      box-shadow: 0 10px 22px rgba(60,120,180,.22) !important;
    }

    @media (max-width: 600px){
      .dlg{ min-width: 0; width: 100%; }
    }
  `]
})
export class EnvioOkDialogComponent {
  constructor(
    private ref: MatDialogRef<EnvioOkDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { mensaje: string }
  ) {}
  close() { this.ref.close(true); }
}