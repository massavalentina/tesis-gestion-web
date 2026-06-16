import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { MisEspaciosCurricularesService } from '../../services/mis-espacios-curriculares.service';
import { ProgramaService } from '../../services/programa.service';
import { MisEcItem } from '../../models/mis-ec.model';
import { ProgramaResumen } from '../../models/programa.model';

@Component({
  selector: 'app-mis-ec-programas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mis-ec-programas.component.html',
  styleUrl: './mis-ec-programas.component.scss',
})
export class MisEcProgramasComponent implements OnInit {
  espacio: MisEcItem | null = null;
  programas: ProgramaResumen[] = [];
  anioFiltro: number | null = null;
  loading = true;
  error = false;
  idEC = '';

  constructor(
    private ecService: MisEspaciosCurricularesService,
    private programaService: ProgramaService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.idEC = this.route.snapshot.paramMap.get('idEC') ?? '';

    forkJoin({
      ecs: this.ecService.getMisEspaciosCurriculares().pipe(catchError(() => of([]))),
      programas: this.programaService.getProgramasPorEC(this.idEC).pipe(catchError(() => of([]))),
    }).subscribe(({ ecs, programas }) => {
      this.espacio = ecs.find(e => e.idEC === this.idEC) ?? null;
      this.programas = programas;
      const currentYear = new Date().getFullYear();
      this.anioFiltro = programas.some(p => p.anioLectivo === currentYear) ? currentYear : null;
      this.loading = false;
    });
  }

  get aniosDisponibles(): number[] {
    return [...new Set(this.programas.map(p => p.anioLectivo))].sort((a, b) => b - a);
  }

  get programasFiltrados(): ProgramaResumen[] {
    if (this.anioFiltro === null) return this.programas;
    return this.programas.filter(p => p.anioLectivo === this.anioFiltro);
  }

  get programaVigente(): ProgramaResumen | undefined {
    return this.programasFiltrados.find(p => p.estado === 'Vigente');
  }

  get programasAnteriores(): ProgramaResumen[] {
    return this.programasFiltrados.filter(p => p.estado !== 'Vigente');
  }

  formatCurso(anio: number, division: string): string {
    return `${anio}.º ${division}`;
  }

  badgeClass(estado: string): string {
    switch (estado) {
      case 'Vigente':    return 'badge-vigente';
      case 'Borrador':   return 'badge-borrador';
      case 'Confirmado': return 'badge-confirmado';
      case 'NoVigente':  return 'badge-novigente';
      default: return '';
    }
  }

  badgeLabel(estado: string): string {
    return estado === 'NoVigente' ? 'No vigente' : estado;
  }

  formatFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  }

  volverAlListado(): void {
    this.router.navigate(['/mis-espacios-curriculares']);
  }

  volverAMateria(): void {
    this.router.navigate(['/mis-espacios-curriculares', this.idEC]);
  }

  crearEstructurado(): void {
    this.router.navigate(['/mis-espacios-curriculares', this.idEC, 'programas', 'nuevo']);
  }

  cargarDesdeArchivo(): void {
    this.router.navigate(['/mis-espacios-curriculares', this.idEC, 'programas', 'archivo']);
  }


  gestionarEstructurado(): void {
    this.router.navigate(['/mis-espacios-curriculares', this.idEC, 'programas', 'estructurado']);
  }

  verDetalle(p: ProgramaResumen): void {
    if (p.origen === 'Archivo') {
      this.router.navigate(['/mis-espacios-curriculares', this.idEC, 'programas', 'archivo', p.idPrograma]);
    } else {
      this.router.navigate(['/mis-espacios-curriculares', this.idEC, 'programas', p.idPrograma]);
    }
  }
}
