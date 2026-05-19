import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AsignacionService } from '../../services/asignacion.service';
import { CursoSinPreceptor } from '../../models/asignacion.model';

export interface AsignarCursoData {
  idPreceptor: string;
  nombrePreceptor: string;
}

export interface AsignarCursoResult {
  idCurso: string;
}

@Component({
  selector: 'app-asignar-curso-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="dlg">
      <h2 class="dlg-titulo">Asignar curso</h2>
      <p class="dlg-desc">Preceptor: <strong>{{ data.nombrePreceptor }}</strong></p>

      <div class="dlg-loading" *ngIf="cargando()">
        <mat-spinner diameter="32"></mat-spinner>
      </div>

      <ng-container *ngIf="!cargando()">
        <p class="dlg-vacio" *ngIf="cursos().length === 0">
          No hay cursos sin preceptor asignado.
        </p>

        <ng-container *ngIf="cursos().length > 0">
          <mat-form-field appearance="outline" class="dlg-field">
            <mat-label>Curso</mat-label>
            <mat-select [(ngModel)]="idCursoSeleccionado">
              <mat-option *ngFor="let c of cursos()" [value]="c.idCurso">
                {{ c.anio }}° {{ c.division }} — {{ c.codigo }}
                <span *ngIf="c.tieneHistorial" class="hist-badge">&nbsp;(con historial)</span>
              </mat-option>
            </mat-select>
          </mat-form-field>

          <div class="aviso-historial" *ngIf="cursoSeleccionado?.tieneHistorial">
            <mat-icon>info</mat-icon>
            <span>Este curso tuvo un preceptor asignado anteriormente.</span>
          </div>
        </ng-container>
      </ng-container>

      <div class="dlg-actions">
        <button mat-stroked-button (click)="cancelar()">Cancelar</button>
        <button mat-flat-button class="btn-confirmar"
                [disabled]="!idCursoSeleccionado || cargando()"
                (click)="confirmar()">
          Asignar
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dlg {
      padding: 28px 24px 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      min-width: 360px;
      max-width: 480px;
    }
    .dlg-titulo {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 700;
      color: #0f2f4b;
    }
    .dlg-desc { margin: 0; font-size: 0.875rem; color: #475569; }
    .dlg-loading { display: flex; justify-content: center; padding: 16px 0; }
    .dlg-vacio { margin: 0; font-size: 0.875rem; color: #64748b; font-style: italic; }
    .dlg-field { width: 100%; }
    .hist-badge { font-size: 0.75rem; color: #b45309; }
    .aviso-historial {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: #fffbeb;
      border-radius: 8px;
      font-size: 0.8rem;
      color: #92400e;
    }
    .aviso-historial mat-icon { font-size: 16px; width: 16px; height: 16px; color: #d97706; }
    .dlg-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
    .btn-confirmar { background: #0284c7; color: white; }
    .btn-confirmar:hover:not([disabled]) { background: #0369a1; }
  `],
})
export class AsignarCursoDialogComponent implements OnInit {
  cursos = signal<CursoSinPreceptor[]>([]);
  cargando = signal(true);
  idCursoSeleccionado: string | null = null;

  get cursoSeleccionado(): CursoSinPreceptor | undefined {
    return this.cursos().find(c => c.idCurso === this.idCursoSeleccionado);
  }

  constructor(
    private dialogRef: MatDialogRef<AsignarCursoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AsignarCursoData,
    private asignacionService: AsignacionService,
  ) {}

  ngOnInit(): void {
    this.asignacionService.getCursosSinPreceptor().subscribe({
      next: cursos => { this.cursos.set(cursos); this.cargando.set(false); },
      error: () => { this.cargando.set(false); },
    });
  }

  confirmar(): void {
    if (!this.idCursoSeleccionado) return;
    this.dialogRef.close({ idCurso: this.idCursoSeleccionado } satisfies AsignarCursoResult);
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }
}
