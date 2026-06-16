import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PlanificacionService } from '../../services/planificacion.service';
import {
  ArbolPlanificacionDto,
  UnidadArbolDto,
  TemaArbolDto,
  ClasePlanificacionDto,
} from '../../models/planificacion.model';

@Component({
  selector: 'app-mis-ec-planificacion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mis-ec-planificacion.component.html',
  styleUrl: './mis-ec-planificacion.component.scss',
})
export class MisEcPlanificacionComponent implements OnInit {
  @ViewChild('archivoInput') archivoInput!: ElementRef<HTMLInputElement>;

  idEC = '';
  loading = true;
  error = '';
  arbol: ArbolPlanificacionDto | null = null;

  // Expansión
  openUnidades = new Set<string>();
  openTemas = new Set<string>();

  // ─── Drawer: clase ──────────────────────────────────────────────────────────
  drawerClase = false;
  drawerClaseModo: 'crear' | 'editar' = 'crear';
  drawerClaseUnidad: UnidadArbolDto | null = null;
  drawerClaseTema: TemaArbolDto | null = null;
  editandoClase: ClasePlanificacionDto | null = null;

  claseTitulo = '';
  claseDescripcion = '';
  claseEstado = 'PendienteDar';
  claseCalendario = false;
  claseFechaDesde = '';
  claseFechaHasta = '';
  claseArchivoFile: File | null = null;
  claseArchivoNombre = '';
  claseArchivoTamano = '';
  claseMantieneArchivo = true;
  claseIsDragging = false;
  claseTituloInvalido = false;
  guardandoClase = false;
  errorClase = '';

  // ─── Drawer: item (unidad / tema) ───────────────────────────────────────────
  drawerItem = false;
  drawerItemModo: 'unidad' | 'tema' = 'unidad';
  drawerItemUnidadCtx: UnidadArbolDto | null = null;

  itemTitulo = '';
  itemDescripcion = '';
  itemTituloInvalido = false;
  guardandoItem = false;
  errorItem = '';

  // ─── Modal eliminar ──────────────────────────────────────────────────────────
  modalEliminar = false;
  eliminandoClase = false;

  // ─── Visor PDF ───────────────────────────────────────────────────────────────
  pdfModalUrl: SafeResourceUrl | null = null;
  pdfModalVisible = false;

  // ─── Toast ───────────────────────────────────────────────────────────────────
  toastVisible = false;
  toastMensaje = '';
  toastTipo: 'ok' | 'warn' | 'info' = 'info';
  private toastTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private service: PlanificacionService,
    private route: ActivatedRoute,
    private router: Router,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.idEC = this.route.snapshot.paramMap.get('idEC') ?? '';
    this.cargarArbol();
  }

  private cargarArbol(): void {
    this.loading = true;
    this.error = '';
    this.service.getArbol(this.idEC).subscribe({
      next: arbol => {
        this.arbol = arbol;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudo cargar la planificación. Verificá que el espacio curricular tenga un programa vigente.';
        this.loading = false;
      },
    });
  }

  // ─── Navegación ──────────────────────────────────────────────────────────────

  volver(): void {
    this.router.navigate(['/mis-espacios-curriculares', this.idEC]);
  }

  // ─── Expansión ───────────────────────────────────────────────────────────────

  toggleUnidad(id: string): void {
    this.openUnidades.has(id) ? this.openUnidades.delete(id) : this.openUnidades.add(id);
  }

  toggleTema(id: string): void {
    this.openTemas.has(id) ? this.openTemas.delete(id) : this.openTemas.add(id);
  }

  isUnidadOpen(id: string): boolean { return this.openUnidades.has(id); }
  isTemaOpen(id: string): boolean { return this.openTemas.has(id); }

  // ─── Visor PDF ───────────────────────────────────────────────────────────────

  abrirPdfPrograma(): void {
    if (!this.arbol?.urlPrograma) return;
    this.pdfModalUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.arbol.urlPrograma);
    this.pdfModalVisible = true;
  }

  cerrarPdfModal(): void {
    this.pdfModalVisible = false;
    this.pdfModalUrl = null;
  }

  // ─── Drawer CLASE ────────────────────────────────────────────────────────────

  abrirCrearClase(unidad: UnidadArbolDto, tema: TemaArbolDto): void {
    this.drawerClaseModo = 'crear';
    this.drawerClaseUnidad = unidad;
    this.drawerClaseTema = tema;
    this.editandoClase = null;
    this.resetClaseForm();
    this.drawerClase = true;
    this.openTemas.add(tema.idBloquePrograma);
  }

  abrirEditarClase(unidad: UnidadArbolDto, tema: TemaArbolDto, clase: ClasePlanificacionDto): void {
    this.drawerClaseModo = 'editar';
    this.drawerClaseUnidad = unidad;
    this.drawerClaseTema = tema;
    this.editandoClase = clase;
    this.claseTitulo = clase.titulo;
    this.claseDescripcion = clase.descripcion ?? '';
    this.claseEstado = clase.estado;
    this.claseCalendario = !!clase.fechaDesde;
    this.claseFechaDesde = clase.fechaDesde ?? '';
    this.claseFechaHasta = clase.fechaHasta ?? '';
    this.claseArchivoFile = null;
    this.claseArchivoNombre = clase.url ? this.nombreDeUrl(clase.url) : '';
    this.claseArchivoTamano = '';
    this.claseMantieneArchivo = !!clase.url;
    this.claseTituloInvalido = false;
    this.errorClase = '';
    this.drawerClase = true;
  }

  cerrarDrawerClase(): void {
    this.drawerClase = false;
    this.resetClaseForm();
  }

  private resetClaseForm(): void {
    this.claseTitulo = '';
    this.claseDescripcion = '';
    this.claseEstado = 'PendienteDar';
    this.claseCalendario = false;
    this.claseFechaDesde = '';
    this.claseFechaHasta = '';
    this.claseArchivoFile = null;
    this.claseArchivoNombre = '';
    this.claseArchivoTamano = '';
    this.claseMantieneArchivo = true;
    this.claseIsDragging = false;
    this.claseTituloInvalido = false;
    this.errorClase = '';
  }

  onClaseFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.procesarClaseArchivo(input.files[0]);
  }

  onClaseDragOver(event: DragEvent): void { event.preventDefault(); this.claseIsDragging = true; }
  onClaseDragLeave(): void { this.claseIsDragging = false; }

  onClaseDrop(event: DragEvent): void {
    event.preventDefault();
    this.claseIsDragging = false;
    const file = event.dataTransfer?.files[0];
    if (file?.type === 'application/pdf') this.procesarClaseArchivo(file);
  }

  private procesarClaseArchivo(file: File): void {
    this.claseArchivoFile = file;
    this.claseArchivoNombre = file.name;
    this.claseArchivoTamano = this.formatSize(file.size);
    this.claseMantieneArchivo = true;
  }

  quitarClaseArchivo(): void {
    this.claseArchivoFile = null;
    this.claseArchivoNombre = '';
    this.claseArchivoTamano = '';
    this.claseMantieneArchivo = false;
    this.archivoInput.nativeElement.value = '';
  }

  guardarClase(): void {
    this.claseTituloInvalido = !this.claseTitulo.trim();
    if (this.claseTituloInvalido) return;

    const form = new FormData();
    form.append('titulo', this.claseTitulo.trim());
    if (this.claseDescripcion.trim()) form.append('descripcion', this.claseDescripcion.trim());
    form.append('estado', this.claseEstado);
    if (this.claseCalendario && this.claseFechaDesde) form.append('fechaDesde', this.claseFechaDesde);
    if (this.claseCalendario && this.claseFechaHasta) form.append('fechaHasta', this.claseFechaHasta);
    if (this.drawerClaseTema) form.append('idBloqueTema', this.drawerClaseTema.idBloquePrograma);
    if (this.claseArchivoFile) form.append('archivo', this.claseArchivoFile, this.claseArchivoFile.name);
    form.append('mantieneArchivo', String(this.claseMantieneArchivo));

    this.guardandoClase = true;
    this.errorClase = '';

    if (this.drawerClaseModo === 'crear') {
      this.service.crearClase(this.idEC, form).subscribe({
        next: clase => {
          this.drawerClaseTema!.clases.push(clase);
          this.recalcularAvanceLocal();
          this.cerrarDrawerClase();
          this.guardandoClase = false;
          this.mostrarToast('Clase planificada · ' + this.labelEstado(clase.estado), 'info');
        },
        error: err => {
          this.guardandoClase = false;
          this.errorClase = typeof err.error === 'string' ? err.error : 'Error al guardar la clase.';
        },
      });
    } else {
      this.service.editarClase(this.editandoClase!.idPlanificacion, form).subscribe({
        next: claseActualizada => {
          const idx = this.drawerClaseTema!.clases.findIndex(
            c => c.idPlanificacion === this.editandoClase!.idPlanificacion);
          if (idx !== -1) this.drawerClaseTema!.clases[idx] = claseActualizada;
          this.recalcularAvanceLocal();
          this.cerrarDrawerClase();
          this.guardandoClase = false;
          this.mostrarToast('Clase actualizada', 'info');
        },
        error: err => {
          this.guardandoClase = false;
          this.errorClase = typeof err.error === 'string' ? err.error : 'Error al guardar la clase.';
        },
      });
    }
  }

  // ─── Toggle estado clase (directo sin drawer) ─────────────────────────────

  toggleEstadoClase(tema: TemaArbolDto, clase: ClasePlanificacionDto): void {
    const nuevoEstado = clase.estado === 'Dado' ? 'PendienteDar' : 'Dado';
    const estadoAnterior = clase.estado;
    clase.estado = nuevoEstado; // optimistic update

    this.service.cambiarEstadoClase(clase.idPlanificacion, nuevoEstado).subscribe({
      next: () => {
        this.recalcularAvanceLocal();
        if (nuevoEstado === 'Dado') {
          const temaCompleto = tema.clases.length > 0 && tema.clases.every(c => c.estado === 'Dado');
          if (temaCompleto) this.mostrarToast('Tema completado: ' + tema.titulo, 'ok');
        } else {
          this.mostrarToast('Tema reabierto: ' + tema.titulo, 'warn');
        }
      },
      error: () => {
        clase.estado = estadoAnterior; // revert
        this.mostrarToast('Error al cambiar el estado', 'warn');
      },
    });
  }

  // ─── Eliminar clase ───────────────────────────────────────────────────────

  abrirModalEliminar(): void {
    this.modalEliminar = true;
  }

  cancelarEliminar(): void {
    this.modalEliminar = false;
  }

  ejecutarEliminar(): void {
    if (!this.editandoClase || !this.drawerClaseTema) return;
    this.eliminandoClase = true;

    this.service.eliminarClase(this.editandoClase.idPlanificacion).subscribe({
      next: () => {
        this.drawerClaseTema!.clases = this.drawerClaseTema!.clases.filter(
          c => c.idPlanificacion !== this.editandoClase!.idPlanificacion);
        this.recalcularAvanceLocal();
        this.cerrarDrawerClase();
        this.eliminandoClase = false;
        this.modalEliminar = false;
        this.mostrarToast('Clase eliminada', 'warn');
      },
      error: () => {
        this.eliminandoClase = false;
        this.modalEliminar = false;
        this.mostrarToast('Error al eliminar la clase', 'warn');
      },
    });
  }

  // ─── Drawer ITEM (unidad / tema) ──────────────────────────────────────────

  abrirCrearUnidad(): void {
    this.drawerItemModo = 'unidad';
    this.drawerItemUnidadCtx = null;
    this.itemTitulo = '';
    this.itemDescripcion = '';
    this.itemTituloInvalido = false;
    this.errorItem = '';
    this.drawerItem = true;
  }

  abrirCrearTema(unidad: UnidadArbolDto): void {
    this.drawerItemModo = 'tema';
    this.drawerItemUnidadCtx = unidad;
    this.itemTitulo = '';
    this.itemDescripcion = '';
    this.itemTituloInvalido = false;
    this.errorItem = '';
    this.drawerItem = true;
    this.openUnidades.add(unidad.idBloquePrograma);
  }

  cerrarDrawerItem(): void {
    this.drawerItem = false;
  }

  guardarItem(): void {
    this.itemTituloInvalido = !this.itemTitulo.trim();
    if (this.itemTituloInvalido) return;

    const dto = { titulo: this.itemTitulo.trim(), descripcion: this.itemDescripcion.trim() || undefined };
    this.guardandoItem = true;
    this.errorItem = '';

    if (this.drawerItemModo === 'unidad') {
      this.service.crearUnidad(this.idEC, dto).subscribe({
        next: unidad => {
          this.arbol!.unidades.push(unidad);
          this.openUnidades.add(unidad.idBloquePrograma);
          this.recalcularAvanceLocal();
          this.cerrarDrawerItem();
          this.guardandoItem = false;
          this.mostrarToast('Unidad creada en el programa', 'ok');
        },
        error: err => {
          this.guardandoItem = false;
          this.errorItem = typeof err.error === 'string' ? err.error : 'Error al crear la unidad.';
        },
      });
    } else {
      this.service.crearTema(this.idEC, this.drawerItemUnidadCtx!.idUnidad, dto).subscribe({
        next: tema => {
          this.drawerItemUnidadCtx!.temas.push(tema);
          this.openTemas.add(tema.idBloquePrograma);
          this.recalcularAvanceLocal();
          this.cerrarDrawerItem();
          this.guardandoItem = false;
          this.mostrarToast('Tema cargado en el programa', 'ok');
        },
        error: err => {
          this.guardandoItem = false;
          this.errorItem = typeof err.error === 'string' ? err.error : 'Error al crear el tema.';
        },
      });
    }
  }

  // ─── Avance local (optimistic) ────────────────────────────────────────────

  private recalcularAvanceLocal(): void {
    if (!this.arbol) return;
    const temas = this.arbol.unidades.flatMap(u => u.temas);
    const n = temas.length;
    if (n === 0) { this.arbol.avance = 0; this.arbol.totalTemas = 0; this.arbol.temasCompletos = 0; return; }

    let suma = 0;
    let completos = 0;
    for (const t of temas) {
      const total = t.clases.length;
      const dadas = t.clases.filter(c => c.estado === 'Dado').length;
      const fraccion = total === 0 ? 0 : dadas / total;
      const completo = total > 0 && dadas === total;
      suma += fraccion;
      if (completo) completos++;
      t.estado = completo ? 'Dado' : 'PendienteDar';
    }

    for (const u of this.arbol.unidades) {
      const todosLosTemasCompletos = u.temas.length > 0 && u.temas.every(t => t.estado === 'Dado');
      u.estado = todosLosTemasCompletos ? 'Dado' : 'PendienteDar';
    }

    this.arbol.avance = Math.round(suma / n * 100 * 10) / 10;
    this.arbol.totalTemas = n;
    this.arbol.temasCompletos = completos;
  }

  // ─── Toast ───────────────────────────────────────────────────────────────────

  mostrarToast(mensaje: string, tipo: 'ok' | 'warn' | 'info'): void {
    this.toastMensaje = mensaje;
    this.toastTipo = tipo;
    this.toastVisible = true;
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => { this.toastVisible = false; }, 2700);
  }

  // ─── Helpers UI ──────────────────────────────────────────────────────────────

  get avancePorcentaje(): number { return this.arbol?.avance ?? 0; }

  formatFecha(fecha: string | undefined): string {
    if (!fecha) return '';
    const [y, m, d] = fecha.split('-');
    return `${d}/${m}/${y}`;
  }

  labelEstado(estado: string): string {
    return estado === 'Dado' ? 'Dada' : 'Pendiente de dar';
  }

  claseEsDada(clase: ClasePlanificacionDto): boolean {
    return clase.estado === 'Dado';
  }

  temaEsDado(tema: TemaArbolDto): boolean {
    return tema.estado === 'Dado';
  }

  unidadEsDada(unidad: UnidadArbolDto): boolean {
    return unidad.estado === 'Dado';
  }

  avanceUnidad(unidad: UnidadArbolDto): number {
    const n = unidad.temas.length;
    if (n === 0) return 0;
    let suma = 0;
    for (const t of unidad.temas) {
      const total = t.clases.length;
      const dadas = t.clases.filter(c => c.estado === 'Dado').length;
      suma += total === 0 ? 0 : dadas / total;
    }
    return Math.round(suma / n * 100);
  }

  countClasesUnidad(unidad: UnidadArbolDto): string {
    const av = this.avanceUnidad(unidad);
    const completos = unidad.temas.filter(t => this.temaEsDado(t)).length;
    return `${av}% · ${completos}/${unidad.temas.length} temas`;
  }

  countClasesTema(tema: TemaArbolDto): string {
    const dadas = tema.clases.filter(c => c.estado === 'Dado').length;
    const total = tema.clases.length;
    return total ? `${dadas}/${total} clases dadas` : 'sin clases';
  }

  private formatSize(bytes: number): string {
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return Math.round(bytes / 1024) + ' KB';
  }

  private nombreDeUrl(url: string): string {
    try { return decodeURIComponent(url.split('/').pop()?.split('?')[0] ?? 'archivo.pdf'); }
    catch { return 'archivo.pdf'; }
  }
}
