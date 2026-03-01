import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule } from '@angular/common';
import { ConfiguracionEscaneo, OpcionSeleccion } from '../models/escaner.models';
import { ServicioTipoAsistencia } from '../services/tipoasistencia.service';
import { ServicioTurno } from '../services/turno.service';
import { ServicioCurso } from '../services/curso.service';

@Component({
  selector: 'app-configuracion-escaner',
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
    <mat-select [(ngModel)]="idCurso">
      <mat-option *ngFor="let curso of cursos" [value]="curso.id">
        {{ curso.label }}
      </mat-option>
    </mat-select>
  </mat-form-field>

  <!-- TURNO -->
  <mat-form-field appearance="fill" class="pill">
    <mat-label>Turno</mat-label>
    <mat-select [(ngModel)]="turnoSeleccionado">
      <mat-option *ngFor="let turno of turnos" [value]="turno">
        {{ turno.label }}
      </mat-option>
    </mat-select>
  </mat-form-field>

  <!-- TIPO ASISTENCIA -->
  <mat-form-field appearance="fill" class="pill">
    <mat-label>Tipo de asistencia</mat-label>
    <mat-select [(ngModel)]="idTipoAsistencia">
      <mat-option *ngFor="let tipo of tiposAsistencia" [value]="tipo.id">
        {{ tipo.label }}
      </mat-option>
    </mat-select>
  </mat-form-field>

  <div class="action-buttons">

    <button
      mat-raised-button
      class="pill-btn"
      [disabled]="!puedeEnviar"
      (click)="alConfirmarRegistro()">
      Cargar<br />registro
    </button>

    <button
      mat-raised-button
      class="pill-btn"
      [disabled]="!puedeEnviar"
      (click)="alCancelarRegistro()">
      Cancelar<br />registro
    </button>

  </div>

</div>

  `,
  styleUrls: ['../scss/configuracion-escaner.component.scss']
})
export class ComponenteConfiguracionEscaner implements OnInit {

  idCurso?: string;
  turnoSeleccionado?: OpcionSeleccion;
  idTipoAsistencia?: string;

  cursos: OpcionSeleccion[] = [];
  turnos: OpcionSeleccion[] = [];
  tiposAsistencia: OpcionSeleccion[] = [];

  constructor(
    private servicioCurso: ServicioCurso,
    private servicioTurno: ServicioTurno,
    private servicioTipoAsistencia: ServicioTipoAsistencia
  ) {}

  ngOnInit(): void {
    this.servicioCurso.obtenerCursos()
      .subscribe(res => this.cursos = res);

    this.servicioTurno.obtenerTurnos()
      .subscribe(res => this.turnos = res);

    this.servicioTipoAsistencia.obtenerTipos()
      .subscribe(res => this.tiposAsistencia = res);
  }

  @Input() puedeEnviar = false;
  @Output() confirmarRegistro = new EventEmitter<void>();
  @Output() cancelarRegistro = new EventEmitter<void>();

  alConfirmarRegistro() {
    this.confirmarRegistro.emit();
  }

  alCancelarRegistro() {
    this.cancelarRegistro.emit();
  }

  esValido(): boolean {
    return !!(this.idCurso && this.turnoSeleccionado && this.idTipoAsistencia);
  }

  obtenerConfiguracion(): ConfiguracionEscaneo | null {
    if (!this.esValido()) return null;

    const tipoAsistenciaSeleccionado = this.tiposAsistencia.find(
      tipo => tipo.id === this.idTipoAsistencia
    );

    return {
      idCurso: this.idCurso!,
      turno: this.turnoSeleccionado!.label,
      idTipoAsistencia: this.idTipoAsistencia!,
      etiquetaTipoAsistencia:
        tipoAsistenciaSeleccionado?.label ?? this.idTipoAsistencia!
    };
  }
}
