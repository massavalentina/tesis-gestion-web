import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface DatosErrorEscaneo {
  titulo: string;
  mensaje: string;
}

@Component({
  selector: 'app-error-escaneo-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule
  ],
  template: `
    <div class="error-dialog">
      <button class="close-btn" (click)="cerrar()">✕</button>

      <div class="icon">!</div>

      <h2>{{ data.titulo }}</h2>

      <p [innerHTML]="data.mensaje"></p>

      <mat-dialog-actions align="center" class="acciones">
        <button mat-raised-button class="btn" (click)="cerrar()">Entendido</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .error-dialog {
      position: relative;
      background: #fff;
      border-radius: 24px;
      padding: 26px 20px 16px;
      text-align: center;
      max-width: 330px;
    }

    .icon {
      width: 58px;
      height: 58px;
      margin: 0 auto 12px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: #fff7ed;
      border: 2px solid #fdba74;
      color: #c2410c;
      font-size: 1.85rem;
      font-weight: 900;
    }

    h2 {
      color: #b91c1c;
      margin: 0 0 10px;
      font-size: 1.28rem;
      font-weight: 800;
    }

    p {
      margin: 0;
      color: #7f1d1d;
      font-weight: 600;
      font-size: 0.94rem;
      line-height: 1.35;
    }

    .close-btn {
      position: absolute;
      top: 8px;
      right: 12px;
      border: none;
      background: transparent;
      font-size: 24px;
      line-height: 1;
      color: #0f172a;
      cursor: pointer;
    }

    .acciones {
      justify-content: center;
      padding-top: 16px;
    }

    .btn {
      min-width: 128px;
      border-radius: 999px;
      font-weight: 700;
      background: linear-gradient(180deg, #ef4444 0%, #dc2626 100%) !important;
      color: #fff !important;
    }
  `]
})
export class DialogoErrorEscaneoComponent {
  constructor(
    private referenciaDialogo: MatDialogRef<DialogoErrorEscaneoComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DatosErrorEscaneo
  ) {}

  cerrar(): void {
    this.referenciaDialogo.close();
  }
}
