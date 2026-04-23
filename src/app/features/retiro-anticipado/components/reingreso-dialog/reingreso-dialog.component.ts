import { Component, Inject } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { FormsModule }       from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule }          from '@angular/material/button';
import { MatIconModule }            from '@angular/material/icon';
import { MatInputModule }           from '@angular/material/input';
import { MatFormFieldModule }       from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule }         from '@angular/material/divider';
import { MatChipsModule }           from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { RetiroService }    from '../../services/retiro.service';
import { RetiroActivo }     from '../../models/retiro-activo.model';
import { EstudianteManual } from '../../../asistencia-general-manual/models/estudiante-manual.model';

export interface ReingresoDialogData {
  estudiante:   EstudianteManual;
  retiroActivo: RetiroActivo;
  fecha:        string;
}

@Component({
  selector: 'app-reingreso-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatDialogModule, MatButtonModule, MatIconModule,
    MatInputModule, MatFormFieldModule, MatProgressSpinnerModule,
    MatDividerModule, MatChipsModule, MatSnackBarModule,
  ],
  template: `
    <div class="rei-wrap">

      <!-- Header -->
      <div class="rei-header">
        <mat-icon class="rei-header-icon">login</mat-icon>
        <div>
          <h2 class="rei-titulo">Registrar Reingreso</h2>
          <p class="rei-subtitulo">{{ data.estudiante.apellido }}, {{ data.estudiante.nombre }}</p>
        </div>
        <button mat-icon-button class="rei-close" (click)="dialogRef.close(null)">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-divider></mat-divider>

      <div class="rei-body">

        <!-- Info del retiro -->
        <div class="rei-info-card">
          <div class="rei-info-row">
            <mat-icon class="rei-info-icon">schedule</mat-icon>
            <span class="rei-info-label">Hora de retiro:</span>
            <strong>{{ data.retiroActivo.horarioRetiro }}</strong>
          </div>
          <div *ngIf="data.retiroActivo.horarioLimiteReingreso" class="rei-info-row">
            <mat-icon class="rei-info-icon">timer</mat-icon>
            <span class="rei-info-label">Límite de reingreso:</span>
            <strong>{{ data.retiroActivo.horarioLimiteReingreso }}</strong>
          </div>
          <div class="rei-info-row">
            <mat-icon class="rei-info-icon">label</mat-icon>
            <span class="rei-info-label">Estado actual:</span>
            <span [class]="etiquetaClass">{{ data.retiroActivo.etiquetaEstado ?? '—' }}</span>
          </div>
        </div>

        <!-- Nombre preceptor -->
        <mat-form-field class="rei-field" appearance="outline">
          <mat-label>Nombre del preceptor</mat-label>
          <input matInput [(ngModel)]="nombrePreceptor" placeholder="Ej: Martínez, Juan" />
        </mat-form-field>

        <!-- Hora de reingreso -->
        <mat-form-field class="rei-field" appearance="outline">
          <mat-label>Hora de reingreso</mat-label>
          <input matInput type="time" [(ngModel)]="horaReingreso" />
        </mat-form-field>

      </div>

      <mat-divider></mat-divider>

      <div class="rei-footer">
        <button mat-stroked-button (click)="dialogRef.close(null)">Cancelar</button>
        <button mat-flat-button color="primary"
                [disabled]="guardando || !formValido"
                (click)="confirmar()">
          <mat-spinner *ngIf="guardando" diameter="16" class="btn-spinner"></mat-spinner>
          {{ guardando ? 'Registrando...' : 'Registrar Reingreso' }}
        </button>
      </div>

    </div>
  `,
  styles: [`
    .rei-wrap {
      font-family: 'Open Sans', sans-serif;
      display: flex; flex-direction: column;
    }
    .rei-header {
      display: flex; align-items: center; gap: 12px; padding: 20px 20px 16px;
    }
    .rei-header-icon { color: #15803d; font-size: 28px; height: 28px; width: 28px; flex-shrink: 0; }
    .rei-titulo { margin: 0; font-size: 1.05rem; font-weight: 700; color: #1e293b; }
    .rei-subtitulo { margin: 2px 0 0; font-size: 0.85rem; color: #64748b; }
    .rei-close { margin-left: auto; flex-shrink: 0; }

    .rei-body { display: flex; flex-direction: column; gap: 14px; padding: 20px; }
    .rei-field { width: 100%; }

    .rei-info-card {
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
      padding: 12px 16px; display: flex; flex-direction: column; gap: 8px;
    }
    .rei-info-row { display: flex; align-items: center; gap: 8px; font-size: 0.875rem; }
    .rei-info-icon { font-size: 16px; height: 16px; width: 16px; color: #94a3b8; }
    .rei-info-label { color: #64748b; }

    .chip-ConReingreso    { background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; border-radius: 10px; padding: 2px 10px; font-size: 0.78rem; font-weight: 600; }
    .chip-ReingresoVencido { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; border-radius: 10px; padding: 2px 10px; font-size: 0.78rem; font-weight: 600; }
    .chip-Reingresado     { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; border-radius: 10px; padding: 2px 10px; font-size: 0.78rem; font-weight: 600; }

    .rei-footer {
      display: flex; justify-content: flex-end; gap: 8px; padding: 12px 20px;
    }
    .btn-spinner { display: inline-block; margin-right: 6px; vertical-align: middle; }
  `],
})
export class ReingresoDialogComponent {

  nombrePreceptor = '';
  horaReingreso   = '';
  guardando       = false;

  get formValido(): boolean {
    return !!this.nombrePreceptor.trim() && !!this.horaReingreso;
  }

  get etiquetaClass(): string {
    const e = this.data.retiroActivo.etiquetaEstado;
    if (!e) return '';
    return `chip-${e}`;
  }

  constructor(
    public  dialogRef: MatDialogRef<ReingresoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ReingresoDialogData,
    private retiroService: RetiroService,
    private snack: MatSnackBar,
  ) {}

  confirmar(): void {
    if (!this.formValido) return;

    this.guardando = true;
    this.retiroService.registrarReingreso({
      idRetiro:         this.data.retiroActivo.idRetiro,
      horarioReingreso: `${this.horaReingreso}:00`,
      nombrePreceptor:  this.nombrePreceptor,
    }).subscribe({
      next: (retiro: RetiroActivo) => {
        this.guardando = false;
        this.dialogRef.close(retiro);
      },
      error: () => {
        this.guardando = false;
        this.snack.open('Error al registrar el reingreso.', 'Cerrar', { duration: 3500 });
      },
    });
  }
}
