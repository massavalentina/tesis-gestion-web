import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule }               from '@angular/common';
import { FormsModule }                from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule }           from '@angular/material/button';
import { MatButtonToggleModule }     from '@angular/material/button-toggle';
import { MatIconModule }             from '@angular/material/icon';
import { MatInputModule }            from '@angular/material/input';
import { MatFormFieldModule }        from '@angular/material/form-field';
import { MatProgressSpinnerModule }  from '@angular/material/progress-spinner';
import { MatRadioModule }            from '@angular/material/radio';
import { MatStepperModule }          from '@angular/material/stepper';
import { MatDividerModule }          from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { RetiroService }     from '../../services/retiro.service';
import { TutorEstudiante }   from '../../models/tutor-estudiante.model';
import { RetiroActivo }      from '../../models/retiro-activo.model';
import { EstudianteManual }  from '../../../asistencia-general-manual/models/estudiante-manual.model';

export interface RetiroDialogData {
  estudiante:  EstudianteManual;
  cursoLabel:  string;
  fecha:       string;
  turno:       'MANANA' | 'TARDE';
}

@Component({
  selector: 'app-retiro-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatDialogModule, MatButtonModule, MatButtonToggleModule,
    MatIconModule, MatInputModule, MatFormFieldModule,
    MatProgressSpinnerModule, MatRadioModule, MatStepperModule,
    MatDividerModule, MatSnackBarModule,
  ],
  template: `
    <div class="ret-wrap">

      <!-- Header -->
      <div class="ret-header">
        <mat-icon class="ret-header-icon">directions_run</mat-icon>
        <div>
          <h2 class="ret-titulo">Registrar Retiro Anticipado</h2>
          <p class="ret-subtitulo">
            {{ data.turno === 'MANANA' ? 'Turno Mañana' : 'Turno Tarde' }}
          </p>
        </div>
        <button mat-icon-button class="ret-close" (click)="cancelar()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-divider></mat-divider>

      <!-- Scrollable body -->
      <div class="ret-body">

      <!-- Info estudiante -->
      <div class="ret-estudiante-info">
        <div class="ret-est-row">
          <mat-icon class="ret-est-icon">person</mat-icon>
          <span class="ret-est-label">Estudiante:</span>
          <strong>{{ data.estudiante.apellido }}, {{ data.estudiante.nombre }}</strong>
        </div>
        <div class="ret-est-row">
          <mat-icon class="ret-est-icon">school</mat-icon>
          <span class="ret-est-label">Curso:</span>
          <strong>{{ data.cursoLabel }}</strong>
        </div>
        <div class="ret-est-row">
          <mat-icon class="ret-est-icon">badge</mat-icon>
          <span class="ret-est-label">DNI:</span>
          <strong>{{ data.estudiante.documento }}</strong>
        </div>
      </div>

      <mat-divider></mat-divider>

      <!-- Loading tutores -->
      <div *ngIf="cargandoTutores" class="ret-loading">
        <mat-spinner diameter="32"></mat-spinner>
        <span>Cargando tutores...</span>
      </div>

      <ng-container *ngIf="!cargandoTutores">

        <!-- ── Stepper ───────────��──────────────────────────────────── -->
        <mat-stepper orientation="vertical" #stepper class="ret-stepper">

          <!-- Paso 1: Datos del retiro -->
          <mat-step label="Datos del retiro">
            <form (ngSubmit)="paso1Valido && stepper.next()">
            <div class="ret-paso">

              <!-- Nombre preceptor -->
              <mat-form-field class="ret-field" appearance="outline">
                <mat-label>Nombre del preceptor</mat-label>
                <input matInput [(ngModel)]="nombrePreceptor" name="preceptor" placeholder="Ej: Martínez, Juan" />
              </mat-form-field>

              <!-- Hora de retiro -->
              <mat-form-field class="ret-field" appearance="outline">
                <mat-label>Hora de retiro</mat-label>
                <input matInput type="time" [(ngModel)]="horaRetiro" name="horaRetiro" />
              </mat-form-field>
              <span *ngIf="errorHoraRetiro" class="ret-error-hint">{{ errorHoraRetiro }}</span>

              <!-- Motivo (obligatorio) -->
              <mat-form-field class="ret-field" appearance="outline">
                <mat-label>Motivo del retiro *</mat-label>
                <textarea matInput [(ngModel)]="motivo" name="motivo" rows="2"
                          placeholder="Ej: Consulta médica, visita familiar..."></textarea>
              </mat-form-field>

              <!-- Con / Sin reingreso -->
              <div class="ret-toggle-group">
                <label class="ret-toggle-label">¿Con reingreso?</label>
                <mat-button-toggle-group [(ngModel)]="conReingreso" name="conReingreso" class="ret-toggle">
                  <mat-button-toggle [value]="false">Sin Reingreso</mat-button-toggle>
                  <mat-button-toggle [value]="true">Con Reingreso</mat-button-toggle>
                </mat-button-toggle-group>
              </div>

              <!-- Horario estimado de reingreso (solo si con reingreso) -->
              <ng-container *ngIf="conReingreso">
                <mat-form-field class="ret-field" appearance="outline">
                  <mat-label>Horario estimado de reingreso</mat-label>
                  <input matInput type="time" [(ngModel)]="horaLimite" name="horaLimite" />
                </mat-form-field>
                <span *ngIf="errorHoraEstimada" class="ret-error-hint">{{ errorHoraEstimada }}</span>
              </ng-container>

              <div class="ret-paso-actions">
                <button mat-flat-button color="primary" type="submit"
                        [disabled]="!paso1Valido">
                  Siguiente
                  <mat-icon iconPositionEnd>arrow_forward</mat-icon>
                </button>
              </div>
            </div>
            </form>
          </mat-step>

          <!-- Paso 2: Adulto responsable -->
          <mat-step label="Adulto responsable">
            <form (ngSubmit)="!guardando && paso2Valido && confirmar()">
            <div class="ret-paso">

              <!-- Lista de tutores -->
              <mat-radio-group [(ngModel)]="responsableSeleccionado" name="responsable" class="ret-radio-group">

                <mat-radio-button *ngFor="let t of tutores" [value]="t.idTutor" class="ret-radio-opt">
                  <div class="ret-tutor-info">
                    <span class="ret-tutor-nombre">{{ t.apellido }}, {{ t.nombre }}</span>
                    <span class="ret-tutor-rel">{{ t.relacionEstudiante }}</span>
                    <span *ngIf="t.esPrincipal" class="ret-tutor-principal">Principal</span>
                  </div>
                  <div class="ret-tutor-contacto" *ngIf="t.telefono || t.correo">
                    <span *ngIf="t.telefono" class="ret-tutor-tel">
                      <mat-icon>phone</mat-icon>{{ t.telefono }}
                    </span>
                    <span *ngIf="t.correo" class="ret-tutor-mail">
                      <mat-icon>email</mat-icon>{{ t.correo }}
                    </span>
                  </div>
                </mat-radio-button>

                <mat-radio-button value="__contingente__" class="ret-radio-opt">
                  <span>Persona no registrada en el sistema</span>
                </mat-radio-button>

              </mat-radio-group>

              <!-- Formulario contingente -->
              <div *ngIf="responsableSeleccionado === '__contingente__'" class="ret-contingente">
                <mat-form-field appearance="outline" class="ret-field-half">
                  <mat-label>Nombre *</mat-label>
                  <input matInput [(ngModel)]="contNombre" name="contNombre" />
                </mat-form-field>
                <mat-form-field appearance="outline" class="ret-field-half">
                  <mat-label>Apellido *</mat-label>
                  <input matInput [(ngModel)]="contApellido" name="contApellido" />
                </mat-form-field>
                <mat-form-field appearance="outline" class="ret-field-half">
                  <mat-label>DNI *</mat-label>
                  <input matInput [(ngModel)]="contDni" name="contDni" />
                </mat-form-field>
                <mat-form-field appearance="outline" class="ret-field-half">
                  <mat-label>Relación *</mat-label>
                  <input matInput [(ngModel)]="contRelacion" name="contRelacion" placeholder="Ej: Abuelo, Tío" />
                </mat-form-field>
                <mat-form-field appearance="outline" class="ret-field-half">
                  <mat-label>Teléfono</mat-label>
                  <input matInput [(ngModel)]="contTelefono" name="contTelefono" placeholder="+54 9 3541 672653" />
                  <mat-hint *ngIf="contTelefono && !telefonoValido" style="color:#dc2626">
                    Formato: +54 9 XXXX XXXXXX
                  </mat-hint>
                </mat-form-field>
                <mat-form-field appearance="outline" class="ret-field-half">
                  <mat-label>Correo</mat-label>
                  <input matInput [(ngModel)]="contCorreo" name="contCorreo" type="email" placeholder="usuario@gmail.com" />
                  <mat-hint *ngIf="contCorreo && !correoValido" style="color:#dc2626">
                    Ingresá un correo válido
                  </mat-hint>
                </mat-form-field>
              </div>

              <div class="ret-paso-actions">
                <button type="button" mat-stroked-button matStepperPrevious>
                  <mat-icon>arrow_back</mat-icon>
                  Volver
                </button>
                <button mat-flat-button color="primary" type="submit"
                        [disabled]="guardando || !paso2Valido">
                  <mat-spinner *ngIf="guardando" diameter="16" class="btn-spinner"></mat-spinner>
                  {{ guardando ? 'Registrando...' : 'Confirmar retiro' }}
                </button>
              </div>
            </div>
            </form>
          </mat-step>

        </mat-stepper>

      </ng-container>

      </div><!-- /.ret-body -->
    </div>
  `,
  styles: [`
    .ret-wrap {
      font-family: 'Open Sans', sans-serif;
      display: flex;
      flex-direction: column;
      max-height: 90vh;
      overflow: hidden;
    }
    .ret-body {
      flex: 1;
      overflow-y: auto;
      min-height: 0;
    }
    .ret-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px 20px 16px;
    }
    .ret-header-icon { color: #7c3aed; font-size: 28px; height: 28px; width: 28px; flex-shrink: 0; }
    .ret-titulo { margin: 0; font-size: 1.05rem; font-weight: 700; color: #1e293b; }
    .ret-subtitulo { margin: 2px 0 0; font-size: 0.85rem; color: #64748b; }
    .ret-close { margin-left: auto; flex-shrink: 0; }

    .ret-estudiante-info {
      padding: 12px 20px;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .ret-est-row { display: flex; align-items: center; gap: 8px; font-size: 0.875rem; }
    .ret-est-icon { font-size: 16px; height: 16px; width: 16px; color: #94a3b8; flex-shrink: 0; }
    .ret-est-label { color: #64748b; white-space: nowrap; min-width: 75px; }

    .ret-loading {
      display: flex; align-items: center; gap: 12px;
      padding: 32px 24px; color: #64748b; font-size: 0.9rem;
    }

    .ret-stepper { padding: 8px 16px 0; }

    .ret-paso { display: flex; flex-direction: column; gap: 12px; padding: 12px 0 8px; }
    .ret-field { width: 100%; }
    .ret-field-half { width: calc(50% - 6px); }

    .ret-toggle-group {
      display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
    }
    .ret-toggle-label { font-size: 0.875rem; color: #475569; font-weight: 500; }

    .ret-radio-group {
      display: flex; flex-direction: column; gap: 6px;
    }
    .ret-radio-opt {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 12px;
    }
    .ret-radio-opt:hover { background: #f8fafc; }
    .ret-tutor-info { display: flex; gap: 8px; align-items: center; }
    .ret-tutor-nombre { font-weight: 600; color: #1e293b; font-size: 0.875rem; }
    .ret-tutor-rel { color: #64748b; font-size: 0.8rem; }
    .ret-tutor-principal {
      background: #eff6ff; color: #1d4ed8;
      border: 1px solid #bfdbfe;
      border-radius: 10px; padding: 1px 8px; font-size: 0.72rem; font-weight: 600;
    }
    .ret-tutor-contacto {
      display: flex; gap: 12px; margin-top: 4px; padding-left: 2px;
    }
    .ret-tutor-tel, .ret-tutor-mail {
      display: flex; align-items: center; gap: 4px;
      font-size: 0.78rem; color: #64748b;
    }
    .ret-tutor-tel mat-icon, .ret-tutor-mail mat-icon { font-size: 13px; height: 13px; width: 13px; }

    .ret-contingente {
      display: flex; flex-wrap: wrap; gap: 12px;
      border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;
      background: #f8fafc;
    }

    .ret-error-hint { color: #dc2626; font-size: 0.72rem; margin-top: -8px; }
    .ret-paso-actions {
      display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px;
    }
    .btn-spinner { display: inline-block; margin-right: 6px; vertical-align: middle; }
  `],
})
export class RetiroDialogComponent implements OnInit {

  tutores:               TutorEstudiante[] = [];
  cargandoTutores        = true;
  guardando              = false;

  // Paso 1
  nombrePreceptor = '';
  horaRetiro      = '';
  motivo          = '';
  conReingreso    = false;
  horaLimite      = '';

  // Paso 2
  responsableSeleccionado: string | null = null;
  // Contingente
  contNombre    = '';
  contApellido  = '';
  contDni       = '';
  contRelacion  = '';
  contTelefono  = '';
  contCorreo    = '';

  private static readonly HORA_RE          = /^([01]\d|2[0-3]):([0-5]\d)$/;
  private static readonly TEL_RE           = /^\+54\s9\s\d{4}\s\d{6}$/;
  private static readonly EMAIL_RE         = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private static readonly LIMITE_TARDE_MIN = 13 * 60 + 20; // 13:20
  private static readonly MAX_TARDE_MIN    = 18 * 60;       // 18:00

  private errorRangoHora(hhmm: string): string | null {
    const [h, m] = hhmm.split(':').map(Number);
    const min = h * 60 + m;
    if (this.data.turno === 'MANANA') {
      if (min > RetiroDialogComponent.LIMITE_TARDE_MIN) return 'Para turno mañana el máximo es 13:20';
    } else {
      if (min < RetiroDialogComponent.LIMITE_TARDE_MIN) return 'Para turno tarde el mínimo es 13:20';
      if (min > RetiroDialogComponent.MAX_TARDE_MIN)    return 'Para turno tarde el máximo es 18:00';
    }
    return null;
  }

  get telefonoValido(): boolean {
    return !this.contTelefono || RetiroDialogComponent.TEL_RE.test(this.contTelefono);
  }

  get correoValido(): boolean {
    return !this.contCorreo || RetiroDialogComponent.EMAIL_RE.test(this.contCorreo);
  }

  get errorHoraRetiro(): string | null {
    const RE = RetiroDialogComponent.HORA_RE;
    if (!this.horaRetiro) return null;
    if (!RE.test(this.horaRetiro)) return 'Hora inválida (HH:mm)';
    return this.errorRangoHora(this.horaRetiro);
  }

  get errorHoraEstimada(): string | null {
    if (!this.conReingreso) return null;
    const RE = RetiroDialogComponent.HORA_RE;
    if (!this.horaLimite) return 'Campo obligatorio';
    if (!RE.test(this.horaLimite)) return 'Hora inválida (HH:mm)';
    if (RE.test(this.horaRetiro)) {
      const toMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
      if (toMin(this.horaLimite) <= toMin(this.horaRetiro))
        return 'Debe ser posterior a la hora de retiro';
    }
    return this.errorRangoHora(this.horaLimite);
  }

  get paso1Valido(): boolean {
    return !!this.nombrePreceptor.trim()
        && RetiroDialogComponent.HORA_RE.test(this.horaRetiro)
        && this.errorHoraRetiro === null
        && !!this.motivo.trim()
        && this.errorHoraEstimada === null;
  }

  get paso2Valido(): boolean {
    if (!this.responsableSeleccionado) return false;
    if (this.responsableSeleccionado === '__contingente__') {
      return !!this.contNombre.trim() && !!this.contApellido.trim()
          && !!this.contDni.trim() && !!this.contRelacion.trim()
          && this.telefonoValido && this.correoValido;
    }
    return true;
  }

  constructor(
    public  dialogRef: MatDialogRef<RetiroDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RetiroDialogData,
    private retiroService: RetiroService,
    private snack:         MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.retiroService.getTutoresEstudiante(this.data.estudiante.idEstudiante).subscribe({
      next: t => { this.tutores = t; this.cargandoTutores = false; },
      error: () => { this.cargandoTutores = false; },
    });
  }

  confirmar(): void {
    if (!this.paso1Valido || !this.paso2Valido) return;

    const esContingente = this.responsableSeleccionado === '__contingente__';

    const dto = {
      estudianteId:           this.data.estudiante.idEstudiante,
      fecha:                  this.data.fecha,
      turno:                  this.data.turno,
      horarioRetiro:          `${this.horaRetiro}:00`,
      conReingreso:           this.conReingreso,
      horarioLimiteReingreso: this.conReingreso ? `${this.horaLimite}:00` : null,
      motivo:                 this.motivo.trim(),
      idTutor:                esContingente ? null : this.responsableSeleccionado,
      nombreResponsable:      esContingente ? this.contNombre    : null,
      apellidoResponsable:    esContingente ? this.contApellido  : null,
      dniResponsable:         esContingente ? this.contDni       : null,
      relacionResponsable:    esContingente ? this.contRelacion  : null,
      telefonoResponsable:    esContingente && this.contTelefono ? this.contTelefono : null,
      correoResponsable:      esContingente && this.contCorreo   ? this.contCorreo   : null,
      nombrePreceptor:        this.nombrePreceptor,
    };

    this.guardando = true;
    this.retiroService.registrarRetiro(dto).subscribe({
      next: (retiro: RetiroActivo) => {
        this.guardando = false;
        this.dialogRef.close(retiro);
      },
      error: () => {
        this.guardando = false;
        this.snack.open('Error al registrar el retiro.', 'Cerrar', { duration: 3500 });
      },
    });
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }
}
