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
import { ECsinDocente } from '../../models/asignacion.model';

export interface AsignarECData {
  idDocente: string;
  nombreDocente: string;
}

export interface AsignarECResult {
  idEC: string;
}

@Component({
  selector: 'app-asignar-ec-dialog',
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
      <h2 class="dlg-titulo">Asignar espacio curricular</h2>
      <p class="dlg-desc">Docente: <strong>{{ data.nombreDocente }}</strong></p>

      <div class="dlg-loading" *ngIf="cargando()">
        <mat-spinner diameter="32"></mat-spinner>
      </div>

      <ng-container *ngIf="!cargando()">
        <p class="dlg-vacio" *ngIf="ecs().length === 0">
          No hay espacios curriculares sin docente asignado.
        </p>

        <ng-container *ngIf="ecs().length > 0">
          <mat-form-field appearance="outline" class="dlg-field">
            <mat-label>Espacio curricular</mat-label>
            <mat-select [(ngModel)]="idECSeleccionado">
              <mat-option *ngFor="let ec of ecs()" [value]="ec.idEC">
                {{ ec.nombreCurricula }} — {{ formatCodigoCurso(ec.codigoCurso) }}
                <span *ngIf="ec.tieneHistorial" class="hist-badge">&nbsp;(con historial)</span>
              </mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Horarios del EC seleccionado -->
          <div class="horarios-panel" *ngIf="ecSeleccionado && ecSeleccionado.horarios.length > 0">
            <span class="horarios-label">Horarios</span>
            <div class="horarios-chips">
              <span class="horario-chip" *ngFor="let h of ecSeleccionado.horarios">
                {{ formatHorario(h) }}
              </span>
            </div>
          </div>
          <div class="horarios-panel horarios-panel--vacio" *ngIf="ecSeleccionado && ecSeleccionado.horarios.length === 0">
            <span class="horarios-label">Horarios</span>
            <span class="sin-horario">Sin horario asignado</span>
          </div>

          <div class="aviso-historial" *ngIf="ecSeleccionado?.tieneHistorial">
            <mat-icon>info</mat-icon>
            <span>Este espacio curricular fue asignado anteriormente a otro docente.</span>
          </div>
        </ng-container>
      </ng-container>

      <div class="dlg-actions">
        <button mat-stroked-button (click)="cancelar()">Cancelar</button>
        <button mat-flat-button class="btn-confirmar"
                [disabled]="!idECSeleccionado || cargando()"
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
    .horarios-panel {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 8px;
      flex-wrap: wrap;
    }
    .horarios-panel--vacio { background: #f8fafc; border-color: #e2e8f0; }
    .horarios-label {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #0369a1;
      white-space: nowrap;
    }
    .horarios-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .horario-chip {
      background: #e0f2fe;
      color: #0369a1;
      border-radius: 4px;
      padding: 3px 8px;
      font-size: 0.75rem;
      font-weight: 500;
      white-space: nowrap;
    }
    .sin-horario { font-size: 0.8rem; color: #94a3b8; font-style: italic; }
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
export class AsignarECDialogComponent implements OnInit {
  ecs = signal<ECsinDocente[]>([]);
  cargando = signal(true);
  idECSeleccionado: string | null = null;

  get ecSeleccionado(): ECsinDocente | undefined {
    return this.ecs().find(ec => ec.idEC === this.idECSeleccionado);
  }

  constructor(
    private dialogRef: MatDialogRef<AsignarECDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AsignarECData,
    private asignacionService: AsignacionService,
  ) {}

  ngOnInit(): void {
    this.asignacionService.getECsSinDocente().subscribe({
      next: ecs => { this.ecs.set(ecs); this.cargando.set(false); },
      error: () => { this.cargando.set(false); },
    });
  }

  formatCodigoCurso(codigo: string): string {
    const m = codigo.match(/^(\d+)([A-Za-z]+)(?:[- ](\d{4}))?/);
    if (!m) return codigo;
    const year = m[3] ? ` - ${m[3]}` : '';
    return `${m[1]}.º ${m[2].toUpperCase()}${year}`;
  }

  formatHorario(h: { diaSemana: string; horarioEntrada: string; horarioSalida: string }): string {
    const dias: Record<string, string> = {
      monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles',
      thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo',
    };
    const dia = dias[h.diaSemana.toLowerCase()] ?? h.diaSemana;
    return `${dia} ${h.horarioEntrada}–${h.horarioSalida}`;
  }

  confirmar(): void {
    if (!this.idECSeleccionado) return;
    this.dialogRef.close({ idEC: this.idECSeleccionado } satisfies AsignarECResult);
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }
}
