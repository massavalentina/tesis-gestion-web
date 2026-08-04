import { Component } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-abandono-pendiente-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="dialog-head">
      <div class="dialog-icon-shell">
        <mat-icon>logout</mat-icon>
      </div>
      <h2 mat-dialog-title class="title">Asistencias sin registrar</h2>
    </div>

    <mat-dialog-content class="contenido">
      <div class="message-card">
        <p class="sub">Si sale de esta pantalla, los registros pendientes se perderán.</p>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="center" class="acciones">
      <button mat-stroked-button class="btn btn--ghost" (click)="cancelar()">Volver</button>
      <button mat-raised-button class="btn btn--warn" (click)="confirmar()">
        Salir y descartar
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-head {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
    }

    .dialog-icon-shell {
      width: 58px;
      height: 58px;
      border-radius: 18px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: #fff5ea;
      border: 1px solid #f4c796;
      color: #c26a00;
    }

    .dialog-icon-shell mat-icon {
      width: 30px;
      height: 30px;
      font-size: 30px;
    }

    .title {
      margin: 0;
      color: #0f172a;
      font-size: 1.04rem;
      font-weight: 700;
      text-align: center;
    }

    .contenido {
      padding-top: 0;
    }

    .message-card {
      border: 1px solid #d7e6f4;
      border-radius: 14px;
      background: #f8fbff;
      padding: 12px 14px;
    }

    .sub {
      margin: 0;
      color: #556172;
      font-size: 0.84rem;
      line-height: 1.45;
    }

    .acciones {
      justify-content: center;
      gap: 10px;
      padding-top: 8px;
    }

    .btn {
      min-width: 126px;
      border-radius: 10px;
      font-weight: 600;
    }

    .btn--ghost {
      border-color: #bfd4e7 !important;
      color: #3c78b4 !important;
    }

    .btn--warn {
      background: #c26a00 !important;
      color: #fff !important;
    }
  `]
})
export class DialogoAbandonoPendienteComponent {
  constructor(
    private readonly referenciaDialogo: MatDialogRef<DialogoAbandonoPendienteComponent>
  ) {}

  confirmar(): void {
    this.referenciaDialogo.close(true);
  }

  cancelar(): void {
    this.referenciaDialogo.close(false);
  }
}
