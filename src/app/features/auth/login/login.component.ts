import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
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
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  form: FormGroup;
  loading = false;
  error: string | null = null;
  mostrarContrasena = false;
  capsLockOn = false;
  provisoriaEnviada = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      identificador: ['', Validators.required],
      contrasena:    ['', Validators.required],
    });
  }

  ngOnInit(): void {
    if (this.authService.isAuthenticated) {
      this.router.navigate(['/']);
    }
  }

  checkCapsLock(event: KeyboardEvent): void {
    this.capsLockOn = event.getModifierState('CapsLock');
  }

  submit(): void {
    if (this.form.invalid) return;

    this.loading = true;
    this.error   = null;

    this.authService.login(this.form.value).subscribe({
      next: res => {
        this.loading = false;
        if (res.requiresPasswordChange) {
          this.authService.solicitarReset({ email: res.email, documento: res.documento })
            .subscribe({ next: () => {}, error: () => {} });
          this.provisoriaEnviada = true;
        } else {
          this.router.navigate(['/']);
        }
      },
      error: err => {
        this.loading = false;
        const serverMsg: string | undefined = err?.error?.error;
        this.error = (!serverMsg || serverMsg === 'Credenciales inválidas.')
          ? 'Credenciales inválidas. Verifique e intente nuevamente.'
          : serverMsg;
      },
    });
  }
}
