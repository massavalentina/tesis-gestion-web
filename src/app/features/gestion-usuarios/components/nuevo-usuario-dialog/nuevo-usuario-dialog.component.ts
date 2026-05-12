import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder, FormGroup, FormControl,
  Validators, AbstractControl, ValidationErrors, AsyncValidatorFn,
} from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, timer } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { GestionUsuariosService } from '../../services/gestion-usuarios.service';
import { CrearUsuarioResult, Usuario } from '../../models/usuario.model';

type EstadoDialog = 'formulario' | 'exito' | 'error';

@Component({
  selector: 'app-nuevo-usuario-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <!-- ── FORMULARIO ── -->
    <ng-container *ngIf="estado() === 'formulario'">
      <div class="dialog-header">
        <h2 class="dialog-titulo">Nuevo usuario</h2>
        <button mat-icon-button class="btn-cerrar" (click)="cancelar()" [disabled]="guardando()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <form [formGroup]="form" (ngSubmit)="guardar()" class="dialog-form">

        <div class="form-row">
          <mat-form-field appearance="outline" class="field-half">
            <mat-label>Nombre</mat-label>
            <input matInput formControlName="nombre" autocomplete="off" />
            <mat-error *ngIf="form.get('nombre')?.hasError('required')">Requerido</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="field-half">
            <mat-label>Apellido</mat-label>
            <input matInput formControlName="apellido" autocomplete="off" />
            <mat-error *ngIf="form.get('apellido')?.hasError('required')">Requerido</mat-error>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="field-full">
          <mat-label>Email</mat-label>
          <input matInput formControlName="email" type="email" autocomplete="off" />
          <mat-spinner matSuffix *ngIf="form.get('email')?.pending" diameter="18"></mat-spinner>
          <mat-error *ngIf="form.get('email')?.hasError('required')">Requerido</mat-error>
          <mat-error *ngIf="form.get('email')?.hasError('email')">Email inválido</mat-error>
          <mat-error *ngIf="form.get('email')?.hasError('emailTomado')">
            Este email ya está registrado
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="field-full">
          <mat-label>Documento</mat-label>
          <input matInput formControlName="documento" autocomplete="off" />
          <mat-spinner matSuffix *ngIf="form.get('documento')?.pending" diameter="18"></mat-spinner>
          <mat-error *ngIf="form.get('documento')?.hasError('required')">Requerido</mat-error>
          <mat-error *ngIf="form.get('documento')?.hasError('documentoTomado')">
            Este documento ya está registrado
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="field-full">
          <mat-label>Teléfono</mat-label>
          <input matInput formControlName="telefono" autocomplete="off" inputmode="numeric" />
          <mat-error *ngIf="form.get('telefono')?.hasError('pattern')">
            Solo se permiten números
          </mat-error>
        </mat-form-field>

        <div class="dialog-actions">
          <button mat-stroked-button type="button" (click)="cancelar()" [disabled]="guardando()">
            Cancelar
          </button>
          <button mat-flat-button color="primary" type="submit"
                  [disabled]="form.invalid || form.pending || guardando()">
            <mat-spinner *ngIf="guardando()" diameter="18" class="spinner-inline"></mat-spinner>
            <span *ngIf="!guardando() && !form.pending">Crear usuario</span>
            <span *ngIf="!guardando() && form.pending">Verificando...</span>
          </button>
        </div>

      </form>
    </ng-container>

    <!-- ── ÉXITO ── -->
    <div class="resultado-container" *ngIf="estado() === 'exito'">
      <div class="resultado-icono icono-exito">
        <mat-icon>check_circle</mat-icon>
      </div>
      <h2 class="resultado-titulo">¡Usuario creado!</h2>
      <p class="resultado-texto">
        La cuenta de
        <strong>{{ resultadoCreacion?.usuario?.apellido }}, {{ resultadoCreacion?.usuario?.nombre }}</strong>
        se creó correctamente.
      </p>
      <p class="resultado-texto">
        Se envió la contraseña provisoria al correo registrado.
      </p>
      <button mat-flat-button class="btn-resultado btn-verde" (click)="cerrar()">
        Cerrar
      </button>
    </div>

    <!-- ── ERROR ── -->
    <div class="resultado-container" *ngIf="estado() === 'error'">
      <div class="resultado-icono icono-error">
        <mat-icon>error_outline</mat-icon>
      </div>
      <h2 class="resultado-titulo">No se pudo crear el usuario</h2>
      <p class="resultado-texto">{{ errorMensaje }}</p>
      <p class="resultado-subtexto">El usuario no fue creado.</p>
      <div class="resultado-acciones">
        <button mat-stroked-button (click)="reintentar()">Reintentar</button>
        <button mat-flat-button class="btn-resultado" (click)="cerrar()">Cerrar</button>
      </div>
    </div>
  `,
  styles: [`
    /* ── Encabezado formulario ── */
    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px 0;
    }
    .dialog-titulo {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
      color: #0f2f4b;
    }
    .btn-cerrar { color: #64748b; }

    /* ── Formulario ── */
    .dialog-form {
      padding: 16px 24px 20px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .form-row { display: flex; gap: 12px; }
    .field-half { flex: 1; }
    .field-full { width: 100%; }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 8px;
    }
    .spinner-inline { display: inline-block; vertical-align: middle; }

    /* ── Pantalla de resultado ── */
    .resultado-container {
      padding: 32px 28px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      min-width: 340px;
    }
    .resultado-icono mat-icon { font-size: 48px; width: 48px; height: 48px; }
    .icono-exito mat-icon { color: #16a34a; }
    .icono-error mat-icon  { color: #dc2626; }

    .resultado-titulo {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
      color: #0f2f4b;
      text-align: center;
    }
    .resultado-texto {
      margin: 0;
      font-size: 0.92rem;
      color: #475569;
      text-align: center;
      line-height: 1.55;
    }
    .resultado-subtexto {
      margin: -4px 0 0;
      font-size: 0.82rem;
      color: #94a3b8;
      text-align: center;
    }
    .resultado-acciones { display: flex; gap: 8px; margin-top: 4px; }
    .btn-resultado { background: #0284c7; color: white; }
    .btn-verde     { background: #16a34a !important; color: white !important; }
  `],
})
export class NuevoUsuarioDialogComponent {
  estado      = signal<EstadoDialog>('formulario');
  guardando   = signal(false);
  resultadoCreacion: CrearUsuarioResult | null = null;
  errorMensaje = '';

  form: FormGroup;

  constructor(
    private dialogRef: MatDialogRef<NuevoUsuarioDialogComponent>,
    private service:   GestionUsuariosService,
    fb: FormBuilder,
  ) {
    this.form = fb.group({
      nombre:   ['', Validators.required],
      apellido: ['', Validators.required],
      email: new FormControl('', {
        validators:      [Validators.required, Validators.email],
        asyncValidators: [this.emailUnicoValidator()],
      }),
      documento: new FormControl('', {
        validators:      [Validators.required],
        asyncValidators: [this.documentoUnicoValidator()],
      }),
      telefono: ['', Validators.pattern(/^\d*$/)],
    });
  }

  private emailUnicoValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      const email = (control.value as string)?.trim();
      if (!email) return of(null);
      return timer(400).pipe(
        switchMap(() => this.service.verificarEmail(email)),
        map(() => null),
        catchError((err: HttpErrorResponse) =>
          of(err.status === 409 ? { emailTomado: true } : null)
        )
      );
    };
  }

  private documentoUnicoValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      const doc = (control.value as string)?.trim();
      if (!doc) return of(null);
      return timer(400).pipe(
        switchMap(() => this.service.verificarDocumento(doc)),
        map(() => null),
        catchError((err: HttpErrorResponse) =>
          of(err.status === 409 ? { documentoTomado: true } : null)
        )
      );
    };
  }

  guardar(): void {
    if (this.form.invalid || this.form.pending) return;
    this.guardando.set(true);

    this.service.crear(this.form.value).subscribe({
      next: (resultado: CrearUsuarioResult) => {
        this.guardando.set(false);
        this.resultadoCreacion = resultado;
        this.estado.set('exito');
      },
      error: (err) => {
        this.guardando.set(false);
        this.errorMensaje = err?.error?.error ?? 'Ocurrió un error inesperado.';
        this.estado.set('error');
      },
    });
  }

  reintentar(): void {
    this.estado.set('formulario');
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }

  cerrar(): void {
    this.dialogRef.close(this.resultadoCreacion?.usuario ?? null);
  }
}
