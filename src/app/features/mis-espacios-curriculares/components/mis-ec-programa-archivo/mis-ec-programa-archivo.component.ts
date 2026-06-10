import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { MisEspaciosCurricularesService } from '../../services/mis-espacios-curriculares.service';
import { MisEcItem } from '../../models/mis-ec.model';

@Component({
  selector: 'app-mis-ec-programa-archivo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mis-ec-programa-archivo.component.html',
  styleUrl: './mis-ec-programa-archivo.component.scss',
})
export class MisEcProgramaArchivoComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  espacio: MisEcItem | null = null;
  loading = true;
  idEC = '';

  vista: 'form' | 'cargado' = 'form';

  archivoNombre = '';
  archivoTamano = '';
  archivoSeleccionado = false;
  isDragging = false;

  anioLectivo: number | null = null;
  anioLectivoOpciones: number[] = [];
  horasCatedra: number | null = null;
  titulo = '';
  descripcion = '';

  constructor(
    private service: MisEspaciosCurricularesService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.idEC = this.route.snapshot.paramMap.get('idEC') ?? '';
    const currentYear = new Date().getFullYear();
    this.anioLectivoOpciones = [currentYear + 1, currentYear, currentYear - 1, currentYear - 2];

    this.service.getMisEspaciosCurriculares().pipe(
      catchError(() => of([])),
    ).subscribe(ecs => {
      this.espacio = ecs.find(e => e.idEC === this.idEC) ?? null;
      this.anioLectivo = this.espacio?.anioLectivo ?? currentYear;
      this.loading = false;
    });
  }

  formatCurso(anio: number, division: string): string {
    return `${anio}.º ${division}`;
  }

  abrirSelector(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.procesarArchivo(input.files[0]);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(): void {
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    const file = event.dataTransfer?.files[0];
    if (file?.type === 'application/pdf') this.procesarArchivo(file);
  }

  private procesarArchivo(file: File): void {
    this.archivoNombre = file.name;
    this.archivoTamano = this.formatSize(file.size);
    this.archivoSeleccionado = true;
  }

  quitarArchivo(): void {
    this.archivoSeleccionado = false;
    this.archivoNombre = '';
    this.archivoTamano = '';
    this.fileInput.nativeElement.value = '';
  }

  private formatSize(bytes: number): string {
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return Math.round(bytes / 1024) + ' KB';
  }

  cancelar(): void {
    this.router.navigate(['/mis-espacios-curriculares', this.idEC, 'programas']);
  }

  guardar(): void {
    this.vista = 'cargado';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  volver(): void {
    this.vista = 'form';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  volverAlListado(): void {
    this.router.navigate(['/mis-espacios-curriculares']);
  }

  volverAMateria(): void {
    this.router.navigate(['/mis-espacios-curriculares', this.idEC]);
  }

  volverAProgramas(): void {
    this.router.navigate(['/mis-espacios-curriculares', this.idEC, 'programas']);
  }
}
