import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

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
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <div class="dialog-card" [class.dialog-card--warning]="data.esReemplazo">
      <header class="dialog-head">
        <div class="dialog-title-group" [class.dialog-title-group--warning]="data.esReemplazo">
          <span class="dialog-icon" *ngIf="data.esReemplazo">!</span>
          <h2>{{ data.esReemplazo ? 'Alumno ya registrado en el turno' : 'Registrar asistencia' }}</h2>
        </div>
      </header>

      <div class="student-photo">
        <img
          [src]="fotoActual"
          alt="Foto de perfil del estudiante"
          (error)="manejarErrorImagen()">
      </div>

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
          <p class="pregunta">¿Desea reemplazar el registro?</p>

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
      padding: 2px 2px 0;
    }

    .dialog-head {
      display: flex;
      justify-content: center;
      margin-bottom: 10px;
    }

    .dialog-title-group {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      max-width: 100%;
    }

    .dialog-title-group--warning {
      align-items: flex-start;
    }

    .dialog-icon {
      flex: 0 0 22px;
      margin-top: 2px;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #fef3c7;
      border: 1px solid #fdba74;
      color: #b45309;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.84rem;
      font-weight: 800;
    }

    .dialog-head h2 {
      min-width: 0;
      margin: 0;
      font-size: 1.12rem;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.18;
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
      width: 220px;
      height: 220px;
      object-fit: cover;
      border-radius: 18px;
      border: 3px solid #e2e8f0;
      background: linear-gradient(180deg, #dbeafe 0%, #eff6ff 100%);
      box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
    }

    .contenido p {
      margin: 6px 0;
      font-size: 0.88rem;
      color: #334155;
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
      font-size: 0.95rem;
      font-weight: 800;
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
      border-radius: 999px;
      font-weight: 700;
    }

    .btn--ghost {
      border-color: #94a3b8 !important;
      color: #334155 !important;
    }

    .btn--primary {
      background: linear-gradient(180deg, #3f88c5 0%, #2f6ea3 100%) !important;
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
