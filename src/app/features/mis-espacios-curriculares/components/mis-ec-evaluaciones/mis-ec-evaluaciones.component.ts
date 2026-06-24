import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { lastValueFrom } from 'rxjs';
import { ConfirmarAccionDialogComponent } from '../confirmar-accion-dialog/confirmar-accion-dialog.component';
import {
  ConfirmarEstadoIEDialogComponent,
  ConfirmarEstadoIEResult,
} from '../confirmar-estado-ie-dialog/confirmar-estado-ie-dialog.component';
import { EvaluacionesService } from '../../services/evaluaciones.service';
import { TemaArbolDto } from '../../models/planificacion.model';
import {
  ArchivoIEGestion,
  GestionEvaluaciones,
  InstanciaEvaluativaSlot,
  TipoCalificacion,
  TipoIE,
} from '../../models/evaluaciones.model';

@Component({
  selector: 'app-mis-ec-evaluaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule],
  templateUrl: './mis-ec-evaluaciones.component.html',
  styleUrl: './mis-ec-evaluaciones.component.scss',
})
export class MisEcEvaluacionesComponent implements OnInit {
  idEC = '';
  loading = true;
  error = '';
  gestion: GestionEvaluaciones | null = null;

  readonly tiposCalificacion: TipoCalificacion[] = ['N', 'R1', 'R2'];
  readonly tiposIE: TipoIE[] = ['EvaluacionEscrita', 'EvaluacionOral', 'Entrega', 'TPI'];

  bannerVisible = false;
  bannerTipo: 'info' | 'ok' | 'warn' = 'info';
  bannerTitulo = '';
  bannerMensaje = '';

  drawerVisible = false;
  drawerModo: 'crear' | 'detalle' | 'editar' = 'crear';
  slotActual: InstanciaEvaluativaSlot | null = null;
  tipoActual: TipoCalificacion = 'N';
  archivoActual: ArchivoIEGestion | null = null;

  titulo = '';
  tipoIE: TipoIE = 'EvaluacionEscrita';
  fechaEjecucionInput = '';
  fechaEjecucionOriginal = '';
  estadoIEActual: 'Pendiente' | 'Evaluada' = 'Pendiente';
  estadoIEOriginal: 'Pendiente' | 'Evaluada' = 'Pendiente';
  archivoSeleccionado: File | null = null;
  archivoNombre = '';
  selectedBloques = new Set<string>();
  expandedSlots = new Set<number>();
  expandedUnidades = new Set<string>();
  avisoSlotVisibleNro: number | null = null;
  avisoSlotPersistenteNro: number | null = null;

  guardando = false;
  eliminando = false;
  formError = '';

  constructor(
    private readonly service: EvaluacionesService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.idEC = this.route.snapshot.paramMap.get('idEC') ?? '';
    this.cargarGestion();
  }

  volver(): void {
    this.router.navigate(['/mis-espacios-curriculares', this.idEC]);
  }

  irACalificaciones(): void {
    this.router.navigate(['/mis-espacios-curriculares', this.idEC, 'calificaciones']);
  }

  navegarProgramas(): void {
    this.router.navigate(['/mis-espacios-curriculares', this.idEC, 'programas']);
  }

  cargarGestion(): void {
    this.loading = true;
    this.error = '';

    this.service.getGestion(this.idEC).subscribe({
      next: gestion => {
        this.gestion = gestion;
        this.expandedSlots = new Set<number>();
        this.expandedUnidades = new Set<string>();
        this.loading = false;
      },
      error: err => {
        this.error = this.extractErrorMessage(err, 'No se pudo cargar la gestión de instancias evaluativas.');
        this.loading = false;
      },
    });
  }

  abrirCrear(slot: InstanciaEvaluativaSlot, tipo: TipoCalificacion): void {
    if (!this.puedeCargar(slot, tipo)) {
      this.mostrarBanner('warn', `No se puede cargar ${tipo}`, this.motivoCarga(slot, tipo));
      return;
    }

    this.prepararDrawer('crear', slot, tipo, null);
    this.fechaEjecucionInput = this.formatoFechaCorta(this.hoy());
    this.fechaEjecucionOriginal = '';
    this.estadoIEActual = 'Pendiente';
    this.estadoIEOriginal = 'Pendiente';
  }

  abrirDetalle(slot: InstanciaEvaluativaSlot, tipo: TipoCalificacion, archivo: ArchivoIEGestion): void {
    this.prepararDrawer('detalle', slot, tipo, archivo);
  }

  abrirEditar(slot: InstanciaEvaluativaSlot, tipo: TipoCalificacion, archivo: ArchivoIEGestion): void {
    if (!archivo.puedeEditar) {
      this.mostrarBanner('warn', `No se puede editar ${tipo}`, this.motivoBloqueoAccion(archivo, 'editar'));
      return;
    }

    this.prepararDrawer('editar', slot, tipo, archivo);
  }

  cerrarDrawer(): void {
    this.drawerVisible = false;
    this.drawerModo = 'crear';
    this.slotActual = null;
    this.archivoActual = null;
    this.formError = '';
    this.archivoSeleccionado = null;
    this.archivoNombre = '';
    this.fechaEjecucionInput = '';
    this.fechaEjecucionOriginal = '';
    this.estadoIEActual = 'Pendiente';
    this.estadoIEOriginal = 'Pendiente';
    this.selectedBloques = new Set<string>();
    this.expandedUnidades = new Set<string>();
    this.avisoSlotVisibleNro = null;
    this.avisoSlotPersistenteNro = null;
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.archivoSeleccionado = file;
    this.archivoNombre = file?.name ?? '';
  }

  toggleUnidad(idBloqueUnidad: string): void {
    const unidad = this.gestion?.unidades.find(u => u.idBloquePrograma === idBloqueUnidad);
    if (!unidad) {
      return;
    }

    const temaIds = unidad.temas.map(t => t.idBloquePrograma);
    const todosSeleccionados = temaIds.length > 0 && temaIds.every(id => this.selectedBloques.has(id));

    if (todosSeleccionados) {
      temaIds.forEach(id => this.selectedBloques.delete(id));
      return;
    }

    temaIds.forEach(id => this.selectedBloques.add(id));
  }

  toggleTema(idBloqueTema: string): void {
    if (this.selectedBloques.has(idBloqueTema)) {
      this.selectedBloques.delete(idBloqueTema);
    } else {
      this.selectedBloques.add(idBloqueTema);
    }
  }

  unidadSeleccionada(idBloqueUnidad: string): boolean {
    const unidad = this.gestion?.unidades.find(u => u.idBloquePrograma === idBloqueUnidad);
    if (!unidad || unidad.temas.length === 0) {
      return false;
    }
    return unidad.temas.every(t => this.selectedBloques.has(t.idBloquePrograma));
  }

  unidadParcial(idBloqueUnidad: string): boolean {
    const unidad = this.gestion?.unidades.find(u => u.idBloquePrograma === idBloqueUnidad);
    if (!unidad || unidad.temas.length === 0) {
      return false;
    }

    const seleccionados = unidad.temas.filter(t => this.selectedBloques.has(t.idBloquePrograma)).length;
    return seleccionados > 0 && seleccionados < unidad.temas.length;
  }

  temaSeleccionado(idBloqueTema: string): boolean {
    return this.selectedBloques.has(idBloqueTema);
  }

  toggleUnidadExpandida(idBloqueUnidad: string): void {
    if (this.expandedUnidades.has(idBloqueUnidad)) {
      this.expandedUnidades.delete(idBloqueUnidad);
      return;
    }

    this.expandedUnidades.add(idBloqueUnidad);
  }

  unidadExpandida(idBloqueUnidad: string): boolean {
    return this.expandedUnidades.has(idBloqueUnidad);
  }

  toggleSlot(nro: number): void {
    if (this.gestion?.sinPrograma) {
      return;
    }

    if (this.expandedSlots.has(nro)) {
      this.expandedSlots.delete(nro);
      return;
    }

    this.expandedSlots.add(nro);
  }

  slotExpandido(nro: number): boolean {
    return this.expandedSlots.has(nro);
  }

  avisoSlotActivo(nro: number): boolean {
    return this.avisoSlotVisibleNro === nro || this.avisoSlotPersistenteNro === nro;
  }

  mostrarAvisoSlot(nro: number): void {
    this.avisoSlotVisibleNro = nro;
  }

  ocultarAvisoSlot(nro: number): void {
    if (this.avisoSlotVisibleNro === nro) {
      this.avisoSlotVisibleNro = null;
    }
  }

  alternarAvisoSlot(nro: number, event: MouseEvent): void {
    event.stopPropagation();
    this.avisoSlotPersistenteNro = this.avisoSlotPersistenteNro === nro ? null : nro;
    this.avisoSlotVisibleNro = this.avisoSlotPersistenteNro;
  }

  slotBloqueado(): boolean {
    return !!this.gestion?.sinPrograma;
  }

  estadoSlot(slot: InstanciaEvaluativaSlot): string {
    if (this.gestion?.sinPrograma) {
      return 'Bloqueado';
    }

    return slot.estado;
  }

  avisoEstadoSlot(slot: InstanciaEvaluativaSlot): string {
    if (this.slotBloqueado()) {
      return '';
    }

    const tieneNotas = this.slotTieneNotas(slot);
    if (slot.estado !== 'Evaluada' && tieneNotas) {
      return 'Tiene notas cargadas pero la IE sigue pendiente.';
    }

    if (slot.estado === 'Evaluada' && !tieneNotas) {
      return 'La IE está evaluada pero todavía no tiene notas asociadas.';
    }

    return '';
  }

  async guardar(): Promise<void> {
    if (!this.slotActual) {
      return;
    }

    if (!this.titulo.trim()) {
      this.formError = 'El título es obligatorio.';
      return;
    }

    const fechaError = this.errorFechaEjecucion();
    if (fechaError) {
      this.formError = fechaError;
      return;
    }

    if (this.drawerModo === 'detalle') {
      return;
    }

    if (!this.fechaEjecucionInput.trim()) {
      this.formError = 'La fecha de ejecución es obligatoria.';
      return;
    }

    const fechaParsed = this.parseFechaInput(this.fechaEjecucionInput);
    if (!fechaParsed) {
      this.formError = 'La fecha de ejecución debe tener formato dd/mm/aaaa.';
      return;
    }

    if (!this.esAnioLectivoValido(fechaParsed)) {
      this.formError = `La fecha de ejecución debe pertenecer al año lectivo ${this.gestion?.anioLectivo ?? ''}.`;
      return;
    }

    if (this.drawerModo === 'crear' && !this.archivoSeleccionado) {
      this.formError = 'Para crear el archivo tenés que adjuntar un PDF.';
      return;
    }

    if (
      this.drawerModo === 'editar' &&
      this.fechaEjecucionOriginal &&
      !this.esFechaPasada(this.fechaEjecucionOriginal) &&
      this.esFechaPasada(this.fechaEjecucionInput) &&
      this.estadoIEActual !== 'Evaluada'
    ) {
      const decision = await this.confirmarEstadoPorFecha();
      if (decision === 'cancelar') {
        return;
      }

      if (decision === 'evaluada') {
        this.estadoIEActual = 'Evaluada';
      }
    }

    if (this.drawerModo === 'crear' && this.esFechaPasada(this.fechaEjecucionInput)) {
      this.estadoIEActual = 'Evaluada';
    }

    const form = new FormData();
    form.append('titulo', this.titulo.trim());
    form.append('tipoIE', this.tipoIE);
    form.append('fechaEjecucion', fechaParsed.toISOString().slice(0, 10));
    form.append('estado', this.estadoIEActual);
    this.selectedBloques.forEach(id => form.append('idBloquesTema', id));
    if (this.archivoSeleccionado) {
      form.append('archivo', this.archivoSeleccionado);
    }

    this.guardando = true;
    this.formError = '';

    this.service.guardarArchivo(this.idEC, this.slotActual.nro, this.tipoActual, form).subscribe({
      next: () => {
        this.guardando = false;
        this.cerrarDrawer();
        this.mostrarBanner('ok', 'Archivo guardado', 'La instancia evaluativa se actualizó correctamente.');
        this.cargarGestion();
      },
      error: err => {
        this.guardando = false;
        this.formError = this.extractErrorMessage(err, 'No se pudo guardar el archivo de la instancia evaluativa.');
      },
    });
  }

  guardarEstado(): void {
    if (!this.slotActual || !this.archivoActual) {
      return;
    }

    if (this.estadoIEActual === this.estadoIEOriginal) {
      return;
    }

    this.guardando = true;
    this.formError = '';

    this.service.cambiarEstado(this.idEC, this.slotActual.nro, this.estadoIEActual).subscribe({
      next: () => {
        this.guardando = false;
        this.cerrarDrawer();
        this.mostrarBanner('ok', 'Estado actualizado', 'El estado de la instancia evaluativa se actualizó correctamente.');
        this.cargarGestion();
      },
      error: err => {
        this.guardando = false;
        this.formError = this.extractErrorMessage(err, 'No se pudo actualizar el estado de la instancia evaluativa.');
      },
    });
  }

  editarDesdeDetalle(): void {
    if (!this.slotActual || !this.archivoActual || !this.archivoActual.puedeEditar) {
      return;
    }

    this.drawerModo = 'editar';
    this.formError = '';
  }

  confirmarEliminar(slot: InstanciaEvaluativaSlot, tipo: TipoCalificacion, archivo: ArchivoIEGestion): void {
    if (!archivo.puedeEliminar) {
      this.mostrarBanner('warn', `No se puede eliminar ${tipo}`, this.motivoBloqueoAccion(archivo, 'eliminar'));
      return;
    }

    const ref = this.dialog.open(ConfirmarAccionDialogComponent, {
      data: {
        titulo: 'Eliminar archivo',
        mensaje: `Vas a eliminar ${tipo} de la IE ${slot.nro}. Si este archivo no tiene notas, la operación se puede deshacer solo re-cargando una nueva versión.`,
        textoConfirmar: 'Eliminar',
        color: 'warn',
      },
    });

    ref.afterClosed().subscribe(confirmado => {
      if (!confirmado) {
        return;
      }

      this.eliminando = true;
      this.service.eliminarArchivo(this.idEC, slot.nro, tipo).subscribe({
        next: () => {
          this.eliminando = false;
          this.mostrarBanner('ok', 'Archivo eliminado', `Se eliminó ${tipo} de la IE ${slot.nro}.`);
          this.cargarGestion();
        },
        error: err => {
          this.eliminando = false;
          this.mostrarBanner('warn', 'No se pudo eliminar', this.extractErrorMessage(err, 'No se pudo eliminar el archivo.'));
        },
      });
    });
  }

  abrirPdf(url?: string | null): void {
    if (!url) {
      return;
    }

    window.open(url, '_blank', 'noopener');
  }

  getArchivo(slot: InstanciaEvaluativaSlot, tipo: TipoCalificacion): ArchivoIEGestion | null {
    return tipo === 'N'
      ? slot.notaOriginal
      : tipo === 'R1'
        ? slot.recuperatorio1
        : slot.recuperatorio2;
  }

  puedeCargar(slot: InstanciaEvaluativaSlot, tipo: TipoCalificacion): boolean {
    if (this.gestion?.sinPrograma) {
      return false;
    }

    if (tipo === 'N') return true;
    if (tipo === 'R1') return !!slot.notaOriginal;
    return !!slot.recuperatorio1;
  }

  motivoCarga(slot: InstanciaEvaluativaSlot, tipo: TipoCalificacion): string {
    if (this.gestion?.sinPrograma) {
      return this.gestion.mensajeTrazabilidad || 'No podés cargar instancias evaluativas sin un programa vigente.';
    }

    if (tipo === 'N') return '';
    if (tipo === 'R1' && !slot.notaOriginal) return 'Primero tenés que cargar la Nota Original.';
    if (tipo === 'R2' && !slot.recuperatorio1) return 'Primero tenés que cargar el Recuperatorio 1.';
    return '';
  }

  bloqueInfo(archivo: ArchivoIEGestion): string {
    return archivo.motivoBloqueo ?? (archivo.tieneCalificaciones ? 'Este archivo tiene calificaciones vinculadas.' : '');
  }

  motivoBloqueoAccion(archivo: ArchivoIEGestion, accion: 'editar' | 'eliminar'): string {
    if (archivo.motivoBloqueo) {
      return archivo.motivoBloqueo;
    }

    if (archivo.tieneCalificaciones) {
      return 'Este archivo tiene calificaciones vinculadas. Debe permanecer sin cambios.';
    }

    return accion === 'editar'
      ? 'Este archivo no se puede editar.'
      : 'Este archivo no se puede eliminar.';
  }

  subtituloSlot(slot: InstanciaEvaluativaSlot): string {
    const cargados = [slot.notaOriginal, slot.recuperatorio1, slot.recuperatorio2].filter(Boolean).length;
    return cargados === 0 ? '' : `${cargados} archivo${cargados === 1 ? '' : 's'} cargado${cargados === 1 ? '' : 's'}`;
  }

  tituloDrawer(): string {
    if (this.drawerModo === 'crear') {
      return 'Nuevo archivo';
    }

    if (this.drawerModo === 'detalle') {
      return 'Detalle del archivo';
    }

    return 'Editar archivo';
  }

  subtituloDrawer(): string {
    if (!this.slotActual) {
      return '';
    }

    if (this.drawerModo === 'crear') {
      return 'Cargá el PDF y, si aplica, vinculalo al programa.';
    }

    if (this.drawerModo === 'detalle') {
      return 'Revisá los datos del archivo y su trazabilidad.';
    }

    return 'Editá los datos del archivo y su trazabilidad.';
  }

  nombreTipoIE(tipo: TipoIE): string {
    switch (tipo) {
      case 'EvaluacionEscrita':
        return 'Evaluacion escrita';
      case 'EvaluacionOral':
        return 'Evaluacion oral';
      case 'Entrega':
        return 'Entrega';
      case 'TPI':
        return 'TPI';
    }

    return tipo;
  }

  nombreTipoCalificacion(tipo: TipoCalificacion): string {
    return tipo;
  }

  formatoFecha(valor?: string | null): string {
    if (!valor) return '-';
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return valor;
    return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(fecha);
  }

  formatoFechaCorta(valor?: string | null): string {
    if (!valor) return '';
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return '';
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const anio = fecha.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }

  errorFechaEjecucion(): string {
    const valor = this.fechaEjecucionInput.trim();
    if (!valor) {
      return '';
    }

    const fecha = this.parseFechaInput(valor);
    if (!fecha) {
      return 'La fecha de ejecución debe tener formato dd/mm/aaaa.';
    }

    if (!this.esAnioLectivoValido(fecha)) {
      return `La fecha de ejecución debe pertenecer al año lectivo ${this.gestion?.anioLectivo ?? ''}.`;
    }

    const errorOrden = this.errorOrdenFechasEjecucion(fecha);
    if (errorOrden) {
      return errorOrden;
    }

    return '';
  }

  trackBySlot(_: number, slot: InstanciaEvaluativaSlot): number {
    return slot.nro;
  }

  trackByUnidad(_: number, unidad: { idBloquePrograma: string }): string {
    return unidad.idBloquePrograma;
  }

  trackByTema(_: number, tema: TemaArbolDto): string {
    return tema.idBloquePrograma;
  }

  cerrarBanner(): void {
    this.bannerVisible = false;
    this.bannerMensaje = '';
    this.bannerTitulo = '';
  }

  mostrarBanner(tipo: 'info' | 'ok' | 'warn', titulo: string, mensaje: string): void {
    this.bannerVisible = true;
    this.bannerTipo = tipo;
    this.bannerTitulo = titulo;
    this.bannerMensaje = mensaje;
  }

  private parseFechaInput(valor: string): Date | null {
    const partes = valor.trim().split('/');
    if (partes.length !== 3) {
      return null;
    }

    const [diaStr, mesStr, anioStr] = partes;
    const dia = Number(diaStr);
    const mes = Number(mesStr);
    const anio = Number(anioStr);

    if (!Number.isInteger(dia) || !Number.isInteger(mes) || !Number.isInteger(anio)) {
      return null;
    }

    const fecha = new Date(Date.UTC(anio, mes - 1, dia));
    if (
      fecha.getUTCFullYear() !== anio ||
      fecha.getUTCMonth() !== mes - 1 ||
      fecha.getUTCDate() !== dia
    ) {
      return null;
    }

    return fecha;
  }

  private errorOrdenFechasEjecucion(fechaObjetivo: Date): string {
    if (!this.slotActual) {
      return '';
    }

    const fechaN = this.fechaExamenParaValidacion('N', fechaObjetivo);
    const fechaR1 = this.fechaExamenParaValidacion('R1', fechaObjetivo);
    const fechaR2 = this.fechaExamenParaValidacion('R2', fechaObjetivo);

    if (fechaN && fechaR1 && fechaR1.getTime() < fechaN.getTime()) {
      return 'La fecha de R1 no puede ser anterior a la de N.';
    }

    if (fechaN && fechaR2 && fechaR2.getTime() < fechaN.getTime()) {
      return 'La fecha de R2 no puede ser anterior a la de N.';
    }

    if (fechaR1 && fechaR2 && fechaR2.getTime() < fechaR1.getTime()) {
      return 'La fecha de R2 no puede ser anterior a la de R1.';
    }

    return '';
  }

  private fechaExamenParaValidacion(tipo: TipoCalificacion, fechaObjetivo: Date): Date | null {
    if (!this.slotActual) {
      return null;
    }

    if (tipo === this.tipoActual) {
      return fechaObjetivo;
    }

    const archivo = this.archivoPorTipo(tipo);
    const fechaGuardada = this.parseFechaServidor(archivo?.fechaEjecucion);
    if (!fechaGuardada) {
      return null;
    }

    return fechaGuardada;
  }

  private archivoPorTipo(tipo: TipoCalificacion): ArchivoIEGestion | null {
    if (!this.slotActual) {
      return null;
    }

    return tipo === 'N'
      ? this.slotActual.notaOriginal
      : tipo === 'R1'
        ? this.slotActual.recuperatorio1
      : this.slotActual.recuperatorio2;
  }

  private parseFechaServidor(valor?: string | null): Date | null {
    if (!valor) {
      return null;
    }

    const match = valor.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) {
      return null;
    }

    const anio = Number(match[1]);
    const mes = Number(match[2]);
    const dia = Number(match[3]);

    if (!Number.isInteger(anio) || !Number.isInteger(mes) || !Number.isInteger(dia)) {
      return null;
    }

    return new Date(Date.UTC(anio, mes - 1, dia));
  }

  private prepararDrawer(
    modo: 'crear' | 'detalle' | 'editar',
    slot: InstanciaEvaluativaSlot,
    tipo: TipoCalificacion,
    archivo: ArchivoIEGestion | null,
  ): void {
    this.drawerModo = modo;
    this.slotActual = slot;
    this.tipoActual = tipo;
    this.archivoActual = archivo;
    this.titulo = archivo?.titulo ?? this.defaultTitulo(slot.nro, tipo);
    this.tipoIE = archivo?.tipoIE ?? 'EvaluacionEscrita';
    this.fechaEjecucionInput = archivo ? this.formatoFechaCorta(archivo.fechaEjecucion) : '';
    this.fechaEjecucionOriginal = this.fechaEjecucionInput;
    this.estadoIEActual = this.estadoDesdeTexto(slot.estado);
    this.estadoIEOriginal = this.estadoIEActual;
    this.archivoSeleccionado = null;
    this.archivoNombre = archivo?.nombreArchivo ?? '';
    this.selectedBloques = new Set<string>(archivo?.idBloquesTema ?? []);
    this.expandedUnidades = archivo ? this.expandirUnidadesSegunBloques(archivo.idBloquesTema) : new Set<string>();
    this.formError = '';
    this.drawerVisible = true;
  }

  private async confirmarEstadoPorFecha(): Promise<ConfirmarEstadoIEResult> {
    const ref = this.dialog.open(ConfirmarEstadoIEDialogComponent, {
      data: {
        titulo: 'Fecha en el pasado',
        mensaje: 'La nueva fecha de ejecución queda en el pasado. ¿Querés marcar esta instancia evaluativa como evaluada o mantener su estado actual?',
        textoEvaluada: 'Marcar como evaluada',
        textoMantener: 'Mantener estado actual',
      },
      width: '480px',
    });

    return (await lastValueFrom(ref.afterClosed())) ?? 'cancelar';
  }

  private estadoDesdeTexto(valor?: string | null): 'Pendiente' | 'Evaluada' {
    return valor === 'Evaluada' ? 'Evaluada' : 'Pendiente';
  }

  private esAnioLectivoValido(fecha: Date): boolean {
    return !!this.gestion && fecha.getUTCFullYear() === this.gestion.anioLectivo;
  }

  private esFechaPasada(valor: string): boolean {
    const fecha = this.parseFechaInput(valor);
    if (!fecha) {
      return false;
    }

    const hoy = this.parseFechaInput(this.formatoFechaCorta(this.hoy()));
    return !!hoy && fecha.getTime() < hoy.getTime();
  }

  private slotTieneNotas(slot: InstanciaEvaluativaSlot): boolean {
    return [slot.notaOriginal, slot.recuperatorio1, slot.recuperatorio2].some(archivo => archivo?.tieneCalificaciones);
  }

  private expandirUnidadesSegunBloques(idsBloqueTema: string[]): Set<string> {
    const expandida = new Set<string>();
    const bloques = new Set(idsBloqueTema);

    this.gestion?.unidades.forEach(unidad => {
      if (unidad.temas.some(tema => bloques.has(tema.idBloquePrograma))) {
        expandida.add(unidad.idBloquePrograma);
      }
    });

    return expandida;
  }

  private defaultTitulo(nro: number, tipo: TipoCalificacion): string {
    return tipo === 'N' ? `IE ${nro} - Nota original` : `IE ${nro} - ${tipo}`;
  }

  private hoy(): string {
    const ahora = new Date();
    return new Date(Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()))
      .toISOString()
      .slice(0, 10);
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const body = (error as { error?: unknown }).error;
      if (typeof body === 'string' && body.trim()) {
        return body;
      }
      if (body && typeof body === 'object' && 'message' in body) {
        const message = (body as { message?: unknown }).message;
        if (typeof message === 'string' && message.trim()) {
          return message;
        }
      }
    }

    if (typeof error === 'object' && error !== null && 'message' in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }

    return fallback;
  }
}
