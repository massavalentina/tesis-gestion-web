import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { CommonModule } from '@angular/common';
import { ConfiguracionEscaneo, OpcionSeleccion } from '../models/escaner.models';
import { ServicioTipoAsistencia } from '../services/tipoasistencia.service';
import { ServicioTurno } from '../services/turno.service';

@Component({
  selector: 'app-configuracion-escaner',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSlideToggleModule
  ],
  template: `
    <div class="config">
      <mat-form-field appearance="fill" class="pill">
        <mat-label>Turno</mat-label>
        <mat-select [(ngModel)]="turnoSeleccionado">
          <mat-option [value]="null">Automático por horario</mat-option>
          <mat-option *ngFor="let turno of turnos" [value]="turno">
            {{ turno.label }}
          </mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="fill" class="pill">
        <mat-label>Tipo de Asistencia</mat-label>
        <mat-select [(ngModel)]="idTipoAsistencia">
          <mat-option [value]="null">Presente (P) por defecto</mat-option>
          <mat-option *ngFor="let tipo of tiposAsistencia" [value]="tipo.id">
            {{ tipo.label }}
          </mat-option>
        </mat-select>
      </mat-form-field>

      <mat-slide-toggle [(ngModel)]="modoRafaga">Modo Ráfaga</mat-slide-toggle>

      <div class="action-buttons">
        <button
          mat-raised-button
          class="pill-btn pill-btn--primary"
          [disabled]="!puedeEnviar"
          (click)="alConfirmarRegistro()">
          Cargar<br />registro
        </button>

        <button
          *ngIf="puedeEnviar"
          mat-stroked-button
          class="pill-btn pill-btn--secondary"
          (click)="alCancelarRegistro()">
          Cancelar<br />registro
        </button>
      </div>
    </div>
  `,
  styleUrls: ['../scss/configuracion-escaner.component.scss']
})
export class ComponenteConfiguracionEscaner implements OnInit {

  turnoSeleccionado?: OpcionSeleccion;
  idTipoAsistencia?: string;
  modoRafaga = false;

  turnos: OpcionSeleccion[] = [];
  tiposAsistencia: OpcionSeleccion[] = [];

  constructor(
    private servicioTurno: ServicioTurno,
    private servicioTipoAsistencia: ServicioTipoAsistencia
  ) {}

  ngOnInit(): void {
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
    return this.turnos.length > 0 && this.tiposAsistencia.length > 0;
  }

  obtenerConfiguracion(): ConfiguracionEscaneo | null {
    const tipoAsistenciaSeleccionado = this.tiposAsistencia.find(
      tipo => tipo.id === this.idTipoAsistencia
    );

    return {
      turno: this.turnoSeleccionado?.id ?? null,
      idTipoAsistencia: this.idTipoAsistencia ?? null,
      etiquetaTipoAsistencia:
        tipoAsistenciaSeleccionado?.label ?? null,
      modoRafaga: this.modoRafaga
    };
  }
}
