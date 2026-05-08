import { Component } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-abandono-pendiente-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title class="title">Asistencias sin registrar</h2>

    <mat-dialog-content class="contenido">
      <p class="sub">Si sale de esta pantalla los registros se perderán.</p>
    </mat-dialog-content>

    <mat-dialog-actions align="center" class="acciones">
      <button mat-stroked-button class="btn btn--ghost" (click)="cancelar()">Volver</button>
      <button mat-raised-button class="btn btn--warn" (click)="confirmar()">
        Salir y descartar
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .title {
      margin-bottom: 4px;
      color: #0f172a;
      font-size: 1.1rem;
      font-weight: 800;
    }

    .contenido {
      padding-top: 0;
    }

    .sub {
      margin: 4px 0 0;
      color: #64748b;
      font-size: 0.82rem;
    }

    .acciones {
      justify-content: center;
      gap: 10px;
      padding-top: 8px;
    }

    .btn {
      min-width: 126px;
      border-radius: 999px;
      font-weight: 700;
    }

    .btn--ghost {
      border-color: #94a3b8 !important;
      color: #334155 !important;
    }

    .btn--warn {
      background: linear-gradient(180deg, #ef4444 0%, #dc2626 100%) !important;
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
