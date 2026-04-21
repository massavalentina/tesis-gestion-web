import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ProgresoEnvioQr } from '../models/qr-credential-delivery.models';

@Component({
  selector: 'app-delivery-progress-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatProgressBarModule, MatButtonModule],
  template: `
    <div class="dlg">
      <div class="dlg__badge">Enviando</div>
      <h2>Envio de credenciales QR</h2>
      <p class="dlg__sub">{{ descripcionEstado() }}</p>

      <mat-dialog-content class="content">
        <div class="card">
          <div class="row">
            <span>Avance</span>
            <strong>{{ percentage() | number:'1.0-0' }}%</strong>
          </div>

          <mat-progress-bar mode="determinate" [value]="percentage()"></mat-progress-bar>

          <div class="labels" *ngIf="progress">
            <span>0</span>
            <span>{{ progress.total }}</span>
          </div>
        </div>

        <div class="summary" *ngIf="progress">
          <div>Procesados: <strong>{{ progress.procesados }}</strong> / {{ progress.total }}</div>
          <div>Enviados: <strong>{{ progress.enviados }}</strong></div>
          <div>Omitidos: <strong>{{ progress.omitidos }}</strong></div>
          <div>Errores: <strong>{{ progress.errores }}</strong></div>
          <div *ngIf="progress.ultimoDestino">Ultimo destino: <strong>{{ progress.ultimoDestino }}</strong></div>
        </div>

        <p class="last" *ngIf="progress?.ultimoMensaje">
          {{ progress?.ultimoEstudiante ? progress?.ultimoEstudiante + ': ' : '' }}{{ progress?.ultimoMensaje }}
        </p>
      </mat-dialog-content>

      <mat-dialog-actions class="dlg__actions" *ngIf="progress?.estado === 'RUNNING'">
        <button mat-stroked-button class="btn-cancel" (click)="solicitarCancelacion.emit()">
          Cancelar envío
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dlg { color: #0f2f4b; max-width: 92vw; padding: 4px; text-align: center; }
    .dlg__badge {
      display: inline-flex; align-items: center; padding: 6px 12px; border-radius: 999px;
      background: #f0f5fa; border: 1px solid #c7d9eb; color: #3c78b4; font-size: 12px;
      font-weight: 900; margin-bottom: 12px;
    }
    h2 { margin: 0; font-size: 24px; line-height: 1.15; font-weight: 900; }
    .dlg__sub { margin: 10px 0 0; color: rgba(15, 47, 75, 0.74); font-size: 13px; }
    .content { min-width: 430px; display: grid; gap: 12px; padding: 0 !important; margin-top: 16px; }
    .card {
      padding: 16px; border-radius: 18px; border: 1px solid #dce8f3;
      background: #f8fbff; text-align: left;
    }
    .row { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
    .row strong { color: #3c78b4; }
    .labels {
      display: flex; justify-content: space-between; margin-top: 8px;
      color: #6f86a0; font-size: 12px; font-weight: 700;
    }
    .summary {
      padding: 12px 14px; border-radius: 14px; border: 1px solid #dce8f3;
      background: #fff; text-align: left; display: grid; gap: 4px;
      color: #2f4f6d; font-size: 13px;
    }
    .last {
      margin: 0; padding: 12px 14px; border-radius: 14px; border: 1px solid #dce8f3;
      background: #fff; text-align: left; color: #2f4f6d; font-size: 13px;
    }
    .dlg__actions {
      display: flex;
      justify-content: center;
      padding: 0;
      margin-top: 16px;
    }
    .btn-cancel {
      border-color: #d8a8a1 !important;
      color: #b05447 !important;
      border-radius: 12px !important;
      font-weight: 900 !important;
      padding: 10px 18px !important;
    }
    @media (max-width: 540px) {
      .content { min-width: 0; }
      h2 { font-size: 20px; }
    }
  `]
})
export class DialogoProgresoEnvioQrComponent {
  @Output() solicitarCancelacion = new EventEmitter<void>();
  progress: ProgresoEnvioQr | null = null;

  percentage(): number {
    if (!this.progress || this.progress.total === 0) {
      return 0;
    }

    return Math.min(100, (this.progress.procesados / this.progress.total) * 100);
  }

  descripcionEstado(): string {
    if (!this.progress) {
      return 'Preparando envio.';
    }

    if (this.progress.estado === 'FAILED') {
      return 'El proceso finalizo con error.';
    }

    if (this.progress.estado === 'COMPLETED') {
      return 'Proceso completado.';
    }

    return `${this.progress.procesados} de ${this.progress.total} credenciales procesadas`;
  }
}
