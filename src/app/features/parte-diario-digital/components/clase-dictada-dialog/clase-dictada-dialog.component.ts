import { Component, Inject } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule }   from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule }     from '@angular/material/input';
import { MatIconModule }      from '@angular/material/icon';

import { HorarioClase } from '../../models/horario-clase.model';

export interface ClaseDictadaDialogData {
  clase: HorarioClase;
  /** true = usuario quiere marcar como No Dictada; false = quiere revertir a Dictada */
  nuevoDictada: boolean;
}

export interface ClaseDictadaDialogResult {
  dictada: boolean;
  motivo?: string;
}

@Component({
  selector: 'app-clase-dictada-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
  ],
  template: `
    <div class="cd-wrap">
      <div class="cd-header">
        <mat-icon class="cd-icon" [class.cd-icon--nodictada]="!data.nuevoDictada" [class.cd-icon--dictada]="data.nuevoDictada">
          {{ data.nuevoDictada ? 'check_circle' : 'cancel' }}
        </mat-icon>
        <div>
          <h2 class="cd-title">{{ data.nuevoDictada ? 'Marcar como Dictada' : 'Marcar como No Dictada' }}</h2>
          <p class="cd-sub">{{ data.clase.materia }} · {{ data.clase.horaEntrada }}–{{ data.clase.horaSalida }}</p>
        </div>
      </div>

      <form [formGroup]="form" class="cd-form">
        <mat-form-field *ngIf="!data.nuevoDictada" appearance="outline" class="cd-field">
          <mat-label>Motivo</mat-label>
          <input matInput formControlName="motivo" placeholder="Ej: Docente enfermo, feriado, jornada..." />
          <mat-error *ngIf="form.get('motivo')?.hasError('required')">El motivo es obligatorio.</mat-error>
        </mat-form-field>

      </form>

      <div class="cd-actions">
        <button mat-stroked-button (click)="dialogRef.close(null)">Cancelar</button>
        <button mat-flat-button
                [color]="data.nuevoDictada ? 'primary' : 'warn'"
                [disabled]="form.invalid"
                (click)="confirmar()">
          Confirmar
        </button>
      </div>
    </div>
  `,
  styles: [`
    .cd-wrap {
      padding: 24px;
      min-width: 340px;
      max-width: 440px;
    }
    .cd-header {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      margin-bottom: 20px;
    }
    .cd-icon {
      font-size: 32px;
      height: 32px;
      width: 32px;
      margin-top: 2px;
    }
    .cd-icon--nodictada { color: #b91c1c; }
    .cd-icon--dictada   { color: #15803d; }
    .cd-title {
      margin: 0 0 2px;
      font-size: 1.05rem;
      font-weight: 700;
      color: #1e293b;
    }
    .cd-sub {
      margin: 0;
      font-size: 0.82rem;
      color: #64748b;
    }
    .cd-form { display: flex; flex-direction: column; }
    .cd-field { width: 100%; }
    /* .cd-required no usado */
    .cd-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 8px;
    }
  `],
})
export class ClaseDictadaDialogComponent {

  form: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<ClaseDictadaDialogComponent, ClaseDictadaDialogResult | null>,
    @Inject(MAT_DIALOG_DATA) public data: ClaseDictadaDialogData,
  ) {
    this.form = new FormGroup({
      motivo: new FormControl('', data.nuevoDictada ? [] : [Validators.required]),
    });
  }

  confirmar(): void {
    if (this.form.invalid) return;
    this.dialogRef.close({
      dictada: this.data.nuevoDictada,
      motivo:  this.form.value.motivo || undefined,
    });
  }
}
