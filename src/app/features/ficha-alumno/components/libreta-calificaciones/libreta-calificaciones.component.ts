import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { LibretaEspacio } from '../../models/libreta-calificaciones.model';

// Placeholder hasta conectar el endpoint de la libreta
const ESPACIOS_PLACEHOLDER: LibretaEspacio[] = [
  { idEC: '', nombreMateria: 'Lengua y Literatura',          instancias: [] },
  { idEC: '', nombreMateria: 'Matemática',                   instancias: [] },
  { idEC: '', nombreMateria: 'Historia',                     instancias: [] },
  { idEC: '', nombreMateria: 'Geografía',                    instancias: [] },
  { idEC: '', nombreMateria: 'Biología',                     instancias: [] },
  { idEC: '', nombreMateria: 'Inglés',                       instancias: [] },
  { idEC: '', nombreMateria: 'Educación Física',             instancias: [] },
  { idEC: '', nombreMateria: 'Educación Tecnológica',        instancias: [] },
  { idEC: '', nombreMateria: 'Educación Artística',          instancias: [] },
  { idEC: '', nombreMateria: 'Ciudadanía y Participación',   instancias: [] },
];

interface FilaEval {
  n: number | null;
  r1: number | null;
  r2: number | null;
  ef: number | null;
  existe: boolean;
}

export interface FilaLibreta {
  espacio: LibretaEspacio;
  evals: FilaEval[];
  notaFinal: number | null;
  estado: 'aprob' | 'desap' | 'tema' | null;
}

@Component({
  selector: 'app-libreta-calificaciones',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './libreta-calificaciones.component.html',
  styleUrl: './libreta-calificaciones.component.css',
})
export class LibretaCalificacionesComponent implements OnChanges {
  @Input() apellido = '';
  @Input() nombre = '';
  @Input() codigoCurso = '';
  @Input() anioLectivo = 2026;
  /** Espacios curriculares con sus calificaciones. Vacío = muestra estructura sin notas. */
  @Input() espacios: LibretaEspacio[] = [];
  @Output() volver = new EventEmitter<void>();

  tabActual: 0 | 1 = 0;
  filas: FilaLibreta[] = [];

  get tabIndices(): number[] {
    const base = this.tabActual * 4;
    return [base, base + 1, base + 2, base + 3];
  }

  get contadores(): { aprob: number; desap: number; tema: number } {
    let aprob = 0, desap = 0, tema = 0;
    for (const f of this.filas) {
      if (f.estado === 'aprob') aprob++;
      else if (f.estado === 'desap') desap++;
      else if (f.estado === 'tema') tema++;
    }
    return { aprob, desap, tema };
  }

  ngOnChanges(): void {
    const fuente = this.espacios.length > 0 ? this.espacios : ESPACIOS_PLACEHOLDER;
    this.filas = fuente.map(esp => this.computeFila(esp));
  }

  private computeFila(esp: LibretaEspacio): FilaLibreta {
    const evals: FilaEval[] = Array.from({ length: 8 }, (_, i) => {
      const inst = esp.instancias.find(x => x.nro === i + 1);
      if (!inst) return { n: null, r1: null, r2: null, ef: null, existe: false };
      const candidates = [inst.n, inst.r1, inst.r2].filter((v): v is number => v !== null);
      const ef = candidates.length > 0 ? Math.max(...candidates) : null;
      return { n: inst.n, r1: inst.r1, r2: inst.r2, ef, existe: true };
    });

    const efsLoaded = evals.map(e => e.ef).filter((v): v is number => v !== null);
    const notaFinal = efsLoaded.length > 0
      ? efsLoaded.reduce((a, b) => a + b, 0) / efsLoaded.length
      : null;

    let estado: FilaLibreta['estado'] = null;
    if (notaFinal !== null) {
      const algunaFallo = efsLoaded.some(v => v < 7);
      estado = notaFinal >= 7 ? (algunaFallo ? 'tema' : 'aprob') : 'desap';
    }

    return { espacio: esp, evals, notaFinal, estado };
  }

  notaClase(valor: number | null, ef: number | null): string {
    if (valor === null) return 'nota-dash';
    const clases = ['nota'];
    clases.push(valor < 7 ? 'nota-baja' : 'nota-alta');
    if (valor === ef) clases.push('nota-mejor');
    return clases.join(' ');
  }

  notaTexto(valor: number | null): string {
    return valor !== null ? String(valor) : '–';
  }

  nfTexto(nf: number | null): string {
    return nf !== null ? nf.toFixed(2) : '–';
  }

  nfClase(nf: number | null): string {
    if (nf === null) return 'nf-dash';
    return nf >= 7 ? 'nf nf-alta' : 'nf nf-baja';
  }

  isEvFail(ef: number | null): boolean {
    return ef !== null && ef < 7;
  }
}
