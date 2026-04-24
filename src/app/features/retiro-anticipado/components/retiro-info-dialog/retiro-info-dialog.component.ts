import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { FormsModule }       from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule }          from '@angular/material/button';
import { MatButtonToggleModule }    from '@angular/material/button-toggle';
import { MatIconModule }            from '@angular/material/icon';
import { MatInputModule }           from '@angular/material/input';
import { MatFormFieldModule }       from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule }         from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { RetiroService }    from '../../services/retiro.service';
import { RetiroActivo }     from '../../models/retiro-activo.model';
import { EstudianteManual } from '../../../asistencia-general-manual/models/estudiante-manual.model';

export interface RetiroInfoDialogData {
  estudiante:   EstudianteManual;
  cursoLabel:   string;
  retiroActivo: RetiroActivo;
  fecha:        string;
  /** true = solo lectura (Parte Diario) */
  readonly?:    boolean;
}

@Component({
  selector: 'app-retiro-info-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatDialogModule, MatButtonModule, MatButtonToggleModule, MatIconModule,
    MatInputModule, MatFormFieldModule, MatProgressSpinnerModule,
    MatDividerModule, MatSnackBarModule,
  ],
  template: `
    <div class="ri-wrap">

      <!-- Header -->
      <div class="ri-header">
        <mat-icon class="ri-header-icon">directions_run</mat-icon>
        <div>
          <h2 class="ri-titulo">Retiro Anticipado</h2>
          <p class="ri-subtitulo">{{ data.estudiante.apellido }}, {{ data.estudiante.nombre }}</p>
        </div>
        <span *ngIf="data.retiroActivo.etiquetaEstado"
              [class]="'ri-estado-chip ri-chip-' + chipClass(data.retiroActivo.etiquetaEstado)">
          {{ etiquetaLabel(data.retiroActivo.etiquetaEstado) }}
        </span>
        <button mat-icon-button class="ri-close" (click)="cerrar()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-divider></mat-divider>

      <!-- Info estudiante -->
      <div class="ri-est-info">
        <span class="ri-est-item"><mat-icon>school</mat-icon>{{ data.cursoLabel }}</span>
        <span class="ri-est-item"><mat-icon>badge</mat-icon>DNI {{ data.estudiante.documento }}</span>
      </div>

      <!-- Info / Edición -->
      <div class="ri-body">

        <!-- Código de asistencia -->
        <div *ngIf="data.retiroActivo.tipoRetiro" class="ri-tipo-chip ri-tipo-{{ data.retiroActivo.tipoRetiro.toLowerCase() }}">
          {{ data.retiroActivo.tipoRetiro }}
          <span class="ri-tipo-label">{{ tipoLabel(data.retiroActivo.tipoRetiro) }}</span>
        </div>

        <!-- Vista de datos (solo lectura) -->
        <div *ngIf="!editando" class="ri-info-card">
          <div class="ri-info-row">
            <mat-icon class="ri-info-icon">schedule</mat-icon>
            <span class="ri-info-label">Hora de retiro:</span>
            <strong>{{ data.retiroActivo.horarioRetiro }}</strong>
          </div>
          <div class="ri-info-row ri-info-row--wrap">
            <mat-icon class="ri-info-icon">description</mat-icon>
            <span class="ri-info-label">Motivo:</span>
            <span class="ri-motivo-text">{{ data.retiroActivo.motivo ?? '—' }}</span>
          </div>
          <div class="ri-info-row">
            <mat-icon class="ri-info-icon">badge</mat-icon>
            <span class="ri-info-label">Preceptor:</span>
            <strong>{{ data.retiroActivo.nombrePreceptor ?? '—' }}</strong>
          </div>
          <ng-container *ngIf="nombreCompleto">
            <div class="ri-info-row">
              <mat-icon class="ri-info-icon">person</mat-icon>
              <span class="ri-info-label">Responsable:</span>
              <strong>{{ nombreCompleto }}</strong>
              <span *ngIf="data.retiroActivo.relacionResponsable" class="ri-relacion">({{ data.retiroActivo.relacionResponsable }})</span>
            </div>
            <div *ngIf="data.retiroActivo.dniResponsable" class="ri-info-row ri-info-row--sub">
              <mat-icon class="ri-info-icon">credit_card</mat-icon>
              <span class="ri-info-label">DNI:</span>
              <span>{{ data.retiroActivo.dniResponsable }}</span>
            </div>
            <div *ngIf="data.retiroActivo.telefonoResponsable" class="ri-info-row ri-info-row--sub">
              <mat-icon class="ri-info-icon">phone</mat-icon>
              <span class="ri-info-label">Teléfono:</span>
              <span>{{ data.retiroActivo.telefonoResponsable }}</span>
            </div>
            <div *ngIf="data.retiroActivo.correoResponsable" class="ri-info-row ri-info-row--sub">
              <mat-icon class="ri-info-icon">email</mat-icon>
              <span class="ri-info-label">Correo:</span>
              <span>{{ data.retiroActivo.correoResponsable }}</span>
            </div>
          </ng-container>
          <div *ngIf="data.retiroActivo.horarioLimiteReingreso" class="ri-info-row">
            <mat-icon class="ri-info-icon">timer</mat-icon>
            <span class="ri-info-label">H. est. de reingreso:</span>
            <strong>{{ data.retiroActivo.horarioLimiteReingreso }}</strong>
          </div>
          <div *ngIf="data.retiroActivo.horarioReingreso" class="ri-info-row">
            <mat-icon class="ri-info-icon">login</mat-icon>
            <span class="ri-info-label">Hora de reingreso:</span>
            <strong>{{ data.retiroActivo.horarioReingreso }}</strong>
          </div>
        </div>

        <!-- Formulario de edición -->
        <div *ngIf="editando" class="ri-edit-form">
          <div class="ri-ef-group">
            <mat-form-field class="ri-ef-field-sm" appearance="outline">
              <mat-label>Hora de retiro *</mat-label>
              <input matInput type="time" [(ngModel)]="horaRetiroEdit" />
            </mat-form-field>
            <span *ngIf="intentoGuardar && errorHoraRetiro" class="ri-ef-error">{{ errorHoraRetiro }}</span>
          </div>
          <mat-form-field class="ri-ef-field" appearance="outline">
            <mat-label>Motivo</mat-label>
            <textarea matInput [(ngModel)]="motivoEdit" rows="2"></textarea>
          </mat-form-field>
          <mat-form-field class="ri-ef-field" appearance="outline">
            <mat-label>Preceptor *</mat-label>
            <input matInput [(ngModel)]="preceptorEdit" placeholder="Nombre del preceptor" />
          </mat-form-field>
          <div class="ri-ef-toggle-row">
            <span class="ri-ef-toggle-label">Con reingreso:</span>
            <mat-button-toggle-group [(ngModel)]="conReingresoEdit" aria-label="Con reingreso">
              <mat-button-toggle [value]="false">Sin reingreso</mat-button-toggle>
              <mat-button-toggle [value]="true">Con reingreso</mat-button-toggle>
            </mat-button-toggle-group>
          </div>
          <ng-container *ngIf="conReingresoEdit">
            <div class="ri-ef-group">
              <mat-form-field class="ri-ef-field-sm" appearance="outline">
                <mat-label>H. est. de reingreso *</mat-label>
                <input matInput type="time" [(ngModel)]="horaLimiteReingresoEdit" />
              </mat-form-field>
              <span *ngIf="intentoGuardar && errorHoraLimite" class="ri-ef-error">{{ errorHoraLimite }}</span>
            </div>
          </ng-container>
          <ng-container *ngIf="data.retiroActivo.horarioReingreso || conReingresoEdit">
            <div class="ri-ef-group">
              <mat-form-field class="ri-ef-field-sm" appearance="outline">
                <mat-label>Hora de reingreso (efectivo)</mat-label>
                <input matInput type="time" [(ngModel)]="horaReingresoEdit" placeholder="Opcional" />
              </mat-form-field>
              <span *ngIf="intentoGuardar && errorHoraReingreso" class="ri-ef-error">{{ errorHoraReingreso }}</span>
            </div>
          </ng-container>
          <ng-container *ngIf="!data.retiroActivo.idTutor">
            <div class="ri-ef-section-label">Responsable</div>
            <div class="ri-ef-grid-2">
              <div class="ri-ef-group">
                <mat-form-field appearance="outline" class="ri-ef-field">
                  <mat-label>Nombre *</mat-label>
                  <input matInput [(ngModel)]="nombreResponsableEdit" />
                </mat-form-field>
                <span *ngIf="intentoGuardar && errorNombreResponsable" class="ri-ef-error">{{ errorNombreResponsable }}</span>
              </div>
              <div class="ri-ef-group">
                <mat-form-field appearance="outline" class="ri-ef-field">
                  <mat-label>Apellido *</mat-label>
                  <input matInput [(ngModel)]="apellidoResponsableEdit" />
                </mat-form-field>
                <span *ngIf="intentoGuardar && errorApellidoResponsable" class="ri-ef-error">{{ errorApellidoResponsable }}</span>
              </div>
              <div class="ri-ef-group">
                <mat-form-field appearance="outline" class="ri-ef-field">
                  <mat-label>DNI</mat-label>
                  <input matInput [(ngModel)]="dniResponsableEdit" placeholder="Ej: 40.000.000" />
                </mat-form-field>
                <span *ngIf="intentoGuardar && errorDniResponsable" class="ri-ef-error">{{ errorDniResponsable }}</span>
              </div>
              <div class="ri-ef-group">
                <mat-form-field appearance="outline" class="ri-ef-field">
                  <mat-label>Relación</mat-label>
                  <input matInput [(ngModel)]="relacionResponsableEdit" />
                </mat-form-field>
                <span *ngIf="intentoGuardar && errorRelacionResponsable" class="ri-ef-error">{{ errorRelacionResponsable }}</span>
              </div>
              <div class="ri-ef-group">
                <mat-form-field appearance="outline" class="ri-ef-field">
                  <mat-label>Teléfono *</mat-label>
                  <input matInput [(ngModel)]="telefonoResponsableEdit" />
                </mat-form-field>
                <span *ngIf="intentoGuardar && errorTelefonoResponsable" class="ri-ef-error">{{ errorTelefonoResponsable }}</span>
              </div>
              <div class="ri-ef-group">
                <mat-form-field appearance="outline" class="ri-ef-field">
                  <mat-label>Correo *</mat-label>
                  <input matInput [(ngModel)]="correoResponsableEdit" />
                </mat-form-field>
                <span *ngIf="intentoGuardar && errorCorreoResponsable" class="ri-ef-error">{{ errorCorreoResponsable }}</span>
              </div>
            </div>
          </ng-container>
        </div>

        <!-- Acciones de edición (solo en modo escritura) -->
        <ng-container *ngIf="!data.readonly">
          <div class="ri-edit-actions">
            <ng-container *ngIf="!editando">
              <button mat-stroked-button (click)="iniciarEdicion()">
                <mat-icon>edit</mat-icon> Corregir datos
              </button>
            </ng-container>
            <ng-container *ngIf="editando">
              <button mat-stroked-button (click)="cancelarEdicion()" [disabled]="guardandoEdit">
                Cancelar
              </button>
              <button mat-flat-button color="primary"
                      [disabled]="guardandoEdit"
                      (click)="intentarGuardar()">
                <mat-spinner *ngIf="guardandoEdit" diameter="16" class="btn-spinner"></mat-spinner>
                {{ guardandoEdit ? 'Guardando...' : 'Guardar cambios' }}
              </button>
            </ng-container>
          </div>
        </ng-container>

        <!-- Sección reingreso (solo en modo escritura y si aplica) -->
        <ng-container *ngIf="puedeReingreso && !editando && !data.readonly">
          <mat-divider></mat-divider>

          <div class="ri-reingreso-section">
            <h3 class="ri-section-title">
              <mat-icon>login</mat-icon> Registrar Reingreso
            </h3>

            <mat-form-field class="ri-field" appearance="outline">
              <mat-label>Nombre del preceptor</mat-label>
              <input matInput [(ngModel)]="preceptorReingreso" placeholder="Ej: Martínez, Juan" />
            </mat-form-field>

            <mat-form-field class="ri-field" appearance="outline">
              <mat-label>Hora de reingreso</mat-label>
              <input matInput type="time" [(ngModel)]="horaReingreso" />
            </mat-form-field>
          </div>
        </ng-container>
      </div>

      <mat-divider></mat-divider>

      <div class="ri-footer">
        <!-- Cancelar retiro (solo en modo escritura) -->
        <button *ngIf="!data.readonly && !editando"
                mat-stroked-button color="warn"
                [disabled]="cancelando"
                (click)="confirmarCancelar()">
          <mat-spinner *ngIf="cancelando" diameter="16" class="btn-spinner"></mat-spinner>
          <mat-icon *ngIf="!cancelando">delete</mat-icon>
          {{ cancelando ? 'Cancelando...' : 'Cancelar retiro' }}
        </button>

        <span style="flex:1"></span>

        <button mat-stroked-button (click)="cerrar()">Cerrar</button>
        <button *ngIf="puedeReingreso && !editando && !data.readonly"
                mat-flat-button color="primary"
                [disabled]="guardandoReingreso || !reingresoValido"
                (click)="confirmarReingreso()">
          <mat-spinner *ngIf="guardandoReingreso" diameter="16" class="btn-spinner"></mat-spinner>
          {{ guardandoReingreso ? 'Registrando...' : 'Confirmar Reingreso' }}
        </button>
      </div>

    </div>
  `,
  styles: [`
    .ri-wrap { font-family: 'Open Sans', sans-serif; display: flex; flex-direction: column; min-width: 500px; max-height: 90vh; overflow: hidden; }

    .ri-header { display: flex; align-items: center; gap: 12px; padding: 20px 20px 16px; }
    .ri-header-icon { color: #7c3aed; font-size: 28px; height: 28px; width: 28px; flex-shrink: 0; }
    .ri-titulo   { margin: 0; font-size: 1.05rem; font-weight: 700; color: #1e293b; }
    .ri-subtitulo { margin: 2px 0 0; font-size: 0.85rem; color: #64748b; }
    .ri-close { margin-left: auto; flex-shrink: 0; }

    .ri-estado-chip { border-radius: 10px; padding: 2px 10px; font-size: 0.78rem; font-weight: 600; }
    .ri-chip-naranja { background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; }
    .ri-chip-rojo    { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .ri-chip-verde   { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }

    .ri-est-info {
      display: flex; gap: 16px; padding: 8px 20px;
      background: #f8fafc; flex-wrap: wrap;
    }
    .ri-est-item {
      display: flex; align-items: center; gap: 6px;
      font-size: 0.825rem; color: #475569;
    }
    .ri-est-item mat-icon { font-size: 14px; height: 14px; width: 14px; color: #94a3b8; }

    .ri-tipo-chip {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 4px 12px; border-radius: 6px; font-weight: 700; font-size: 0.9rem;
    }
    .ri-tipo-label { font-weight: 400; font-size: 0.8rem; }
    .ri-tipo-re  { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
    .ri-tipo-ra  { background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; }
    .ri-tipo-rae { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }

    .ri-body { display: flex; flex-direction: column; gap: 14px; padding: 16px 20px; overflow-y: auto; flex: 1; }

    .ri-info-card {
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
      padding: 12px 16px; display: flex; flex-direction: column; gap: 10px;
    }
    .ri-info-row { display: flex; align-items: center; gap: 8px; font-size: 0.875rem; }
    .ri-info-row--wrap { align-items: flex-start; }
    .ri-info-row--sub { padding-left: 24px; opacity: 0.85; }
    .ri-info-icon { font-size: 16px; height: 16px; width: 16px; color: #94a3b8; flex-shrink: 0; }
    .ri-info-label { color: #64748b; white-space: nowrap; min-width: 130px; }
    .ri-relacion { color: #64748b; font-size: 0.8rem; }
    .ri-motivo-text { color: #1e293b; font-style: italic; }

    /* Edit form */
    .ri-edit-form { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; }
    .ri-ef-field { width: 100%; }
    .ri-ef-field-sm { width: 160px; }
    .ri-ef-group { display: flex; flex-direction: column; gap: 4px; }
    .ri-ef-error { font-size: 0.72rem; color: #dc2626; }
    .ri-ef-section-label { font-size: 0.875rem; font-weight: 600; color: #1e293b; }
    .ri-ef-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    :host ::ng-deep .ri-ef-field .mat-mdc-form-field-subscript-wrapper { display: none; }
    :host ::ng-deep .ri-ef-field-sm .mat-mdc-form-field-subscript-wrapper { display: none; }
    :host ::ng-deep .ri-ef-grid-2 mat-form-field .mat-mdc-form-field-subscript-wrapper { display: none; }

    /* Toggle centrado */
    .ri-ef-toggle-row { display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .ri-ef-toggle-label { font-size: 0.875rem; color: #64748b; }
    :host ::ng-deep .ri-ef-toggle-row .mat-button-toggle { width: 130px; }
    :host ::ng-deep .ri-ef-toggle-row .mat-button-toggle-button { width: 100%; height: 36px; }
    :host ::ng-deep .ri-ef-toggle-row .mat-button-toggle-label-content {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      line-height: 1;
      padding: 0 8px;
      font-size: 0.8rem;
      height: 100%;
    }

    .ri-edit-actions { display: flex; justify-content: flex-end; gap: 8px; }

    .ri-reingreso-section { display: flex; flex-direction: column; gap: 12px; padding-top: 4px; }
    .ri-section-title {
      margin: 0; font-size: 0.95rem; font-weight: 600; color: #1e293b;
      display: flex; align-items: center; gap: 6px;
    }
    .ri-section-title mat-icon { font-size: 18px; height: 18px; width: 18px; color: #15803d; }
    .ri-field { width: 100%; }

    .ri-footer { display: flex; align-items: center; gap: 8px; padding: 12px 20px; }
    .btn-spinner { display: inline-block; margin-right: 6px; vertical-align: middle; }
  `],
})
export class RetiroInfoDialogComponent implements OnInit {

  private static readonly HORA_RE          = /^([01]\d|2[0-3]):([0-5]\d)$/;
  private static readonly SOLO_LETRAS      = /[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ]/g;
  private static readonly LIMITE_TARDE_MIN = 13 * 60 + 20; // 13:20
  private static readonly MAX_TARDE_MIN    = 18 * 60;       // 18:00

  private toMin(hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  }

  private errorRangoHora(hhmm: string): string | null {
    const min   = this.toMin(hhmm);
    const turno = this.data.retiroActivo.turno;
    if (turno === 'MANANA') {
      if (min > RetiroInfoDialogComponent.LIMITE_TARDE_MIN) return 'Para turno mañana el máximo es 13:20';
    } else {
      if (min < RetiroInfoDialogComponent.LIMITE_TARDE_MIN) return 'Para turno tarde el mínimo es 13:20';
      if (min > RetiroInfoDialogComponent.MAX_TARDE_MIN)    return 'Para turno tarde el máximo es 18:00';
    }
    return null;
  }

  // Estado edición
  editando        = false;
  guardandoEdit   = false;
  intentoGuardar  = false;
  horaRetiroEdit  = '';
  preceptorEdit   = '';
  motivoEdit      = '';
  conReingresoEdit        = false;
  horaLimiteReingresoEdit = '';
  horaReingresoEdit       = '';
  nombreResponsableEdit    = '';
  apellidoResponsableEdit  = '';
  dniResponsableEdit       = '';
  relacionResponsableEdit  = '';
  telefonoResponsableEdit  = '';
  correoResponsableEdit    = '';

  // Estado reingreso
  guardandoReingreso = false;
  horaReingreso      = '';
  preceptorReingreso = '';

  // Estado cancelación
  cancelando = false;

  get nombreCompleto(): string | null {
    const r = this.data.retiroActivo;
    if (r.nombreResponsable || r.apellidoResponsable) {
      return [r.apellidoResponsable, r.nombreResponsable].filter(Boolean).join(', ');
    }
    return null;
  }

  tipoLabel(tipo: string): string {
    switch (tipo) {
      case 'RE':  return 'Retiro sin inasistencia';
      case 'RA':  return 'Retiro anticipado';
      case 'RAE': return 'Retiro con inasistencia extendida';
      default:    return '';
    }
  }

  etiquetaLabel(etiqueta: string): string {
    switch (etiqueta) {
      case 'ConReingreso':     return 'Con Reingreso';
      case 'ReingresoVencido': return 'Reingreso Vencido';
      case 'Reingresado':      return 'Reingresado';
      default:                 return etiqueta;
    }
  }

  get puedeReingreso(): boolean {
    const e = this.data.retiroActivo.etiquetaEstado;
    return e === 'ConReingreso' || e === 'ReingresoVencido';
  }

  get reingresoValido(): boolean {
    if (!this.preceptorReingreso.trim()) return false;
    if (!RetiroInfoDialogComponent.HORA_RE.test(this.horaReingreso)) return false;
    if (this.toMin(this.horaReingreso) <= this.toMin(this.data.retiroActivo.horarioRetiro)) return false;
    return this.errorRangoHora(this.horaReingreso) === null;
  }

  // ── Validaciones responsable ──────────────────────────────────────────────

  get errorNombreResponsable(): string | null {
    if (!this.nombreResponsableEdit.trim()) return 'Campo obligatorio';
    const letras = (this.nombreResponsableEdit.match(RetiroInfoDialogComponent.SOLO_LETRAS) ?? []).length;
    if (letras < 3) return 'Debe tener al menos 3 letras';
    return null;
  }

  get errorApellidoResponsable(): string | null {
    if (!this.apellidoResponsableEdit.trim()) return 'Campo obligatorio';
    const letras = (this.apellidoResponsableEdit.match(RetiroInfoDialogComponent.SOLO_LETRAS) ?? []).length;
    if (letras < 3) return 'Debe tener al menos 3 letras';
    return null;
  }

  get errorDniResponsable(): string | null {
    if (!this.dniResponsableEdit.trim()) return null;
    const digits = this.dniResponsableEdit.replace(/\./g, '');
    if (!/^\d{8}$/.test(digits)) return 'Debe ser numérico de 8 dígitos (ej: 40.000.000)';
    return null;
  }

  get errorRelacionResponsable(): string | null {
    if (!this.relacionResponsableEdit.trim()) return null;
    const letras = (this.relacionResponsableEdit.match(RetiroInfoDialogComponent.SOLO_LETRAS) ?? []).length;
    if (letras < 5) return 'Debe tener al menos 5 letras';
    return null;
  }

  get errorTelefonoResponsable(): string | null {
    if (!this.telefonoResponsableEdit.trim()) return 'Campo obligatorio';
    return null;
  }

  get errorCorreoResponsable(): string | null {
    if (!this.correoResponsableEdit.trim()) return 'Campo obligatorio';
    return null;
  }

  // ── Validaciones horas ────────────────────────────────────────────────────

  get errorHoraRetiro(): string | null {
    const RE = RetiroInfoDialogComponent.HORA_RE;
    if (!this.horaRetiroEdit) return 'Campo obligatorio';
    if (!RE.test(this.horaRetiroEdit)) return 'Hora inválida (HH:mm)';
    return this.errorRangoHora(this.horaRetiroEdit);
  }

  get errorHoraLimite(): string | null {
    if (!this.conReingresoEdit) return null;
    const RE = RetiroInfoDialogComponent.HORA_RE;
    if (!this.horaLimiteReingresoEdit) return 'Campo obligatorio';
    if (!RE.test(this.horaLimiteReingresoEdit)) return 'Hora inválida (HH:mm)';
    if (RE.test(this.horaRetiroEdit) && this.toMin(this.horaLimiteReingresoEdit) <= this.toMin(this.horaRetiroEdit))
      return 'Debe ser posterior a la hora de retiro';
    return this.errorRangoHora(this.horaLimiteReingresoEdit);
  }

  get errorHoraReingreso(): string | null {
    const RE = RetiroInfoDialogComponent.HORA_RE;
    if (!this.horaReingresoEdit) return null;
    if (!RE.test(this.horaReingresoEdit)) return 'Hora inválida (HH:mm)';
    if (RE.test(this.horaRetiroEdit) && this.toMin(this.horaReingresoEdit) <= this.toMin(this.horaRetiroEdit))
      return 'Debe ser posterior a la hora de retiro';
    return this.errorRangoHora(this.horaReingresoEdit);
  }

  get editValido(): boolean {
    if (this.errorHoraRetiro !== null) return false;
    if (!this.preceptorEdit.trim()) return false;
    if (this.errorHoraLimite !== null) return false;
    if (this.errorHoraReingreso !== null) return false;
    if (!this.data.retiroActivo.idTutor) {
      if (this.errorNombreResponsable !== null) return false;
      if (this.errorApellidoResponsable !== null) return false;
      if (this.errorDniResponsable !== null) return false;
      if (this.errorRelacionResponsable !== null) return false;
      if (this.errorTelefonoResponsable !== null) return false;
      if (this.errorCorreoResponsable !== null) return false;
    }
    return true;
  }

  chipClass(etiqueta: string): string {
    switch (etiqueta) {
      case 'ConReingreso':     return 'naranja';
      case 'ReingresoVencido': return 'rojo';
      case 'Reingresado':      return 'verde';
      default:                 return 'naranja';
    }
  }

  constructor(
    public  dialogRef: MatDialogRef<RetiroInfoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RetiroInfoDialogData,
    private retiroService: RetiroService,
    private snack: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.sincronizarCamposEdicion();
  }

  private sincronizarCamposEdicion(): void {
    const r = this.data.retiroActivo;
    this.horaRetiroEdit          = r.horarioRetiro;
    this.preceptorEdit           = r.nombrePreceptor ?? '';
    this.motivoEdit              = r.motivo ?? '';
    this.conReingresoEdit        = r.conReingreso;
    this.horaLimiteReingresoEdit = r.horarioLimiteReingreso ?? '';
    this.horaReingresoEdit       = r.horarioReingreso ?? '';
    if (!r.idTutor) {
      this.nombreResponsableEdit   = r.nombreResponsable ?? '';
      this.apellidoResponsableEdit = r.apellidoResponsable ?? '';
      this.dniResponsableEdit      = r.dniResponsable ?? '';
      this.relacionResponsableEdit = r.relacionResponsable ?? '';
      this.telefonoResponsableEdit = r.telefonoResponsable ?? '';
      this.correoResponsableEdit   = r.correoResponsable ?? '';
    }
  }

  iniciarEdicion(): void {
    this.editando      = true;
    this.intentoGuardar = false;
    setTimeout(() => (document.activeElement as HTMLElement)?.blur(), 0);
  }

  cancelarEdicion(): void {
    this.editando       = false;
    this.intentoGuardar = false;
    this.sincronizarCamposEdicion();
  }

  intentarGuardar(): void {
    this.intentoGuardar = true;
    if (!this.editValido) return;
    this.guardarEdicion();
  }

  private guardarEdicion(): void {
    this.guardandoEdit = true;
    const r = this.data.retiroActivo;
    this.retiroService.actualizarRetiro(r.idRetiro, {
      horarioRetiro:           `${this.horaRetiroEdit}:00`,
      nombrePreceptor:         this.preceptorEdit,
      motivo:                  this.motivoEdit,
      conReingreso:            this.conReingresoEdit,
      horarioLimiteReingreso:  this.conReingresoEdit && this.horaLimiteReingresoEdit
                                 ? `${this.horaLimiteReingresoEdit}:00` : undefined,
      horarioReingreso:        this.horaReingresoEdit ? `${this.horaReingresoEdit}:00` : undefined,
      ...(!r.idTutor ? {
        nombreResponsable:    this.nombreResponsableEdit,
        apellidoResponsable:  this.apellidoResponsableEdit,
        dNIResponsable:       this.dniResponsableEdit,
        relacionResponsable:  this.relacionResponsableEdit,
        telefonoResponsable:  this.telefonoResponsableEdit,
        correoResponsable:    this.correoResponsableEdit,
      } : {}),
    }).subscribe({
      next: (retiro) => {
        this.guardandoEdit = false;
        this.editando      = false;
        this.data.retiroActivo = retiro;
        this.dialogRef.close(retiro);
      },
      error: () => {
        this.guardandoEdit = false;
        this.snack.open('Error al actualizar el retiro.', 'Cerrar', { duration: 3500 });
      },
    });
  }

  confirmarReingreso(): void {
    if (!this.reingresoValido) return;
    this.guardandoReingreso = true;
    this.retiroService.registrarReingreso({
      idRetiro:         this.data.retiroActivo.idRetiro,
      horarioReingreso: `${this.horaReingreso}:00`,
      nombrePreceptor:  this.preceptorReingreso,
    }).subscribe({
      next: (retiro) => {
        this.guardandoReingreso = false;
        this.dialogRef.close(retiro);
      },
      error: () => {
        this.guardandoReingreso = false;
        this.snack.open('Error al registrar el reingreso.', 'Cerrar', { duration: 3500 });
      },
    });
  }

  confirmarCancelar(): void {
    if (!confirm('¿Confirmar cancelación del retiro? Esto revertirá el tipo de asistencia.')) return;
    this.cancelando = true;
    this.retiroService.cancelarRetiro(this.data.retiroActivo.idRetiro).subscribe({
      next: () => {
        this.cancelando = false;
        this.dialogRef.close('cancelado');
      },
      error: () => {
        this.cancelando = false;
        this.snack.open('Error al cancelar el retiro.', 'Cerrar', { duration: 3500 });
      },
    });
  }

  cerrar(): void { this.dialogRef.close(null); }
}
