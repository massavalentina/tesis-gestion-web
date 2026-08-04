import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, EMPTY, forkJoin } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { FichaAlumnoService } from '../../services/ficha-alumno.service';
import { FichaDetalle } from '../../models/ficha-detalle.model';
import { LibretaEspacio } from '../../models/libreta-calificaciones.model';
import { LibretaCalificacionesComponent } from '../libreta-calificaciones/libreta-calificaciones.component';

@Component({
  selector: 'app-reporte-calificaciones-estudiante',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    LibretaCalificacionesComponent,
  ],
  templateUrl: './reporte-calificaciones-estudiante.component.html',
  styleUrl: './reporte-calificaciones-estudiante.component.scss',
})
export class ReporteCalificacionesEstudianteComponent implements OnInit {
  @Input() estudianteIdInput = '';
  @Input() cursoIdInput = '';
  @Input() embedded = false;

  estudianteId = '';
  cursoId = '';
  estudiante: FichaDetalle | null = null;
  espacios: LibretaEspacio[] = [];

  cargando = true;
  error = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fichaService: FichaAlumnoService,
  ) {}

  ngOnInit(): void {
    const estudianteIdRoute = this.route.snapshot.paramMap.get('estudianteId') ?? '';
    const cursoIdRoute = this.route.snapshot.queryParamMap.get('cursoId') ?? '';
    this.estudianteId = this.estudianteIdInput || estudianteIdRoute;
    this.cursoId = this.cursoIdInput || cursoIdRoute;

    if (!this.estudianteId || !this.cursoId) {
      this.error = true;
      this.cargando = false;
      return;
    }

    forkJoin({
      ficha: this.fichaService.getFichaEstudiante(this.estudianteId),
      espaciosDocente: this.fichaService.getEspaciosCurricularesPorCurso(this.cursoId),
      libreta: this.fichaService.getLibretaEstudiante(this.estudianteId),
    }).pipe(
      catchError(() => {
        this.error = true;
        this.cargando = false;
        return EMPTY;
      }),
    ).subscribe(({ ficha, espaciosDocente, libreta }) => {
      this.estudiante = ficha;
      const idsDocente = new Set(espaciosDocente.map(e => e.idEC));
      this.espacios = libreta.filter(esp => idsDocente.has(esp.idEC));
      this.cargando = false;
    });
  }

  volver(): void {
    if (this.embedded) {
      return;
    }
    this.router.navigate(['/ficha-alumno'], {
      queryParams: { cursoId: this.cursoId, estudianteId: this.estudianteId },
    });
  }
}
