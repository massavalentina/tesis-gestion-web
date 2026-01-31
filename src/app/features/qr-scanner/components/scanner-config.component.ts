import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { ScanConfig, Turno } from '../models/scanner.models';

@Component({
  selector: 'app-scan-config',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatSelectModule
  ],
  template: `
    <div class="config">

        <mat-form-field appearance="fill" class="pill">
            <mat-label>Curso</mat-label>
            <mat-select [(ngModel)]="curso">
                <mat-option *ngFor="let c of cursos" [value]="c">
                {{ c }}
                </mat-option>
            </mat-select>
            </mat-form-field>

            <mat-form-field appearance="fill" class="pill">
            <mat-label>Turno</mat-label>
            <mat-select [(ngModel)]="turno">
                <mat-option value="MANIANA">Mañana</mat-option>
                <mat-option value="TARDE">Tarde</mat-option>
            </mat-select>
            </mat-form-field>

            <mat-form-field appearance="fill" class="pill">
            <mat-label>Tipo de asistencia</mat-label>
            <mat-select [(ngModel)]="attendanceTypeId">
                <mat-option *ngFor="let t of attendanceTypes" [value]="t.id">
                {{ t.name }}
                </mat-option>
            </mat-select>
        </mat-form-field>

        <div class="action-buttons">

            <button
                mat-raised-button
                class="pill-btn disabled"
                >
                Cargar<br />registro
            </button>

            <button
                mat-raised-button
                class="pill-btn disabled"
                >
                Cancelar<br />registro
            </button>

            </div>


    </div>
  `,
  styleUrls: ['../scss/scanner-config.component.scss']
})
export class ScanConfigComponent {

  curso?: string;
  turno?: Turno;
  attendanceTypeId?: number;

  cursos = ['1° A', '1° B', '2° A'];
  attendanceTypes = [
    { id: 1, name: 'Presente' },
    { id: 2, name: 'Llegada tarde' }
  ];

  isValid(): boolean {
    return !!(this.curso && this.turno && this.attendanceTypeId);
  }

  getConfig(): ScanConfig | null {
    if (!this.isValid()) return null;

    return {
      turno: this.turno!,
      attendanceTypeId: this.attendanceTypeId!
    };
  }


}

