import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { catchError, forkJoin, of } from 'rxjs';
import { MisEspaciosCurricularesService } from '../../services/mis-espacios-curriculares.service';
import { ProgramaService } from '../../services/programa.service';
import { MisEcItem } from '../../models/mis-ec.model';
import { ProgramaDetalle, ProgramaResumen } from '../../models/programa.model';

@Component({
  selector: 'app-mis-ec-programa-archivo',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './mis-ec-programa-archivo.component.html',
  styleUrl: './mis-ec-programa-archivo.component.scss',
})
export class MisEcProgramaArchivoComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  espacio: MisEcItem | null = null;
  loading = true;
  idEC = '';
  modoVer = false;

  vista: 'form' | 'cargado' = 'form';
  programaCargado: ProgramaDetalle | null = null;
  errorCarga = '';

  archivoNombre = '';
  archivoTamano = '';
  archivoSeleccionado = false;
  archivoFile: File | null = null;
  isDragging = false;

  guardando = false;
  intentoGuardar = false;
  errorGuardar = '';
  realizandoAccion = false;
  errorAccion = '';

  anioLectivo: number | null = null;
  anioLectivoOpciones: number[] = [];
  aniosOcupados: number[] = [];
  horasCatedra: number | null = null;
  titulo = '';
  descripcion = '';

  // Modal de confirmación
  modalVisible = false;
  modalTitulo = '';
  modalMensaje = '';
  modalEsPeligroso = false;
  private modalAccion: (() => void) | null = null;

  // Modal visor PDF
  pdfModalVisible = false;

  constructor(
    private service: MisEspaciosCurricularesService,
    private programaService: ProgramaService,
    private route: ActivatedRoute,
    private router: Router,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.idEC = this.route.snapshot.paramMap.get('idEC') ?? '';
    const idPrograma = this.route.snapshot.paramMap.get('idPrograma');
    const currentYear = new Date().getFullYear();
    this.anioLectivoOpciones = Array.from({ length: currentYear - 1950 + 1 }, (_, i) => currentYear - i);

    if (idPrograma) {
      this.modoVer = true;
      this.vista = 'cargado';
      forkJoin({
        ecs: this.service.getMisEspaciosCurriculares().pipe(catchError(() => of([]))),
        programa: this.programaService.getPrograma(idPrograma).pipe(catchError(() => of(null))),
      }).subscribe(({ ecs, programa }) => {
        this.espacio = ecs.find(e => e.idEC === this.idEC) ?? null;
        if (programa) {
          this.programaCargado = programa;
        } else {
          this.errorCarga = 'No se pudo cargar el programa.';
        }
        this.loading = false;
      });
    } else {
      forkJoin({
        ecs: this.service.getMisEspaciosCurriculares().pipe(catchError(() => of([]))),
        programas: this.programaService.getProgramasPorEC(this.idEC).pipe(catchError(() => of([]))),
      }).subscribe(({ ecs, programas }) => {
        this.espacio = ecs.find(e => e.idEC === this.idEC) ?? null;
        this.aniosOcupados = programas.filter(p => p.estado !== 'NoVigente').map(p => p.anioLectivo);
        const disponibles = this.anioLectivoOpciones.filter(y => !this.aniosOcupados.includes(y));
        const preferred = this.espacio?.anioLectivo ?? currentYear;
        this.anioLectivo = disponibles.includes(preferred) ? preferred : (disponibles[0] ?? null);
        this.loading = false;
      });
    }
  }

  get anioLectivoOpcionesDisponibles(): number[] {
    return this.anioLectivoOpciones.filter(y => !this.aniosOcupados.includes(y));
  }

  get pdfUrl(): SafeResourceUrl | null {
    const url = this.programaCargado?.url;
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  }

  esAnioActual(): boolean {
    return this.programaCargado?.anioLectivo === new Date().getFullYear();
  }

  badgeStateClass(estado: string): string {
    switch (estado) {
      case 'Vigente':    return 'badge-vigente';
      case 'Confirmado': return 'badge-confirmado';
      case 'NoVigente':  return 'badge-novigente';
      case 'Borrador':   return 'badge-borrador';
      default: return '';
    }
  }

  badgeLabel(estado: string): string {
    return estado === 'NoVigente' ? 'No vigente' : estado;
  }

  formatCurso(anio: number, division: string): string {
    return `${anio}.º ${division}`;
  }

  // ─── PDF modal ─────────────────────────────────────────────

  abrirPdf(): void {
    this.pdfModalVisible = true;
  }

  cerrarPdf(): void {
    this.pdfModalVisible = false;
  }

  // ─── Modal de confirmación ──────────────────────────────────

  private confirmar(titulo: string, mensaje: string, esPeligroso: boolean, accion: () => void): void {
    this.modalTitulo = titulo;
    this.modalMensaje = mensaje;
    this.modalEsPeligroso = esPeligroso;
    this.modalAccion = accion;
    this.modalVisible = true;
  }

  confirmarAccion(): void {
    this.modalVisible = false;
    this.modalAccion?.();
    this.modalAccion = null;
  }

  cancelarModal(): void {
    this.modalVisible = false;
    this.modalAccion = null;
  }

  // ─── Form ──────────────────────────────────────────────────

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
    this.archivoFile = file;
    this.archivoNombre = file.name;
    this.archivoTamano = this.formatSize(file.size);
    this.archivoSeleccionado = true;
    this.errorGuardar = '';
  }

  quitarArchivo(): void {
    this.archivoFile = null;
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

  get puedeGuardar(): boolean {
    return !!(this.archivoFile && this.titulo.trim() && this.horasCatedra && this.anioLectivo && this.espacio);
  }

  guardar(): void {
    this.intentoGuardar = true;
    if (!this.puedeGuardar || !this.espacio || !this.archivoFile || !this.anioLectivo || !this.horasCatedra) return;

    this.confirmar(
      'Confirmar carga del programa',
      `¿Querés subir "${this.archivoNombre}" como programa de ${this.espacio.nombreMateria} para el año ${this.anioLectivo}?`,
      false,
      () => this.ejecutarGuardar(),
    );
  }

  private ejecutarGuardar(): void {
    if (!this.espacio || !this.archivoFile || !this.anioLectivo || !this.horasCatedra) return;

    this.guardando = true;
    this.errorGuardar = '';

    this.programaService.cargarDesdeArchivo({
      idCurso: this.espacio.idCurso,
      idEC: this.idEC,
      anioLectivo: this.anioLectivo,
      titulo: this.titulo.trim(),
      descripcion: this.descripcion.trim() || undefined,
      horasCatedra: this.horasCatedra,
      archivo: this.archivoFile,
    }).subscribe({
      next: (programa) => {
        this.guardando = false;
        this.programaCargado = programa;
        this.vista = 'cargado';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (err) => {
        this.guardando = false;
        this.errorGuardar = typeof err.error === 'string' ? err.error : 'Error al guardar el programa. Intentá de nuevo.';
      },
    });
  }

  // ─── Acciones sobre el programa ────────────────────────────

  private formatFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  }

  private recargarPrograma(): void {
    if (!this.programaCargado) return;
    this.programaService.getPrograma(this.programaCargado.idPrograma).subscribe({
      next: p => {
        this.programaCargado = p;
        this.realizandoAccion = false;
        this.errorAccion = '';
      },
      error: () => { this.realizandoAccion = false; },
    });
  }

  private ejecutarCambioEstado(estado: string): void {
    if (!this.programaCargado) return;
    this.realizandoAccion = true;
    this.errorAccion = '';
    this.programaService.cambiarEstado(this.programaCargado.idPrograma, estado).subscribe({
      next: () => this.recargarPrograma(),
      error: (err) => {
        this.realizandoAccion = false;
        this.errorAccion = typeof err.error === 'string' ? err.error : 'Error al cambiar el estado.';
      },
    });
  }

  ponerVigente(): void {
    this.programaService.getProgramasPorEC(this.idEC).subscribe({
      next: (programas: ProgramaResumen[]) => {
        const vigente = programas.find(p => p.estado === 'Vigente');
        const mensaje = vigente
          ? `El programa "${vigente.titulo}" del ${vigente.anioLectivo}, creado por ${vigente.nombreDocente} el ${this.formatFecha(vigente.fechaCreacion)}, será reemplazado por el programa seleccionado.`
          : '¿Confirmás que querés establecer este programa como vigente?';
        this.confirmar('Establecer como Vigente', mensaje, false, () => this.ejecutarCambioEstado('Vigente'));
      },
      error: () => this.confirmar(
        'Establecer como Vigente',
        '¿Confirmás que querés establecer este programa como vigente?',
        false,
        () => this.ejecutarCambioEstado('Vigente'),
      ),
    });
  }

  establecerComoConfirmado(): void {
    this.confirmar(
      'Establecer como Confirmado',
      'El programa dejará de estar vigente y volverá al estado Confirmado. ¿Confirmás la acción?',
      false,
      () => this.ejecutarCambioEstado('Confirmado'),
    );
  }

  establecerComoNoVigente(): void {
    this.confirmar(
      'Establecer como No Vigente',
      'El programa pasará a "No vigente" y quedará almacenado como información histórica. Esta acción no se puede deshacer.',
      true,
      () => this.ejecutarCambioEstado('NoVigente'),
    );
  }

  reestablecerComoConfirmado(): void {
    this.confirmar(
      'Reestablecer como Confirmado',
      'El programa volverá al estado Confirmado. Desde ahí podrá establecerse como vigente si corresponde al año corriente. ¿Confirmás la acción?',
      false,
      () => this.ejecutarCambioEstado('Confirmado'),
    );
  }

  eliminar(): void {
    this.confirmar(
      'Eliminar programa',
      '¿Seguro que querés eliminar este programa? Esta acción no se puede deshacer.',
      true,
      () => this.ejecutarEliminar(),
    );
  }

  private ejecutarEliminar(): void {
    if (!this.programaCargado) return;
    this.realizandoAccion = true;
    this.errorAccion = '';
    this.programaService.eliminar(this.programaCargado.idPrograma).subscribe({
      next: () => this.volverAProgramas(),
      error: (err) => {
        this.realizandoAccion = false;
        this.errorAccion = typeof err.error === 'string' ? err.error : 'Error al eliminar el programa.';
      },
    });
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
