import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { FichaAlumnoService } from '../../services/ficha-alumno.service';
import { CursoFicha } from '../../models/curso-ficha.model';
import { EstudianteFicha } from '../../models/estudiante-ficha.model';

@Component({
  selector: 'app-ficha-alumno',
  standalone: true,
  imports: [
    CommonModule,
    MatExpansionModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    FormsModule,
  ],
  templateUrl: './ficha-alumno.component.html',
  styleUrl: './ficha-alumno.component.css'
})
export class FichaAlumnoComponent implements OnInit {
  cursos: CursoFicha[] = [];
  cursoSeleccionado: CursoFicha | null = null;

  estudiantes: EstudianteFicha[] = [];
  cargandoCursos = true;
  cargandoEstudiantes = false;
  errorCursos = false;
  errorEstudiantes = false;

  expandedIds = new Set<string>();

  constructor(
    private fichaService: FichaAlumnoService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const cursoId = params.get('cursoId');
    const estudianteId = params.get('estudianteId');

    this.fichaService.getCursos().pipe(
      catchError(() => {
        this.errorCursos = true;
        this.cargandoCursos = false;
        return of([]);
      })
    ).subscribe(cursos => {
      this.cursos = cursos;
      this.cargandoCursos = false;

      if (cursoId) {
        const curso = cursos.find(c => c.idCurso === cursoId) ?? null;
        if (curso) {
          this.cursoSeleccionado = curso;
          this.cargarEstudiantes(curso.idCurso, estudianteId);
        }
      }
    });
  }

  onCursoChange(): void {
    if (!this.cursoSeleccionado) return;
    this.expandedIds.clear();
    this.cargarEstudiantes(this.cursoSeleccionado.idCurso, null);
  }

  private cargarEstudiantes(idCurso: string, autoExpandId: string | null): void {
    this.estudiantes = [];
    this.errorEstudiantes = false;
    this.cargandoEstudiantes = true;

    this.fichaService.getEstudiantesPorCurso(idCurso).pipe(
      catchError(() => {
        this.errorEstudiantes = true;
        this.cargandoEstudiantes = false;
        return of([]);
      })
    ).subscribe(est => {
      this.estudiantes = est;
      this.cargandoEstudiantes = false;
      if (autoExpandId) {
        this.expandedIds.add(autoExpandId);
        setTimeout(() => {
          document.getElementById('alumno-' + autoExpandId)
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 250);
      }
    });
  }

  isExpanded(id: string): boolean {
    return this.expandedIds.has(id);
  }

  onOpened(id: string): void {
    this.expandedIds.add(id);
  }

  onClosed(id: string): void {
    this.expandedIds.delete(id);
  }

  getEstado(est: EstudianteFicha): 'tea' | 'rojo' | 'naranja' | 'amarillo' | 'verde' {
    if (est.teaGeneral) return 'tea';
    if (est.faltasAcumuladas >= 21) return 'rojo';
    if (est.faltasAcumuladas >= 15) return 'naranja';
    if (est.faltasAcumuladas >= 10) return 'amarillo';
    return 'verde';
  }

  verDetalleFaltas(est: EstudianteFicha): void {
    this.router.navigate(['/ficha-alumno/detalle', est.idEstudiante], {
      queryParams: {
        nombre: est.nombre,
        apellido: est.apellido,
        documento: est.documento,
        inasistencias: est.faltasAcumuladas,
        teaGeneral: est.teaGeneral,
        origen: 'ficha',
        fichaState_cursoId: this.cursoSeleccionado?.idCurso ?? '',
        fichaState_estudianteId: est.idEstudiante,
      },
    });
  }

  getLabelFaltas(est: EstudianteFicha): string {
    if (est.teaGeneral) return 'TEA';
    const f = est.faltasAcumuladas;
    return f === 1 ? '1 falta' : `${f} faltas`;
  }
}
