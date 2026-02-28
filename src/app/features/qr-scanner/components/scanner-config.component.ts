import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule } from '@angular/common';
import { ScanConfig, SelectOption } from '../models/scanner.models';
import { TipoAsistenciaService } from '../services/tipoasistencia.service';
import { TurnoService } from '../services/turno.service';
import { CursoService } from '../services/curso.service';


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

  <!-- CURSO -->
  <mat-form-field appearance="fill" class="pill">
    <mat-label>Curso</mat-label>
    <mat-select [(ngModel)]="curso">
      <mat-option *ngFor="let c of cursos" [value]="c.id">
        {{ c.label }}
      </mat-option>
    </mat-select>
  </mat-form-field>

  <!-- TURNO -->
  <mat-form-field appearance="fill" class="pill">
    <mat-label>Turno</mat-label>
    <mat-select [(ngModel)]="turno">
      <mat-option *ngFor="let t of turnos" [value]="t">
        {{ t.label }}
      </mat-option>
    </mat-select>
  </mat-form-field>

  <!-- TIPO ASISTENCIA -->
  <mat-form-field appearance="fill" class="pill">
    <mat-label>Tipo de asistencia</mat-label>
    <mat-select [(ngModel)]="attendanceTypeId">
      <mat-option *ngFor="let t of attendanceTypes" [value]="t.id">
        {{ t.label }}
      </mat-option>
    </mat-select>
  </mat-form-field>

  <div class="action-buttons">

    <button
      mat-raised-button
      class="pill-btn"
      [disabled]="!canSubmit"
      (click)="onConfirmRegister()">
      Cargar<br />registro
    </button>

    <button
      mat-raised-button
      class="pill-btn"
      [disabled]="!canSubmit"
      (click)="onCancelRegister()">
      Cancelar<br />registro
    </button>

  </div>

</div>

  `,
  styleUrls: ['../scss/scanner-config.component.scss']
})
export class ScanConfigComponent implements OnInit {

  curso?: string;
  turno?: SelectOption;
  attendanceTypeId?: string;

  cursos: SelectOption[] = [];
  turnos: SelectOption[] = [];
  attendanceTypes: SelectOption[] = [];

  constructor(
    private cursoService: CursoService,
    private turnoService: TurnoService,
    private tipoAsistenciaService: TipoAsistenciaService
  ) {}


  ngOnInit(): void {
  this.cursoService.getCursos()
    .subscribe(res => this.cursos = res);

  this.turnoService.getTurnos()
    .subscribe(res => this.turnos = res);

  this.tipoAsistenciaService.getTipos()
    .subscribe(res => this.attendanceTypes = res);
}


@Input() canSubmit = false;
@Output() confirmRegister = new EventEmitter<void>();

onConfirmRegister() {
  this.confirmRegister.emit();
}

@Output() cancelRegister = new EventEmitter<void>();

onCancelRegister() {
  this.cancelRegister.emit();
}


  isValid(): boolean {
  return !!(this.curso && this.turno && this.attendanceTypeId);
}

getConfig(): ScanConfig | null {
  if (!this.isValid()) return null;

  const selectedAttendanceType = this.attendanceTypes.find(
    type => type.id === this.attendanceTypeId
  );

  return {
    courseId: this.curso!,
    turno: this.turno!.label,
    attendanceTypeId: this.attendanceTypeId!,
    attendanceTypeLabel: selectedAttendanceType?.label ?? this.attendanceTypeId!
  };
}


}
