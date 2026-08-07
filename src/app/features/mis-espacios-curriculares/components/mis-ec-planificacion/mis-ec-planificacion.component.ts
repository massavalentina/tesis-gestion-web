import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { catchError, forkJoin, of } from 'rxjs';
import { PlanificacionService } from '../../services/planificacion.service';
import { MisEspaciosCurricularesService } from '../../services/mis-espacios-curriculares.service';
import { MisEcItem } from '../../models/mis-ec.model';
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
  idEC = '';
  loading = true;
  error = '';
  arbol: ArbolPlanificacionDto | null = null;
  espacio: MisEcItem | null = null;

  get cursoLabel(): string {
    return this.espacio ? `${this.espacio.anioNumero}°${this.espacio.division}` : '';
  }

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
  claseFechaDesde = '';
  claseFechaHasta = '';
  claseVisibleEnCalendario = false;
  claseTituloInvalido = false;
  claseFechaDictadaInvalida = false;
  claseFechaDesdeInvalida = false;
  claseFechaHastaAnioInvalido = false;
  guardandoClase = false;
  errorClase = '';

  readonly fechaMinAnio = `${new Date().getFullYear()}-01-01`;
  readonly fechaMaxAnio = `${new Date().getFullYear()}-12-31`;

  // ─── Drawer: item (unidad / tema) — solo para programas de origen Archivo ──
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

  // ─── Modal confirmar clase ────────────────────────────────────────────────────
  modalConfirmClase = false;

  // ─── Modal: marcar clase como dictada desde el toggle ────────────────────────
  modalFechaDictada = false;
  modalFechaDictadaClase: ClasePlanificacionDto | null = null;
  modalFechaDictadaTema: TemaArbolDto | null = null;
  fechaDictadaInput = '';
  fechaDictadaInputInvalida = false;
  fechaDictadaInputAnioInvalido = false;
  marcandoDictada = false;
  modalConfirmDictada = false;

  // ─── Visor PDF (del programa) ─────────────────────────────────────────────
  pdfModalUrl: SafeResourceUrl | null = null;
  pdfModalVisible = false;

  // ─── Toast ───────────────────────────────────────────────────────────────────
  toastVisible = false;
  toastMensaje = '';
  toastTipo: 'ok' | 'warn' | 'info' = 'info';
  private toastTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private service: PlanificacionService,
    private ecService: MisEspaciosCurricularesService,
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
    forkJoin({
      arbol: this.service.getArbol(this.idEC),
      espacio: this.ecService.getEspacioCurricularPorId(this.idEC).pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ arbol, espacio }) => {
        this.arbol = arbol;
        this.espacio = espacio;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudo cargar la planificación. Verificá tu conexión e intentá de nuevo.';
        this.loading = false;
      },
    });
  }

  // ─── Navegación ──────────────────────────────────────────────────────────────

  volver(): void {
    this.router.navigate(['/mis-espacios-curriculares', this.idEC]);
  }

  navegarAPrograma(): void {
    const id = this.arbol?.idPrograma;
    if (id && this.arbol?.origen === 'Archivo') {
      this.router.navigate(['/mis-espacios-curriculares', this.idEC, 'programas', 'archivo', id]);
    } else if (id) {
      this.router.navigate(['/mis-espacios-curriculares', this.idEC, 'programas', id]);
    } else {
      this.router.navigate(['/mis-espacios-curriculares', this.idEC, 'programas']);
    }
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

  // ─── Visor PDF del programa ──────────────────────────────────────────────────

  abrirPdfPrograma(): void {
    if (!this.arbol?.urlPrograma) return;
    this.pdfModalUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.arbol.urlPrograma);
    this.pdfModalVisible = true;
  }

  cerrarPdfModal(): void {
    this.pdfModalVisible = false;
    this.pdfModalUrl = null;
  }

  // ─── Toggle estado TEMA (manual — decide el avance) ──────────────────────────

  toggleEstadoTema(tema: TemaArbolDto): void {
    const nuevoEstado = tema.estado === 'Dado' ? 'PendienteDar' : 'Dado';
    const estadoAnterior = tema.estado;
    tema.estado = nuevoEstado;
    this.recalcularAvanceLocal();

    this.service.patchEstadoBloque(tema.idBloquePrograma, nuevoEstado).subscribe({
      next: () => {
        const msg = nuevoEstado === 'Dado'
          ? 'Tema dictado: ' + tema.titulo
          : 'Tema marcado pendiente: ' + tema.titulo;
        this.mostrarToast(msg, nuevoEstado === 'Dado' ? 'ok' : 'warn');
      },
      error: () => {
        tema.estado = estadoAnterior;
        this.recalcularAvanceLocal();
        this.mostrarToast('Error al cambiar el estado del tema', 'warn');
      },
    });
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
    this.claseFechaDesde = clase.fechaEstimada ?? '';
    this.claseFechaHasta = clase.fechaDictada ?? '';
    this.claseVisibleEnCalendario = clase.visibleEnCalendario;
    this.claseTituloInvalido = false;
    this.claseFechaDictadaInvalida = false;
    this.claseFechaDesdeInvalida = false;
    this.claseFechaHastaAnioInvalido = false;
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
    this.claseFechaDesde = '';
    this.claseFechaHasta = '';
    this.claseVisibleEnCalendario = false;
    this.claseTituloInvalido = false;
    this.claseFechaDictadaInvalida = false;
    this.claseFechaDesdeInvalida = false;
    this.claseFechaHastaAnioInvalido = false;
    this.errorClase = '';
  }

  guardarClase(): void {
    this.claseTituloInvalido = !this.claseTitulo.trim();
    this.claseFechaDictadaInvalida = this.claseEstado === 'Dado' && !this.claseFechaHasta;
    this.claseFechaDesdeInvalida = !!this.claseFechaDesde && !this.esFechaAnioActual(this.claseFechaDesde);
    this.claseFechaHastaAnioInvalido = !!this.claseFechaHasta && !this.esFechaAnioActual(this.claseFechaHasta);
    if (this.claseTituloInvalido || this.claseFechaDictadaInvalida ||
        this.claseFechaDesdeInvalida || this.claseFechaHastaAnioInvalido) return;

    this.modalConfirmClase = true;
  }

  confirmarGuardarClase(): void {
    this.modalConfirmClase = false;
    this.ejecutarGuardarClase();
  }

  private ejecutarGuardarClase(): void {
    const form = new FormData();
    form.append('titulo', this.claseTitulo.trim());
    if (this.claseDescripcion.trim()) form.append('descripcion', this.claseDescripcion.trim());
    form.append('estado', this.claseEstado);
    if (this.claseFechaDesde) form.append('fechaDesde', this.claseFechaDesde);
    if (this.claseEstado === 'Dado' && this.claseFechaHasta) form.append('fechaHasta', this.claseFechaHasta);
    if (this.drawerClaseTema) form.append('idBloqueTema', this.drawerClaseTema.idBloquePrograma);
    form.append('visibleEnCalendario', this.claseVisibleEnCalendario.toString());
    form.append('mantieneArchivo', 'true');

    this.guardandoClase = true;
    this.errorClase = '';

    if (this.drawerClaseModo === 'crear') {
      this.service.crearClase(this.idEC, form).subscribe({
        next: clase => {
          this.drawerClaseTema!.clases.push(clase);
          this.cerrarDrawerClase();
          this.guardandoClase = false;
          this.mostrarToast('Clase planificada', 'info');
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

  // ─── Toggle estado clase (Pendiente ↔ Dictada) ───────────────────────────────

  toggleEstadoClase(tema: TemaArbolDto, clase: ClasePlanificacionDto): void {
    if (clase.estado !== 'Dado') {
      // Marcando como dictada → pedir fecha primero
      this.modalFechaDictadaClase = clase;
      this.modalFechaDictadaTema = tema;
      this.fechaDictadaInput = clase.fechaEstimada ?? '';
      this.fechaDictadaInputInvalida = false;
      this.fechaDictadaInputAnioInvalido = false;
      this.modalFechaDictada = true;
    } else {
      // Desmarcando → PendienteDar directo
      const estadoAnterior = clase.estado;
      clase.estado = 'PendienteDar';
      this.service.cambiarEstadoClase(clase.idPlanificacion, 'PendienteDar').subscribe({
        next: () => this.mostrarToast('Clase marcada como pendiente', 'info'),
        error: () => {
          clase.estado = estadoAnterior;
          this.mostrarToast('Error al cambiar el estado', 'warn');
        },
      });
    }
  }

  cancelarFechaDictada(): void {
    this.modalFechaDictada = false;
    this.modalFechaDictadaClase = null;
    this.modalFechaDictadaTema = null;
    this.fechaDictadaInput = '';
  }

  avanzarConfirmDictada(): void {
    this.fechaDictadaInputInvalida = !this.fechaDictadaInput;
    this.fechaDictadaInputAnioInvalido = !!this.fechaDictadaInput && !this.esFechaAnioActual(this.fechaDictadaInput);
    if (this.fechaDictadaInputInvalida || this.fechaDictadaInputAnioInvalido) return;
    this.modalFechaDictada = false;
    this.modalConfirmDictada = true;
  }

  cancelarConfirmDictada(): void {
    this.modalConfirmDictada = false;
    this.modalFechaDictada = true;
  }

  ejecutarMarcarDictada(): void {
    const clase = this.modalFechaDictadaClase;
    const tema = this.modalFechaDictadaTema;
    if (!clase || !tema) return;

    this.modalConfirmDictada = false;
    this.marcandoDictada = true;

    const form = new FormData();
    form.append('titulo', clase.titulo);
    if (clase.descripcion) form.append('descripcion', clase.descripcion);
    form.append('estado', 'Dado');
    if (clase.fechaEstimada) form.append('fechaDesde', clase.fechaEstimada);
    form.append('fechaHasta', this.fechaDictadaInput);
    form.append('visibleEnCalendario', clase.visibleEnCalendario.toString());
    form.append('mantieneArchivo', 'true');

    this.service.editarClase(clase.idPlanificacion, form).subscribe({
      next: actualizada => {
        const idx = tema.clases.findIndex(c => c.idPlanificacion === clase.idPlanificacion);
        if (idx !== -1) tema.clases[idx] = actualizada;
        this.marcandoDictada = false;
        this.modalFechaDictadaClase = null;
        this.modalFechaDictadaTema = null;
        this.mostrarToast('Clase marcada como dictada', 'ok');
      },
      error: () => {
        this.marcandoDictada = false;
        this.mostrarToast('Error al guardar la clase', 'warn');
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

  // ─── Drawer ITEM (unidad / tema) — programas Archivo ─────────────────────

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

  // ─── Avance local — basado en temas dados (manual), NO en clases ──────────

  private recalcularAvanceLocal(): void {
    if (!this.arbol) return;
    const temas = this.arbol.unidades.flatMap(u => u.temas);
    const n = temas.length;
    if (n === 0) { this.arbol.avance = 0; this.arbol.totalTemas = 0; this.arbol.temasCompletos = 0; return; }

    const completos = temas.filter(t => t.estado === 'Dado').length;
    this.arbol.avance = Math.round(completos / n * 100 * 10) / 10;
    this.arbol.totalTemas = n;
    this.arbol.temasCompletos = completos;

    for (const u of this.arbol.unidades) {
      u.estado = u.temas.length > 0 && u.temas.every(t => t.estado === 'Dado') ? 'Dado' : 'PendienteDar';
    }
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

  private esFechaAnioActual(fecha: string): boolean {
    return parseInt(fecha.split('-')[0], 10) === new Date().getFullYear();
  }

  claseEsDada(clase: ClasePlanificacionDto): boolean { return clase.estado === 'Dado'; }
  temaEsDado(tema: TemaArbolDto): boolean { return tema.estado === 'Dado'; }
  unidadEsDada(unidad: UnidadArbolDto): boolean { return unidad.estado === 'Dado'; }

  avanceUnidad(unidad: UnidadArbolDto): number {
    const n = unidad.temas.length;
    if (n === 0) return 0;
    const completos = unidad.temas.filter(t => t.estado === 'Dado').length;
    return Math.round(completos / n * 100);
  }

  countClasesUnidad(unidad: UnidadArbolDto): string {
    const av = this.avanceUnidad(unidad);
    const completos = unidad.temas.filter(t => this.temaEsDado(t)).length;
    return `${av}% · ${completos}/${unidad.temas.length} temas dictados`;
  }

  countClasesTema(tema: TemaArbolDto): string {
    const dadas = tema.clases.filter(c => c.estado === 'Dado').length;
    const total = tema.clases.length;
    return total ? `${dadas}/${total} clases dictadas` : 'Sin clases planificadas';
  }
}
