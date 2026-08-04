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
      border-radius: 22px;
      background: white;
      max-width: 340px;
    }

    .icon-wrap {
      width: 58px;
      height: 58px;
      margin: 0 auto 12px;
      border-radius: 18px;
      display: grid;
      place-items: center;
      background: #eaf7ef;
      border: 1px solid #c5e7d3;
    }

    .icon-wrap mat-icon {
      font-size: 30px;
      color: #2e7d32;
      width: 30px;
      height: 30px;
    }

    h2 {
      margin: 0 0 8px;
      color: #0f172a;
      font-size: 1.04rem;
      font-weight: 700;
    }

    .mensaje {
      margin: 0 0 8px;
      font-weight: 400;
      font-size: 0.88rem;
      line-height: 1.45;
      color: #334155;
    }

    .sub {
      margin: 0 0 18px;
      font-size: 0.8rem;
      color: #64748b;
    }

    .btn {
      min-width: 128px;
      border-radius: 10px;
      font-weight: 600;
      background: #3c78b4 !important;
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
