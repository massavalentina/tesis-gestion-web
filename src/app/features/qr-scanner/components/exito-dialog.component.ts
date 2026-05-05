import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-exito-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="success-dialog">
      <div class="icon-wrap">
        <mat-icon>check_circle</mat-icon>
      </div>

      <h2>{{ data.titulo ?? 'Registro exitoso' }}</h2>

      <p class="mensaje">{{ data.mensaje }}</p>
      <p class="sub" *ngIf="data.subtitulo">{{ data.subtitulo }}</p>

      <button mat-raised-button class="btn" (click)="cerrar()">
        Aceptar
      </button>
    </div>
  `,
  styles: [`
    .success-dialog {
      text-align: center;
      padding: 26px 22px 18px;
      border-radius: 24px;
      background: white;
      max-width: 340px;
    }

    .icon-wrap {
      width: 72px;
      height: 72px;
      margin: 0 auto 10px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: radial-gradient(circle at 30% 30%, #d9fbe5, #b7f0cd);
      border: 1px solid #86efac;
    }

    .icon-wrap mat-icon {
      font-size: 46px;
      color: #2e7d32;
      width: 46px;
      height: 46px;
    }

    h2 {
      margin: 0 0 8px;
      color: #2e7d32;
      font-size: 1.1rem;
      font-weight: 800;
    }

    .mensaje {
      margin: 0 0 8px;
      font-weight: 600;
      color: #0f172a;
    }

    .sub {
      margin: 0 0 18px;
      font-size: 0.82rem;
      color: #64748b;
    }

    .btn {
      min-width: 128px;
      border-radius: 999px;
      font-weight: 700;
      background: linear-gradient(180deg, #3f88c5 0%, #2f6ea3 100%) !important;
      color: #fff !important;
    }
  `]
})
export class DialogoExitoComponent {
  constructor(
    private referenciaDialogo: MatDialogRef<DialogoExitoComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { mensaje: string; titulo?: string; subtitulo?: string }
  ) {}

  cerrar(): void {
    this.referenciaDialogo.close();
  }
}
