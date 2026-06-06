import { Component } from '@angular/core';
import { FormsModule }  from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule }  from '@angular/material/button';
import { MatIconModule }   from '@angular/material/icon';
import { MatInputModule }  from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

export interface CancelarRetiroResult {
  confirmado: true;
  motivo: string;
}

@Component({
  selector: 'app-confirmar-cancelacion-retiro-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatIconModule, MatInputModule, MatFormFieldModule],
  template: `
    <div class="cc-wrap">
      <div class="cc-icon-row">
        <mat-icon class="cc-icon">warning</mat-icon>
      </div>
      <h2 class="cc-titulo">¿Cancelar el retiro?</h2>
      <p class="cc-texto">Esto revertirá el tipo de asistencia del turno al estado anterior al retiro.</p>

      <mat-form-field appearance="outline" class="cc-motivo-field">
        <mat-label>Motivo de cancelación</mat-label>
        <textarea matInput [(ngModel)]="motivo" rows="3"
                  placeholder="Ej: El estudiante regresó al aula, error de registro..."></textarea>
        <mat-hint>Opcional — quedará registrado en el parte diario</mat-hint>
      </mat-form-field>

      <div class="cc-actions">
        <button mat-stroked-button (click)="volver()">Volver</button>
        <button mat-flat-button color="warn" (click)="confirmar()">Cancelar retiro</button>
      </div>
    </div>
  `,
  styles: [`
    .cc-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 24px 28px 20px;
      gap: 14px;
      text-align: center;
      min-width: 360px;
    }
    .cc-icon { color: #d97706; font-size: 40px; height: 40px; width: 40px; }
    .cc-titulo { margin: 0; font-size: 1.05rem; font-weight: 700; color: #1e293b; }
    .cc-texto { margin: 0; font-size: 0.875rem; color: #475569; max-width: 300px; }
    .cc-motivo-field { width: 100%; }
    .cc-actions { display: flex; gap: 10px; justify-content: center; margin-top: 4px; }
  `],
})
export class ConfirmarCancelacionRetiroDialogComponent {
  motivo = '';

  constructor(private dialogRef: MatDialogRef<ConfirmarCancelacionRetiroDialogComponent>) {}

  confirmar(): void {
    this.dialogRef.close({ confirmado: true, motivo: this.motivo.trim() } satisfies CancelarRetiroResult);
  }
  volver(): void { this.dialogRef.close(null); }
}
