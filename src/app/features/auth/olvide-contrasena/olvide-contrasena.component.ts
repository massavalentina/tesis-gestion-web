import { Component, ElementRef, NgZone, AfterViewInit, OnDestroy, ViewChild } from '@angular/core';
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
import { startBallsAnimation } from '../../../core/utils/balls-canvas.util';

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
export class OlvideContrasenaComponent implements AfterViewInit, OnDestroy {
  form: FormGroup;
  loading = false;
  enviado = false;
  error: string | null = null;

  @ViewChild('bgCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private stopAnimation?: () => void;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private ngZone: NgZone,
  ) {
    this.form = this.fb.group({
      email:     ['', [Validators.required, Validators.email]],
      documento: ['', Validators.required],
    });
  }

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.stopAnimation = startBallsAnimation(this.canvasRef.nativeElement, 14);
    });
  }

  ngOnDestroy(): void {
    this.stopAnimation?.();
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
