import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { MisEspaciosCurricularesService } from '../../services/mis-espacios-curriculares.service';
import { MisEcItem } from '../../models/mis-ec.model';

const DIA_ES: Record<string, string> = {
  Monday: 'Lunes', Tuesday: 'Martes', Wednesday: 'Miércoles',
  Thursday: 'Jueves', Friday: 'Viernes', Saturday: 'Sábado', Sunday: 'Domingo',
};

@Component({
  selector: 'app-mis-ec-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mis-ec-list.component.html',
  styleUrl: './mis-ec-list.component.scss',
})
export class MisEcListComponent implements OnInit {
  espacios: MisEcItem[] = [];
  cursosFiltro: string[] = [];
  cursoActivo = 'todos';
  loading = true;
  error = false;

  constructor(
    private service: MisEspaciosCurricularesService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.service.getMisEspaciosCurriculares().pipe(
      catchError(() => {
        this.error = true;
        this.loading = false;
        return of([]);
      }),
    ).subscribe(ecs => {
      this.espacios = ecs;
      const seen = new Set<string>();
      this.cursosFiltro = ecs
        .map(e => e.codigoCurso)
        .filter(c => { if (seen.has(c)) return false; seen.add(c); return true; });
      this.loading = false;
    });
  }

  get filtrados(): MisEcItem[] {
    if (this.cursoActivo === 'todos') return this.espacios;
    return this.espacios.filter(e => e.codigoCurso === this.cursoActivo);
  }

  seleccionarCurso(codigo: string): void {
    this.cursoActivo = codigo;
  }

  abrirDetalle(ec: MisEcItem): void {
    this.router.navigate(['/mis-espacios-curriculares', ec.idEC]);
  }

  formatCurso(anio: number, division: string): string {
    return `${anio}.º ${division}`;
  }

  diasEc(ec: MisEcItem): string[] {
    const days = ec.horarios.map(h => DIA_ES[h.diaSemana] ?? h.diaSemana);
    return [...new Set(days)];
  }

  horaRango(ec: MisEcItem): string {
    if (!ec.horarios.length) return '';
    const h = ec.horarios[0];
    return `${h.horarioEntrada} a ${h.horarioSalida}`;
  }
}
