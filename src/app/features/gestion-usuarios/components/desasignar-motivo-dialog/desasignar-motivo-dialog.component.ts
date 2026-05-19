import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface DesasignarMotivoData {
  tipo: 'docente' | 'preceptor';
  items: { label: string; detalle?: string }[];
}

export interface DesasignarMotivoResult {
  motivo: string;
}

@Component({
  selector: 'app-desasignar-motivo-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <div class="dlg">
      <div class="dlg-icon">
        <mat-icon>link_off</mat-icon>
      </div>
      <h2 class="dlg-titulo">Desasignar {{ data.tipo === 'docente' ? 'espacios curriculares' : 'cursos' }}</h2>
      <p class="dlg-desc">
        Se {{ data.items.length === 1 ? 'desasignará' : 'desasignarán' }}
        {{ data.items.length }}
        {{ data.tipo === 'docente'
          ? (data.items.length === 1 ? 'espacio curricular' : 'espacios curriculares')
          : (data.items.length === 1 ? 'curso' : 'cursos') }}:
      </p>

      <ul class="dlg-lista">
        <li *ngFor="let item of data.items" class="dlg-item">
          <span class="dlg-item-label">{{ item.label }}</span>
          <span *ngIf="item.detalle" class="dlg-item-detalle">{{ item.detalle }}</span>
        </li>
      </ul>

      <mat-form-field appearance="outline" class="dlg-field">
        <mat-label>Motivo</mat-label>
        <textarea matInput
                  [(ngModel)]="motivo"
                  rows="3"
                  maxlength="300"
                  placeholder="Ingrese el motivo de la desasignación..."></textarea>
        <mat-hint align="end">{{ motivo.length }}/300</mat-hint>
      </mat-form-field>

      <div class="dlg-actions">
        <button mat-stroked-button (click)="cancelar()">Cancelar</button>
        <button mat-flat-button class="btn-confirmar"
                [disabled]="!motivo.trim()"
                (click)="confirmar()">
          Confirmar
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dlg {
      padding: 28px 24px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
      min-width: 340px;
      max-width: 460px;
    }
    .dlg-icon mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: #f59e0b;
    }
    .dlg-titulo {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 700;
      color: #0f2f4b;
      text-align: center;
    }
    .dlg-desc {
      margin: 0;
      font-size: 0.875rem;
      color: #475569;
      text-align: center;
    }
    .dlg-lista {
      width: 100%;
      margin: 0;
      padding: 0 0 0 16px;
      list-style: disc;
      max-height: 140px;
      overflow-y: auto;
    }
    .dlg-item {
      display: flex;
      flex-direction: column;
      gap: 1px;
      padding: 3px 0;
    }
    .dlg-item-label { font-size: 0.85rem; color: #0f2f4b; font-weight: 500; }
    .dlg-item-detalle { font-size: 0.75rem; color: #64748b; }
    .dlg-field { width: 100%; }
    .dlg-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      width: 100%;
    }
    .btn-confirmar { background: #dc2626; color: white; }
    .btn-confirmar:hover:not([disabled]) { background: #b91c1c; }
  `],
})
export class DesasignarMotivoDialogComponent {
  motivo = '';

  constructor(
    private dialogRef: MatDialogRef<DesasignarMotivoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DesasignarMotivoData,
  ) {}

  confirmar(): void {
    if (!this.motivo.trim()) return;
    this.dialogRef.close({ motivo: this.motivo.trim() } satisfies DesasignarMotivoResult);
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }
}
