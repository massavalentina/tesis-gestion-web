import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ProgresoGeneracionQr } from '../models/qr-credential-generation.models';

@Component({
  selector: 'app-generation-progress-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatProgressBarModule, MatButtonModule],
  template: `
    <div class="dlg">
      <div class="dlg__head">
        <div class="dlg__badge">Generando</div>
        <h2>Generando credenciales QR</h2>
        <p class="dlg__sub">
          {{ descripcionEstado() }}
        </p>
      </div>

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

        <p class="last-message" *ngIf="progress?.ultimoMensaje">
          {{ progress?.ultimoEstudiante ? progress?.ultimoEstudiante + ': ' : '' }}{{ progress?.ultimoMensaje }}
        </p>
      </mat-dialog-content>

      <mat-dialog-actions class="dlg__actions" *ngIf="progress?.estado === 'RUNNING'">
        <button mat-stroked-button class="btn-cancel" (click)="solicitarCancelacion.emit()">
          Cancelar proceso
        </button>
      </mat-dialog-actions>
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
      padding: 4px;
    }

    .dlg__head {
      text-align: center;
      margin-bottom: 18px;
    }

    .dlg__badge {
      display: inline-flex;
      align-items: center;
      padding: 6px 12px;
      border-radius: 999px;
      background: #f0f5fa;
      border: 1px solid #c7d9eb;
      color: #86b8ea;
      font-size: 12px;
      font-weight: 900;
      margin-bottom: 12px;
    }

    h2 {
      margin: 0;
      font-size: 24px;
      line-height: 1.15;
      font-weight: 900;
      letter-spacing: -0.4px;
    }

    .dlg__sub {
      margin: 10px 0 0;
      color: rgba(15, 47, 75, 0.72);
      font-size: 13px;
      font-weight: 600;
    }

    .progress-content {
      min-width: 420px;
      display: grid;
      gap: 14px;
    }

    .progress-card {
      padding: 16px;
      border-radius: 20px;
      background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
      border: 1px solid rgba(199, 217, 235, 0.95);
      box-shadow: 0 12px 26px rgba(20, 55, 90, 0.08);
    }

    .progress-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      margin-bottom: 12px;
    }

    .progress-label {
      color: #5d7c9a;
      font-weight: 800;
    }

    .progress-row strong {
      color: #86b8ea;
      font-size: 18px;
      font-weight: 900;
    }

    .progress-track-labels {
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
      color: #7b97b4;
      font-size: 12px;
      font-weight: 700;
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
      font-weight: 900 !important;
      padding: 10px 18px !important;
    }

    @media (max-width: 540px) {
      .progress-content {
        min-width: 0;
      }

      h2 {
        font-size: 20px;
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
}
