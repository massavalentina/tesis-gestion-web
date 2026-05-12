import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { AuthService } from '../auth/services/auth.service';
import { PerfilService, PerfilUsuario } from './services/perfil.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatChipsModule,
  ],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.scss',
})
export class PerfilComponent implements OnInit {
  perfil = signal<PerfilUsuario | null>(null);
  cargando = signal(true);
  errorCarga = signal('');

  // Formulario de datos personales
  formDatos: FormGroup;
  guardandoDatos = false;
  errorDatos: string | null = null;
  datosSaved = false;
  editandoDatos = false;


  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private perfilService: PerfilService,
  ) {
    this.formDatos = this.fb.group({
      nombre:   ['', Validators.required],
      apellido: ['', Validators.required],
      email:    ['', [Validators.required, Validators.email]],
      telefono: [''],
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
      },
      error: () => {
        this.errorCarga.set('No se pudo cargar el perfil.');
        this.cargando.set(false);
      },
    });
  }

  get p(): PerfilUsuario { return this.perfil()!; }

  habilitarEdicion(): void {
    this.editandoDatos = true;
    this.datosSaved    = false;
    this.errorDatos    = null;
    this.formDatos.enable();
  }

  cancelarEdicion(): void {
    const p = this.perfil();
    if (!p) return;
    this.formDatos.patchValue({ nombre: p.nombre, apellido: p.apellido, email: p.email, telefono: p.telefono ?? '' });
    this.formDatos.disable();
    this.editandoDatos = false;
    this.errorDatos    = null;
  }

  guardarDatos(): void {
    if (this.formDatos.invalid) return;

    const userId = this.p.idUsuario;
    this.guardandoDatos = true;
    this.errorDatos     = null;

    this.perfilService.actualizar(userId, this.formDatos.getRawValue()).subscribe({
      next: p => {
        this.perfil.set(p);
        this.formDatos.disable();
        this.editandoDatos  = false;
        this.guardandoDatos = false;
        this.datosSaved     = true;
      },
      error: err => {
        this.guardandoDatos = false;
        this.errorDatos     = err?.error?.error ?? 'No se pudo guardar. Intente nuevamente.';
      },
    });
  }

  formatFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}
