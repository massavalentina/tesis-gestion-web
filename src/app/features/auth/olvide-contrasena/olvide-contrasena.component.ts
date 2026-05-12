import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-olvide-contrasena',
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
  templateUrl: './olvide-contrasena.component.html',
  styleUrl: './olvide-contrasena.component.scss',
})
export class OlvideContrasenaComponent {
  form: FormGroup;
  loading = false;
  enviado = false;
  error: string | null = null;

  constructor(private fb: FormBuilder, private authService: AuthService) {
    this.form = this.fb.group({
      email:     ['', [Validators.required, Validators.email]],
      documento: ['', Validators.required],
    });
  }

  submit(): void {
    if (this.form.invalid) return;

    this.loading = true;
    this.error   = null;

    this.authService.solicitarReset(this.form.value).subscribe({
      next: () => {
        this.loading = false;
        this.enviado = true;
      },
      error: () => {
        this.loading = false;
        this.error   = 'No se pudo procesar la solicitud. Intente nuevamente.';
      },
    });
  }
}
