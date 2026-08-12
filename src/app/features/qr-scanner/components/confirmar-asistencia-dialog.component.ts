import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface DatosConfirmarAsistencia {
  nombre: string;
  apellido: string;
  curso: string;
  fotoEstudiante?: string | null;
  turno: string;
  tipoAsistencia: string;
  esReemplazo?: boolean;
  tipoAnterior?: string;
}

@Component({
  selector: 'app-confirmar-asistencia-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="dialog-card" [class.dialog-card--warning]="data.esReemplazo">
      <header class="dialog-head">
        <div class="dialog-icon-shell" [class.dialog-icon-shell--warning]="data.esReemplazo">
          <mat-icon>{{ data.esReemplazo ? 'sync_alt' : 'qr_code_2' }}</mat-icon>
        </div>
        <h2>{{ data.esReemplazo ? 'Alumno ya registrado en el turno' : 'Registrar asistencia' }}</h2>
      </header>

      <div class="student-photo">
        <img
          [src]="fotoActual"
          alt="Foto de perfil del estudiante"
          (error)="manejarErrorImagen()">
      </div>

      <div class="details-card">
        <div class="contenido">
          <p><strong>Alumno:</strong> {{ data.apellido }}, {{ data.nombre }}</p>
          <p><strong>Curso:</strong> {{ data.curso }}</p>
          <p><strong>Turno:</strong> {{ data.turno }}</p>

          <ng-container *ngIf="!data.esReemplazo">
            <div class="tipo-inline">
              <p class="label-tipo"><strong>Tipo seleccionado:</strong></p>
              <span class="code-pill" [class]="chipClass(data.tipoAsistencia)">
                {{ data.tipoAsistencia }}
              </span>
            </div>
          </ng-container>

          <ng-container *ngIf="data.esReemplazo">
            <p class="pregunta">¿Desea reemplazar el registro existente?</p>

            <div class="cambio-row">
              <span class="code-pill" [class]="chipClass(data.tipoAnterior)">
                {{ data.tipoAnterior }}
              </span>
              <span class="arrow">→</span>
              <span class="code-pill" [class]="chipClass(data.tipoAsistencia)">
                {{ data.tipoAsistencia }}
              </span>
            </div>
          </ng-container>
        </div>
      </div>

      <mat-dialog-actions align="center" class="acciones">
        <button mat-stroked-button class="btn btn--ghost" (click)="cancelar()">Cancelar</button>
        <button mat-raised-button class="btn btn--primary" (click)="confirmar()">
          {{ data.esReemplazo ? 'Reemplazar' : 'Confirmar' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog-card {
      min-width: 286px;
      max-width: 350px;
      padding: 4px 2px 0;
    }

    .dialog-head {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      margin-bottom: 12px;
    }

    .dialog-icon-shell {
      width: 58px;
      height: 58px;
      border-radius: 18px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: #eaf3fb;
      border: 1px solid #d7e6f4;
      color: #3c78b4;
    }

    .dialog-icon-shell--warning {
      background: #fff5ea;
      border-color: #f4c796;
      color: #c26a00;
    }

    .dialog-icon-shell mat-icon {
      width: 30px;
      height: 30px;
      font-size: 30px;
    }

    .dialog-head h2 {
      min-width: 0;
      margin: 0;
      font-size: 1.04rem;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.24;
      text-align: center;
      white-space: normal;
      overflow-wrap: anywhere;
    }

    .dialog-card--warning .dialog-head h2 {
      color: #7c2d12;
    }

    .student-photo {
      display: flex;
      justify-content: center;
      margin: 2px 0 14px;
    }

    .student-photo img {
      width: 206px;
      height: 206px;
      object-fit: cover;
      border-radius: 16px;
      border: 2px solid #d7e6f4;
      background: linear-gradient(180deg, #dbeafe 0%, #eff6ff 100%);
      box-shadow: 0 10px 24px rgba(15, 23, 42, 0.1);
    }

    .details-card {
      border: 1px solid #d7e6f4;
      border-radius: 14px;
      background: #f8fbff;
      padding: 12px 14px;
    }

    .contenido p {
      margin: 6px 0;
      font-size: 0.84rem;
      color: #334155;
      line-height: 1.45;
    }

    .label-tipo {
      margin: 0;
    }

    .tipo-inline {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
      flex-wrap: wrap;
    }

    .pregunta {
      margin-top: 10px;
      margin-bottom: 2px;
      font-size: 0.9rem;
      font-weight: 700;
      color: #1f2937;
    }

    .cambio-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 6px;
    }

    .arrow {
      color: #0f172a;
      font-size: 1.6rem;
      line-height: 1;
    }

    .code-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 36px;
      padding: 2px 10px;
      border-radius: 999px;
      font-size: 0.76rem;
      font-weight: 700;
      border: 1px solid transparent;
    }

    .chip-p { background: rgba(21, 128, 61, .12); color: #15803d; border-color: #bbf7d0; }
    .chip-a { background: rgba(185, 28, 28, .12); color: #b91c1c; border-color: #fecaca; }
    .chip-anc { background: rgba(2, 132, 199, .12); color: #0369a1; border-color: #bae6fd; }
    .chip-llt, .chip-llte, .chip-lltc { background: rgba(194, 65, 12, .12); color: #c2410c; border-color: #fed7aa; }

    .acciones {
      justify-content: center;
      gap: 10px;
      padding-top: 14px;
      padding-bottom: 2px;
    }

    .btn {
      min-width: 122px;
      border-radius: 10px;
      font-weight: 600;
    }

    .btn--ghost {
      border-color: #bfd4e7 !important;
      color: #3c78b4 !important;
    }

    .btn--primary {
      background: #3c78b4 !important;
      color: #fff !important;
    }
  `]
})
export class DialogoConfirmarAsistenciaComponent {
  private static readonly FOTO_FALLBACK = '/estudiantes/estudiante_amarillo.png';

  fotoActual: string;

  constructor(
    private readonly referenciaDialogo: MatDialogRef<DialogoConfirmarAsistenciaComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DatosConfirmarAsistencia
  ) {
    this.fotoActual = this.resolverFoto(data.fotoEstudiante);
  }

  chipClass(codigo?: string): string {
    return `chip-${(codigo ?? '').toLowerCase()}`;
  }

  manejarErrorImagen(): void {
    if (this.fotoActual === DialogoConfirmarAsistenciaComponent.FOTO_FALLBACK) {
      return;
    }

    this.fotoActual = DialogoConfirmarAsistenciaComponent.FOTO_FALLBACK;
  }

  confirmar(): void {
    this.referenciaDialogo.close(true);
  }

  cancelar(): void {
    this.referenciaDialogo.close(false);
  }

  private resolverFoto(path?: string | null): string {
    const valor = path?.trim();
    return valor ? valor : DialogoConfirmarAsistenciaComponent.FOTO_FALLBACK;
  }
}
