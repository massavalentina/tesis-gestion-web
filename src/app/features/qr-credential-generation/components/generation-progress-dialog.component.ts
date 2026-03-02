import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ProgresoGeneracionQr } from '../models/qr-credential-generation.models';

@Component({
  selector: 'app-generation-progress-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatProgressBarModule],
  template: `
    <h2 mat-dialog-title>Generando credenciales</h2>

    <mat-dialog-content class="progress-content">
      <p class="progress-copy" *ngIf="progress">
        {{ progress.procesados }} de {{ progress.total }} procesados
      </p>

      <mat-progress-bar
        mode="determinate"
        [value]="percentage()">
      </mat-progress-bar>

      <div class="stats" *ngIf="progress">
        <span>Generados: {{ progress.generados }}</span>
        <span>Desactivados: {{ progress.desactivados }}</span>
        <span>Omitidos: {{ progress.omitidos }}</span>
        <span>Errores: {{ progress.errores }}</span>
      </div>

      <p class="last-message" *ngIf="progress?.ultimoMensaje">
        {{ progress?.ultimoEstudiante ? progress?.ultimoEstudiante + ': ' : '' }}{{ progress?.ultimoMensaje }}
      </p>
    </mat-dialog-content>
  `,
  styles: [`
    .progress-content {
      min-width: 360px;
      padding-top: 8px;
    }

    .progress-copy,
    .last-message {
      color: #48625d;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin-top: 18px;
      color: #2a433f;
      font-weight: 500;
    }

    .last-message {
      margin-top: 18px;
    }

    @media (max-width: 540px) {
      .progress-content {
        min-width: 0;
      }

      .stats {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DialogoProgresoGeneracionQrComponent {
  progress: ProgresoGeneracionQr | null = null;

  percentage(): number {
    if (!this.progress || this.progress.total === 0) {
      return 0;
    }

    return Math.min(100, (this.progress.procesados / this.progress.total) * 100);
  }
}
