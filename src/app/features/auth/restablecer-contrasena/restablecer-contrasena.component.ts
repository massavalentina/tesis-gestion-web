import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../services/auth.service';

function contieneMayuscula(): ValidatorFn {
  return (c: AbstractControl): ValidationErrors | null =>
    /[A-Z]/.test(c.value ?? '') ? null : { sinMayuscula: true };
}

function contieneNumero(): ValidatorFn {
  return (c: AbstractControl): ValidationErrors | null =>
    /[0-9]/.test(c.value ?? '') ? null : { sinNumero: true };
}

function coincideContrasenaNueva(otra: string): ValidatorFn {
  return (c: AbstractControl): ValidationErrors | null => {
    const group = c.parent;
    if (!group) return null;
    return c.value === group.get(otra)?.value ? null : { noCoincide: true };
  };
}

@Component({
  selector: 'app-restablecer-contrasena',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressBarModule,
    MatIconModule,
  ],
  templateUrl: './restablecer-contrasena.component.html',
  styleUrl: './restablecer-contrasena.component.scss',
})
export class RestablecerContrasenaComponent implements OnInit {
  form: FormGroup;
  loading = false;
  listo = false;
  error: string | null = null;
  tokenInvalido = false;

  mostrarNueva = false;
  mostrarConfirm = false;

  private token = '';
  private documento = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    this.form = this.fb.group({
      contrasenaNueva: ['', [
        Validators.required,
        Validators.minLength(6),
        contieneMayuscula(),
        contieneNumero(),
      ]],
      confirmacionContrasenaNueva: ['', [
        Validators.required,
        coincideContrasenaNueva('contrasenaNueva'),
      ]],
    });
  }

  ngOnInit(): void {
    this.token     = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.documento = this.route.snapshot.queryParamMap.get('dni')   ?? '';

    if (!this.token || !this.documento) {
      this.tokenInvalido = true;
    }
  }

  submit(): void {
    if (this.form.invalid) return;

    this.loading = true;
    this.error   = null;

    this.authService.restablecerContrasena({
      token:                       this.token,
      documento:                   this.documento,
      contrasenaNueva:             this.form.value.contrasenaNueva,
      confirmacionContrasenaNueva: this.form.value.confirmacionContrasenaNueva,
    }).subscribe({
      next: () => {
        this.loading = false;
        this.listo   = true;
        setTimeout(() => this.router.navigate(['/']), 2000);
      },
      error: err => {
        this.loading = false;
        this.error   = err?.error?.error ?? 'El link es inválido o ya expiró. Solicitá uno nuevo.';
      },
    });
  }
}
