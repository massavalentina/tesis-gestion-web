import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ProgresoGeneracionQr } from '../models/qr-credential-generation.models';

@Component({
  selector: 'app-generation-progress-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatProgressBarModule, MatButtonModule, MatIconModule],
  template: `
    <div class="dlg">
      <div class="dlg__icon">
        <mat-icon>autorenew</mat-icon>
      </div>

      <h2>Generando credenciales QR</h2>
      <p class="dlg__sub">
        {{ descripcionEstado() }}
      </p>

      <mat-dialog-content class="progress-content">
        <div class="progress-card">
          <div class="progress-row">
            <span class="progress-label">Avance</span>
            <strong>{{ percentage() | number:'1.0-0' }}%</strong>
          </div>

          <mat-progress-bar
            mode="determinate"
            [value]="percentage()">
          </mat-progress-bar>

          <div class="progress-track-labels" *ngIf="progress">
            <span>0</span>
            <span>{{ progress.total }}</span>
          </div>
        </div>

        <div class="summary-grid" *ngIf="progress">
          <div class="summary-item">
            <span>Procesados</span>
            <strong>{{ progress.procesados }} / {{ progress.total }}</strong>
          </div>
          <div class="summary-item">
            <span>Generados</span>
            <strong>{{ progress.generados }}</strong>
          </div>
          <div class="summary-item">
            <span>Desactivados</span>
            <strong>{{ progress.desactivados }}</strong>
          </div>
          <div class="summary-item">
            <span>Errores</span>
            <strong>{{ progress.errores }}</strong>
          </div>
        </div>

        <p class="last-message" *ngIf="progress?.ultimoMensaje">
          {{ progress?.ultimoEstudiante ? progress?.ultimoEstudiante + ': ' : '' }}{{ progress?.ultimoMensaje }}
        </p>
      </mat-dialog-content>

      <mat-dialog-actions class="dlg__actions" *ngIf="puedeSolicitarCancelacion()">
        <button mat-stroked-button class="btn-cancel" (click)="solicitarCancelacion.emit()">
          Detener generación
        </button>
      </mat-dialog-actions>

      <p class="cancel-hint" *ngIf="puedeSolicitarCancelacion()">
        Si detiene el proceso, se completa primero el estudiante en curso y luego se aplicará su decisión.
      </p>
    </div>
  `,
  styles: [`
    :host ::ng-deep .mat-mdc-dialog-content{
      max-height: none !important;
      overflow: visible !important;
      padding: 0 !important;
    }

    :host ::ng-deep .mdc-linear-progress {
      height: 12px !important;
      border-radius: 999px !important;
      overflow: hidden !important;
      background: #e6edf5 !important;
    }

    :host ::ng-deep .mdc-linear-progress__bar-inner {
      border-color: #86b8ea !important;
      border-top-width: 12px !important;
    }

    .dlg {
      color: #0f2f4b;
      max-width: 92vw;
      padding: 8px 4px 4px;
      text-align: center;
      font-family: 'Open Sans', sans-serif;
    }

    .dlg__icon {
      width: 56px;
      height: 56px;
      margin: 0 auto 12px;
      display: grid;
      place-items: center;
      border-radius: 16px;
      background: #eef5fb;
      color: #3c78b4;
      border: 1px solid #d7e6f4;
    }

    .dlg__icon mat-icon {
      font-size: 30px;
      width: 30px;
      height: 30px;
    }

    h2 {
      margin: 0;
      font-size: 20px;
      line-height: 1.2;
      font-weight: 700;
    }

    .dlg__sub {
      margin: 10px 0 0;
      color: #4b647a;
      font-size: 13.5px;
      line-height: 1.45;
    }

    .progress-content {
      min-width: 420px;
      display: grid;
      gap: 12px;
      margin-top: 16px;
    }

    .progress-card {
      padding: 14px;
      border-radius: 14px;
      background: #f8fbff;
      border: 1px solid #dce8f3;
    }

    .progress-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      margin-bottom: 12px;
    }

    .progress-label {
      color: #64748b;
      font-weight: 600;
    }

    .progress-row strong {
      color: #3c78b4;
      font-size: 17px;
      font-weight: 700;
    }

    .progress-track-labels {
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
      color: #7b97b4;
      font-size: 12px;
      font-weight: 600;
    }

    .last-message {
      margin: 0;
      padding: 14px 16px;
      border-radius: 16px;
      background: #f7fafc;
      border: 1px solid #dde7f0;
      color: #58738e;
      line-height: 1.45;
      font-size: 13px;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .summary-item {
      padding: 10px 12px;
      border-radius: 12px;
      border: 1px solid #dde7f0;
      background: #fff;
      display: grid;
      gap: 2px;
      text-align: left;
    }

    .summary-item span {
      color: #6f89a2;
      font-size: 12px;
      font-weight: 600;
    }

    .summary-item strong {
      color: #345571;
      font-size: 14px;
      font-weight: 600;
    }

    .dlg__actions {
      display: flex;
      justify-content: center;
      padding: 0;
      margin-top: 18px;
    }

    .btn-cancel {
      border-color: #d8a8a1 !important;
      color: #b05447 !important;
      border-radius: 12px !important;
      font-weight: 600 !important;
      padding: 10px 18px !important;
    }

    .cancel-hint {
      margin: 10px 0 0;
      color: #6d8298;
      text-align: center;
      font-size: 12px;
      line-height: 1.4;
    }

    @media (max-width: 540px) {
      .progress-content {
        min-width: 0;
      }

      h2 {
        font-size: 19px;
      }

      .summary-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DialogoProgresoGeneracionQrComponent {
  @Output() solicitarCancelacion = new EventEmitter<void>();
  progress: ProgresoGeneracionQr | null = null;

  percentage(): number {
    if (!this.progress || this.progress.total === 0) {
      return 0;
    }

    return Math.min(100, (this.progress.procesados / this.progress.total) * 100);
  }

  descripcionEstado(): string {
    if (!this.progress) {
      return 'Estamos preparando el proceso.';
    }

    if (this.progress.estado === 'CANCELLING') {
      return `Cancelando el proceso. Ya se procesaron ${this.progress.procesados} de ${this.progress.total} credenciales.`;
    }

    if (this.progress.estado === 'PAUSING') {
      return `Pausando el proceso. Ya se procesaron ${this.progress.procesados} de ${this.progress.total} credenciales.`;
    }

    if (this.progress.estado === 'PAUSED') {
      return `Proceso pausado en ${this.progress.procesados} de ${this.progress.total} credenciales.`;
    }

    return `${this.progress.procesados} de ${this.progress.total} credenciales procesadas`;
  }

  puedeSolicitarCancelacion(): boolean {
    return this.progress?.estado === 'RUNNING'
      || this.progress?.estado === 'PAUSING'
      || this.progress?.estado === 'PAUSED';
  }
}
