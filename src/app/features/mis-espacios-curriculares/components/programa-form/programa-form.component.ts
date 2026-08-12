import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { forkJoin, catchError, of, filter } from 'rxjs';
import { MisEspaciosCurricularesService } from '../../services/mis-espacios-curriculares.service';
import { ProgramaService } from '../../services/programa.service';
import { MisEcItem } from '../../models/mis-ec.model';
import { ProgramaResumen, CrearProgramaDto } from '../../models/programa.model';
import { ConfirmarAccionDialogComponent, ConfirmarAccionData } from '../confirmar-accion-dialog/confirmar-accion-dialog.component';

@Component({
  selector: 'app-programa-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DragDropModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    MatDialogModule,
  ],
  templateUrl: './programa-form.component.html',
  styleUrl: './programa-form.component.scss',
})
export class ProgramaFormComponent implements OnInit {
  form!: FormGroup;
  espacios: MisEcItem[] = [];
  espacio: MisEcItem | null = null;
  idEC = '';
  idPrograma = '';
  modoEdicion = false;
  loading = true;
  guardando = false;
  aniosDisponibles: number[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private ecService: MisEspaciosCurricularesService,
    private programaService: ProgramaService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.idEC = this.route.snapshot.paramMap.get('idEC') ?? '';
    this.idPrograma = this.route.snapshot.paramMap.get('idPrograma') ?? '';
    this.modoEdicion = !!this.idPrograma;

    const anioActual = new Date().getFullYear();
    const todosLosAnios = Array.from({ length: anioActual - 1950 + 1 }, (_, i) => anioActual - i);

    this.initForm(anioActual);

    forkJoin({
      ecs: this.ecService.getMisEspaciosCurriculares().pipe(catchError(() => of([]))),
      programas: this.programaService.getProgramasPorEC(this.idEC).pipe(catchError(() => of([]))),
    }).subscribe(({ ecs, programas }) => {
      this.espacio = ecs.find(e => e.idEC === this.idEC) ?? null;

      const aniosOcupados = (programas as ProgramaResumen[])
        .filter(p => p.estado !== 'NoVigente' && (!this.modoEdicion || p.idPrograma !== this.idPrograma))
        .map(p => p.anioLectivo);
      this.aniosDisponibles = todosLosAnios.filter(a => !aniosOcupados.includes(a));

      if (this.espacio) {
        this.form.patchValue({
          idCurso: this.espacio.idCurso,
          idEC: this.espacio.idEC,
        });
      }

      if (this.modoEdicion) {
        this.cargarPrograma();
      } else {
        this.loading = false;
      }
    });
  }

  private initForm(anioActual: number): void {
    this.form = this.fb.group({
      idCurso: ['', Validators.required],
      idEC: ['', Validators.required],
      anioLectivo: [anioActual, Validators.required],
      titulo: ['', [Validators.required, Validators.maxLength(300)]],
      descripcion: ['', Validators.maxLength(2000)],
      horasCatedra: [null, [Validators.required, Validators.min(1)]],
      objetivos: this.fb.array([]),
      unidades: this.fb.array([]),
    });

    // Agregar un objetivo y una unidad con un tema por defecto
    this.agregarObjetivo();
    this.agregarUnidad();
  }

  private cargarPrograma(): void {
    this.programaService.getPrograma(this.idPrograma).subscribe({
      next: (p) => {
        if (p.estado !== 'Borrador') {
          this.snackBar.open('Solo se pueden editar programas en estado Borrador.', 'Cerrar', { duration: 4000 });
          this.router.navigate(['/mis-espacios-curriculares', this.idEC, 'programas', this.idPrograma]);
          return;
        }

        // Limpiar arrays default
        this.objetivos.clear();
        this.unidades.clear();

        this.form.patchValue({
          idCurso: p.idCurso,
          idEC: p.idEC,
          anioLectivo: p.anioLectivo,
          titulo: p.titulo,
          descripcion: p.descripcion ?? '',
          horasCatedra: p.horasCatedra,
        });

        for (const obj of p.objetivos) {
          this.objetivos.push(this.fb.group({
            descripcion: [obj.descripcion, [Validators.required, Validators.maxLength(1000)]],
          }));
        }

        for (const u of p.unidades) {
          const temas = this.fb.array(
            u.temas.map(t => this.fb.group({
              titulo: [t.titulo, [Validators.required, Validators.maxLength(300)]],
              descripcion: [t.descripcion ?? '', Validators.maxLength(2000)],
            }))
          );
          this.unidades.push(this.fb.group({
            titulo: [u.titulo, [Validators.required, Validators.maxLength(300)]],
            descripcion: [u.descripcion ?? '', Validators.maxLength(2000)],
            temas,
          }));
        }

        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Error al cargar el programa.', 'Cerrar', { duration: 4000 });
        this.loading = false;
      },
    });
  }

  // ─── Objetivos ───
  get objetivos(): FormArray {
    return this.form.get('objetivos') as FormArray;
  }

  objetivoGroup(i: number): FormGroup {
    return this.objetivos.at(i) as FormGroup;
  }

  agregarObjetivo(): void {
    this.objetivos.push(this.fb.group({
      descripcion: ['', [Validators.required, Validators.maxLength(1000)]],
    }));
  }

  eliminarObjetivo(i: number): void {
    this.objetivos.removeAt(i);
  }

  dropObjetivo(event: CdkDragDrop<unknown>): void {
    moveItemInArray(this.objetivos.controls, event.previousIndex, event.currentIndex);
  }

  // ─── Unidades ───
  get unidades(): FormArray {
    return this.form.get('unidades') as FormArray;
  }

  unidadGroup(i: number): FormGroup {
    return this.unidades.at(i) as FormGroup;
  }

  agregarUnidad(): void {
    const temas = this.fb.array([
      this.crearTemaGroup(),
    ]);
    this.unidades.push(this.fb.group({
      titulo: ['', [Validators.required, Validators.maxLength(300)]],
      descripcion: ['', Validators.maxLength(2000)],
      temas,
    }));
  }

  eliminarUnidad(i: number): void {
    this.unidades.removeAt(i);
  }

  dropUnidad(event: CdkDragDrop<unknown>): void {
    moveItemInArray(this.unidades.controls, event.previousIndex, event.currentIndex);
  }

  // ─── Temas ───
  getTemas(unidadIndex: number): FormArray {
    return (this.unidades.at(unidadIndex) as FormGroup).get('temas') as FormArray;
  }

  temaGroup(unidadIndex: number, temaIndex: number): FormGroup {
    return this.getTemas(unidadIndex).at(temaIndex) as FormGroup;
  }

  agregarTema(unidadIndex: number): void {
    this.getTemas(unidadIndex).push(this.crearTemaGroup());
  }

  eliminarTema(unidadIndex: number, temaIndex: number): void {
    this.getTemas(unidadIndex).removeAt(temaIndex);
  }

  dropTema(unidadIndex: number, event: CdkDragDrop<unknown>): void {
    moveItemInArray(this.getTemas(unidadIndex).controls, event.previousIndex, event.currentIndex);
  }

  private crearTemaGroup(): FormGroup {
    return this.fb.group({
      titulo: ['', [Validators.required, Validators.maxLength(300)]],
      descripcion: ['', Validators.maxLength(2000)],
    });
  }

  // ─── Expandir/colapsar unidades ───
  unidadesExpandidas = new Set<number>();

  toggleUnidad(i: number): void {
    if (this.unidadesExpandidas.has(i)) {
      this.unidadesExpandidas.delete(i);
    } else {
      this.unidadesExpandidas.add(i);
    }
  }

  isExpanded(i: number): boolean {
    return this.unidadesExpandidas.has(i);
  }

  // ─── Submit ───
  guardar(): void {
    this.form.markAllAsTouched();

    if (this.objetivos.length === 0) {
      this.snackBar.open('Debe haber al menos un objetivo.', 'Cerrar', { duration: 3000 });
      return;
    }

    if (this.unidades.length === 0) {
      this.snackBar.open('Debe haber al menos una unidad.', 'Cerrar', { duration: 3000 });
      return;
    }

    for (let i = 0; i < this.unidades.length; i++) {
      if (this.getTemas(i).length === 0) {
        this.snackBar.open(`La unidad ${i + 1} debe tener al menos un tema.`, 'Cerrar', { duration: 3000 });
        return;
      }
    }

    if (this.form.invalid) {
      this.snackBar.open('Completá los campos obligatorios.', 'Cerrar', { duration: 3000 });
      return;
    }

    const val = this.form.value;
    const dto: CrearProgramaDto = {
      idCurso: val.idCurso,
      idEC: val.idEC,
      anioLectivo: val.anioLectivo,
      titulo: val.titulo,
      descripcion: val.descripcion || undefined,
      horasCatedra: val.horasCatedra,
      objetivos: val.objetivos.map((o: { descripcion: string }, i: number) => ({
        descripcion: o.descripcion,
        nro: i + 1,
      })),
      unidades: val.unidades.map((u: { titulo: string; descripcion: string; temas: { titulo: string; descripcion: string }[] }, i: number) => ({
        titulo: u.titulo,
        descripcion: u.descripcion || undefined,
        nro: i + 1,
        temas: u.temas.map((t: { titulo: string; descripcion: string }, j: number) => ({
          titulo: t.titulo,
          descripcion: t.descripcion || undefined,
          nro: j + 1,
        })),
      })),
    };

    const titulo = this.modoEdicion ? 'Confirmar edición' : 'Confirmar creación';
    const mensaje = this.modoEdicion
      ? `¿Confirma que desea guardar los cambios en "${val.titulo.trim()}"?`
      : `¿Confirma la creación del programa "${val.titulo.trim()}" para el año ${val.anioLectivo}?`;

    this.dialog.open(ConfirmarAccionDialogComponent, {
      data: { titulo, mensaje, textoConfirmar: this.modoEdicion ? 'Guardar cambios' : 'Crear programa', color: 'primary' } as ConfirmarAccionData,
    }).afterClosed().pipe(filter(Boolean)).subscribe(() => this.ejecutarGuardar(dto));
  }

  private ejecutarGuardar(dto: CrearProgramaDto): void {
    this.guardando = true;

    const request$ = this.modoEdicion
      ? this.programaService.actualizar(this.idPrograma, dto)
      : this.programaService.crear(dto);

    request$.subscribe({
      next: (p) => {
        this.guardando = false;
        this.snackBar.open(
          this.modoEdicion ? 'Programa actualizado correctamente.' : 'Programa creado correctamente.',
          'Cerrar',
          { duration: 3000 },
        );
        this.router.navigate(['/mis-espacios-curriculares', this.idEC, 'programas', p.idPrograma]);
      },
      error: (err) => {
        this.guardando = false;
        const msg = err?.error ?? 'Error al guardar el programa.';
        this.snackBar.open(typeof msg === 'string' ? msg : 'Error al guardar el programa.', 'Cerrar', { duration: 4000 });
      },
    });
  }

  cancelar(): void {
    if (this.modoEdicion) {
      this.router.navigate(['/mis-espacios-curriculares', this.idEC, 'programas', this.idPrograma]);
    } else {
      this.router.navigate(['/mis-espacios-curriculares', this.idEC, 'programas']);
    }
  }

  volverAMisEspacios(): void {
    this.router.navigate(['/mis-espacios-curriculares']);
  }

  volverAEspacio(): void {
    if (!this.idEC) return;
    this.router.navigate(['/mis-espacios-curriculares', this.idEC]);
  }

  formatCurso(anio: number, division: string): string {
    return `${anio}°${division}`;
  }
}
