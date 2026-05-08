import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { GestionUsuariosService } from '../../services/gestion-usuarios.service';
import { Usuario } from '../../models/usuario.model';
import {
  ConfirmarAccionUsuarioDialogComponent,
  ConfirmarAccionUsuarioData,
} from '../confirmar-accion-usuario-dialog/confirmar-accion-usuario-dialog.component';
import {
  AdvertenciaRolDialogComponent,
  AdvertenciaRolData,
} from '../advertencia-rol-dialog/advertencia-rol-dialog.component';

@Component({
  selector: 'app-ficha-usuario',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
  ],
  templateUrl: './ficha-usuario.component.html',
  styleUrl:    './ficha-usuario.component.css',
})
export class FichaUsuarioComponent implements OnInit {
  usuario   = signal<Usuario | null>(null);
  cargando  = signal(true);
  error     = signal('');
  accionando = signal(false);
  errorAccion = signal('');

  private id!: string;

  constructor(
    private route:   ActivatedRoute,
    private router:  Router,
    private service: GestionUsuariosService,
    private dialog:  MatDialog,
  ) {}

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id')!;
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.errorAccion.set('');
    this.service.getOne(this.id).subscribe({
      next:  (u) => { this.usuario.set(u); this.cargando.set(false); },
      error: ()  => { this.error.set('No se pudo cargar el usuario.'); this.cargando.set(false); },
    });
  }

  get u(): Usuario { return this.usuario()!; }

  volver(): void {
    this.router.navigate(['/gestion-usuarios']);
  }

  iniciarAccion(): void {
    const u = this.usuario();
    if (!u) return;
    u.activo ? this.iniciarDesactivacion(u) : this.iniciarActivacion(u);
  }

  private iniciarActivacion(u: Usuario): void {
    const ref = this.dialog.open(ConfirmarAccionUsuarioDialogComponent, {
      width: '440px',
      disableClose: true,
      data: { nombre: u.nombre, apellido: u.apellido, accion: 'activar' },
    });
    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) this.ejecutarActivar();
    });
  }

  private iniciarDesactivacion(u: Usuario): void {
    const data: ConfirmarAccionUsuarioData = { nombre: u.nombre, apellido: u.apellido, accion: 'desactivar' };
    const ref = this.dialog.open(ConfirmarAccionUsuarioDialogComponent, {
      width: '440px',
      disableClose: true,
      data,
    });
    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;

      const tieneRolConImplicancia = u.roles.some(r => {
        const lower = r.toLowerCase();
        return lower === 'docente' || lower === 'preceptor';
      });

      if (tieneRolConImplicancia) {
        this.mostrarAdvertenciaRol(u);
      } else {
        this.ejecutarDesactivar();
      }
    });
  }

  private mostrarAdvertenciaRol(u: Usuario): void {
    const data: AdvertenciaRolData = {
      esDocente:   u.roles.some(r => r.toLowerCase() === 'docente'),
      esPreceptor: u.roles.some(r => r.toLowerCase() === 'preceptor'),
    };
    const ref = this.dialog.open(AdvertenciaRolDialogComponent, {
      width: '460px',
      disableClose: true,
      data,
    });
    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) this.ejecutarDesactivar();
    });
  }

  private ejecutarDesactivar(): void {
    this.accionando.set(true);
    this.errorAccion.set('');
    this.service.desactivar(this.id).subscribe({
      next:  () => { this.accionando.set(false); this.cargar(); },
      error: () => { this.accionando.set(false); this.errorAccion.set('No se pudo desactivar el usuario.'); },
    });
  }

  private ejecutarActivar(): void {
    this.accionando.set(true);
    this.errorAccion.set('');
    this.service.activar(this.id).subscribe({
      next:  () => { this.accionando.set(false); this.cargar(); },
      error: () => { this.accionando.set(false); this.errorAccion.set('No se pudo activar el usuario.'); },
    });
  }

  rolColor(rol: string): string {
    switch (rol.toLowerCase()) {
      case 'docente':          return 'chip-celeste';
      case 'preceptor':        return 'chip-violeta';
      case 'equipo directivo': return 'chip-naranja';
      case 'admin':            return 'chip-rojo';
      case 'secretario':       return 'chip-teal';
      default:                 return 'chip-gris';
    }
  }

  formatFecha(fechaStr: string): string {
    const d = new Date(fechaStr);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}
