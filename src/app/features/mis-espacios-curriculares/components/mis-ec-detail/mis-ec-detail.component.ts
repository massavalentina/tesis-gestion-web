import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { MisEspaciosCurricularesService } from '../../services/mis-espacios-curriculares.service';
import { MisEcItem } from '../../models/mis-ec.model';

const DIA_ES: Record<string, string> = {
  Monday: 'Lunes', Tuesday: 'Martes', Wednesday: 'Miércoles',
  Thursday: 'Jueves', Friday: 'Viernes', Saturday: 'Sábado', Sunday: 'Domingo',
};

@Component({
  selector: 'app-mis-ec-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mis-ec-detail.component.html',
  styleUrl: './mis-ec-detail.component.scss',
})
export class MisEcDetailComponent implements OnInit {
  espacio: MisEcItem | null = null;
  loading = true;
  error = false;
  idEC = '';

  constructor(
    private service: MisEspaciosCurricularesService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.idEC = this.route.snapshot.paramMap.get('idEC') ?? '';
    this.service.getMisEspaciosCurriculares().pipe(
      catchError(() => {
        this.error = true;
        this.loading = false;
        return of([]);
      }),
    ).subscribe(ecs => {
      this.espacio = ecs.find(e => e.idEC === this.idEC) ?? null;
      if (!this.espacio && !this.error) this.error = true;
      this.loading = false;
    });
  }

  formatCurso(anio: number, division: string): string {
    return `${anio}°${division}`;
  }

  diasUnicos(): string[] {
    if (!this.espacio) return [];
    const days = this.espacio.horarios.map(h => DIA_ES[h.diaSemana] ?? h.diaSemana);
    return [...new Set(days)];
  }

  horaRango(): string {
    if (!this.espacio?.horarios.length) return '';
    const h = this.espacio.horarios[0];
    return `${h.horarioEntrada} a ${h.horarioSalida}`;
  }

  volverAlListado(): void {
    this.router.navigate(['/mis-espacios-curriculares']);
  }

  navegarProgramas(): void {
    this.router.navigate(['/mis-espacios-curriculares', this.idEC, 'programas']);
  }

  navegarCalificaciones(): void {
    this.router.navigate(['/mis-espacios-curriculares', this.idEC, 'calificaciones']);
  }

  navegarAsistencia(): void {
    if (!this.espacio) return;
    this.router.navigate(['/reporte-asistencia-docente'], {
      queryParams: {
        reporteState_cursoId: this.espacio.idCurso,
        reporteState_espacioId: this.espacio.idEC,
      },
    });
  }

  navegarEstudiantes(): void {
    if (!this.espacio) return;
    this.router.navigate(['/ficha-alumno'], { queryParams: { cursoId: this.espacio.idCurso } });
  }

  navegarPlanificacion(): void {
    this.router.navigate(['/mis-espacios-curriculares', this.idEC, 'planificacion']);
  }

  navegarCalendario(): void {
    this.router.navigate(['/mis-espacios-curriculares', this.idEC, 'calendario']);
  }
}
