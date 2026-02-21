import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
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
    if (!this.resumen?.puedeIniciarEnvio || this.enviarForm.invalid) return;

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
                  }
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
  imports: [CommonModule, MatButtonModule, MatDialogModule],
  template: `
    <div class="dlg">
      <div class="dlg__title">
        <div class="dlg__badge">Confirmación</div>
        <h2>¿Comenzar envío?</h2>
      </div>

      <p>
        Una vez iniciado, <b>no se podrá cancelar</b>.<br />
        Curso: <b>{{ data.cursoCodigo }}</b>
      </p>

      <div class="dlg__actions">
        <button mat-stroked-button (click)="close(false)">Volver</button>
        <button mat-raised-button color="primary" (click)="close(true)">Comenzar</button>
      </div>
    </div>
  `,
  styles: [`
    .dlg { padding: 2px 2px; }
    .dlg__title { margin-bottom: 10px; }
    .dlg__badge{
      display:inline-flex; align-items:center;
      padding: 4px 10px;
      border-radius: 999px;
      background:#f0f5fa;
      border:1px solid #c7d9eb;
      font-size: 12px;
      font-weight: 700;
      color:#3c78b4;
      margin-bottom: 8px;
    }
    h2 { margin: 0; font-weight: 900; color:#0f2f4b; letter-spacing: -.2px; }
    p { margin: 10px 0 16px; line-height: 1.5; color:#1a1a1a; }
    .dlg__actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 6px; }
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
  imports: [CommonModule, MatProgressSpinnerModule, MatDialogModule, MatProgressBarModule],
  template: `
    <div class="progress">
      <div class="progress__head">
        <div class="progress__badge">En curso</div>
        <h3>{{ titulo }}</h3>
      </div>

      <mat-progress-bar mode="determinate" [value]="porcentaje"></mat-progress-bar>

      <div class="progress__row">
        <mat-spinner diameter="34"></mat-spinner>

        <div class="progress__text">
          <div class="progress__main">{{ texto }}</div>
          <div class="progress__meta">{{ porcentaje }}% completado</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .progress { padding: 2px 2px; }
    .progress__head { margin-bottom: 10px; }
    .progress__badge{
      display:inline-flex; align-items:center;
      padding: 4px 10px;
      border-radius: 999px;
      background:#f0f5fa;
      border:1px solid #c7d9eb;
      font-size: 12px;
      font-weight: 800;
      color:#3c78b4;
      margin-bottom: 8px;
    }
    h3 { margin: 0; font-weight: 900; color:#0f2f4b; letter-spacing: -.2px; }
    mat-progress-bar { margin: 12px 0 14px; border-radius: 999px; overflow: hidden; }
    .progress__row { display: flex; gap: 14px; align-items: flex-start; }
    .progress__text { width: 100%; }
    .progress__main { white-space: pre-line; font-weight: 800; color:#1a1a1a; line-height: 1.35; }
    .progress__meta { margin-top: 6px; font-size: 12px; color:#5c6b7a; }
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