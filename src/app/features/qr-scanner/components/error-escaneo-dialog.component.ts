import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface DatosErrorEscaneo {
  titulo: string;
  mensaje: string;
}

@Component({
  selector: 'app-error-escaneo-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="error-dialog">
      <div class="icon-shell">
        <mat-icon>warning_amber</mat-icon>
      </div>

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
      border-radius: 22px;
      padding: 26px 22px 18px;
      text-align: center;
      max-width: 330px;
    }

    .icon-shell {
      width: 58px;
      height: 58px;
      margin: 0 auto 12px;
      border-radius: 18px;
      display: grid;
      place-items: center;
      background: #fff5ea;
      border: 1px solid #f4c796;
      color: #c26a00;
    }

    .icon-shell mat-icon {
      width: 30px;
      height: 30px;
      font-size: 30px;
    }

    h2 {
      color: #0f172a;
      margin: 0 0 10px;
      font-size: 1.04rem;
      font-weight: 700;
    }

    p {
      margin: 0;
      color: #556172;
      font-weight: 400;
      font-size: 0.88rem;
      line-height: 1.45;
    }

    .acciones {
      justify-content: center;
      padding-top: 16px;
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
export class DialogoErrorEscaneoComponent {
  constructor(
    private referenciaDialogo: MatDialogRef<DialogoErrorEscaneoComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DatosErrorEscaneo
  ) {}

  cerrar(): void {
    this.referenciaDialogo.close();
  }
}
