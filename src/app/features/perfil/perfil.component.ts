import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder, FormGroup, FormControl, ReactiveFormsModule,
  Validators, AbstractControl, ValidationErrors, ValidatorFn, AsyncValidatorFn,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable, of, timer } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { AuthService } from '../auth/services/auth.service';
import { PerfilService, PerfilUsuario } from './services/perfil.service';
import { GestionUsuariosService } from '../gestion-usuarios/services/gestion-usuarios.service';
import { AsignacionService } from '../gestion-usuarios/services/asignacion.service';
import { PreceptorCursoActivo, PreceptorCursoHistorial } from '../gestion-usuarios/models/asignacion.model';

function soloLetrasMin2(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const v = ((control.value as string) ?? '').trim();
    if (/\d/.test(v)) return { tieneNumeros: true };
    if (v.length < 2) return { minLetras: true };
    return null;
  };
}

function emailMinValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const v = ((control.value as string) ?? '').trim();
    if (!v) return null;
    return /^[^\s@]+@[^\s@]+$/.test(v) ? null : { emailInvalido: true };
  };
}

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.scss',
})
export class PerfilComponent implements OnInit {
  perfil = signal<PerfilUsuario | null>(null);
  cargando = signal(true);
  errorCarga = signal('');

  cursoActivos   = signal<PreceptorCursoActivo[]>([]);
  cursoHistorial = signal<PreceptorCursoHistorial[]>([]);
  cargandoCursos  = signal(false);
  mostrarHistorial = signal(false);

  formDatos: FormGroup;
  guardandoDatos = false;
  errorDatos: string | null = null;
  datosSaved = false;
  editandoDatos = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private perfilService: PerfilService,
    private gestionService: GestionUsuariosService,
    private asignacionService: AsignacionService,
  ) {
    this.formDatos = this.fb.group({
      nombre:   ['', [Validators.required, soloLetrasMin2()]],
      apellido: ['', [Validators.required, soloLetrasMin2()]],
      email:    new FormControl('', { validators: [Validators.required, emailMinValidator()] }),
      telefono: ['', Validators.pattern(/^\d*$/)],
    });
  }

  ngOnInit(): void {
    const userId = this.authService.currentUser?.idUsuario;
    if (!userId) return;

    this.perfilService.obtener(userId).subscribe({
      next: p => {
        this.perfil.set(p);
        this.formDatos.patchValue({
          nombre:   p.nombre,
          apellido: p.apellido,
          email:    p.email,
          telefono: p.telefono ?? '',
        });
        this.formDatos.disable();
        this.cargando.set(false);

        const esPreceptor = p.roles.some(r => r.toLowerCase() === 'preceptor');
        if (esPreceptor && p.idPreceptor) {
          this.cargandoCursos.set(true);
          this.asignacionService.getCursosPreceptor(p.idPreceptor).subscribe({
            next: res => {
              this.cursoActivos.set(this.sortCursos(res.activos));
              this.cursoHistorial.set(this.sortCursos(res.historial));
              this.cargandoCursos.set(false);
            },
            error: () => this.cargandoCursos.set(false),
          });
        }
      },
      error: () => {
        this.errorCarga.set('No se pudo cargar el perfil.');
        this.cargando.set(false);
      },
    });
  }

  get p(): PerfilUsuario { return this.perfil()!; }

  get esPreceptor(): boolean {
    return this.perfil()?.roles.some(r => r.toLowerCase() === 'preceptor') ?? false;
  }

  toggleHistorial(): void { this.mostrarHistorial.update(v => !v); }

  private sortCursos<T extends { anio: number; division: string }>(cursos: T[]): T[] {
    return [...cursos].sort((a, b) =>
      a.anio !== b.anio ? a.anio - b.anio : a.division.localeCompare(b.division, 'es')
    );
  }

  habilitarEdicion(): void {
    this.editandoDatos = true;
    this.datosSaved    = false;
    this.errorDatos    = null;
    const originalEmail = this.perfil()?.email ?? '';
    const emailCtrl = this.formDatos.get('email')!;
    emailCtrl.setAsyncValidators(this.emailUnicoValidator(originalEmail));
    emailCtrl.updateValueAndValidity();
    this.formDatos.enable();
  }

  cancelarEdicion(): void {
    const p = this.perfil();
    if (!p) return;
    const emailCtrl = this.formDatos.get('email')!;
    emailCtrl.clearAsyncValidators();
    this.formDatos.patchValue({
      nombre: p.nombre, apellido: p.apellido, email: p.email, telefono: p.telefono ?? '',
    });
    this.formDatos.disable();
    this.editandoDatos = false;
    this.errorDatos    = null;
  }

  guardarDatos(): void {
    if (this.formDatos.invalid || this.formDatos.pending) return;
    const userId = this.p.idUsuario;
    this.guardandoDatos = true;
    this.errorDatos     = null;

    this.perfilService.actualizar(userId, this.formDatos.getRawValue()).subscribe({
      next: p => {
        this.perfil.set(p);
        const emailCtrl = this.formDatos.get('email')!;
        emailCtrl.clearAsyncValidators();
        this.formDatos.disable();
        this.editandoDatos  = false;
        this.guardandoDatos = false;
        this.datosSaved     = true;
        setTimeout(() => this.datosSaved = false, 3000);
      },
      error: err => {
        this.guardandoDatos = false;
        this.errorDatos     = err?.error?.error ?? 'No se pudo guardar. Intente nuevamente.';
      },
    });
  }

  private emailUnicoValidator(originalEmail: string): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      const email = ((control.value as string) ?? '').trim().toLowerCase();
      if (!email || email === originalEmail.toLowerCase()) return of(null);
      return timer(400).pipe(
        switchMap(() => this.gestionService.verificarEmail(email)),
        map(() => null),
        catchError((err: HttpErrorResponse) =>
          of(err.status === 409 ? { emailTomado: true } : null)
        )
      );
    };
  }

  formatFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}
