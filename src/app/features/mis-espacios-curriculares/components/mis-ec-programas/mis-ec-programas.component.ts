import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { MisEspaciosCurricularesService } from '../../services/mis-espacios-curriculares.service';
import { MisEcItem } from '../../models/mis-ec.model';

@Component({
  selector: 'app-mis-ec-programas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mis-ec-programas.component.html',
  styleUrl: './mis-ec-programas.component.scss',
})
export class MisEcProgramasComponent implements OnInit {
  espacio: MisEcItem | null = null;
  loading = true;
  idEC = '';

  constructor(
    private service: MisEspaciosCurricularesService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.idEC = this.route.snapshot.paramMap.get('idEC') ?? '';
    this.service.getMisEspaciosCurriculares().pipe(
      catchError(() => of([])),
    ).subscribe(ecs => {
      this.espacio = ecs.find(e => e.idEC === this.idEC) ?? null;
      this.loading = false;
    });
  }

  formatCurso(anio: number, division: string): string {
    return `${anio}.º ${division}`;
  }

  volverAlListado(): void {
    this.router.navigate(['/mis-espacios-curriculares']);
  }

  volverAMateria(): void {
    this.router.navigate(['/mis-espacios-curriculares', this.idEC]);
  }

  gestionarArchivo(): void {
    this.router.navigate(['/mis-espacios-curriculares', this.idEC, 'programas', 'archivo']);
  }


  gestionarEstructurado(): void {
    this.router.navigate(['/mis-espacios-curriculares', this.idEC, 'programas', 'estructurado']);
  }
}
