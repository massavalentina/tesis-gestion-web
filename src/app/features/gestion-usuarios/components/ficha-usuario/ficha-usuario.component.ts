import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { inject } from '@angular/core';
import { GestionUsuariosService } from '../../services/gestion-usuarios.service';
import { GestionRolesService } from '../../../gestion-roles/services/gestion-roles.service';
import { Usuario } from '../../models/usuario.model';
import { Rol } from '../../../gestion-roles/models/rol.model';
import {
  ConfirmarAccionUsuarioDialogComponent,
  ConfirmarAccionUsuarioData,
} from '../confirmar-accion-usuario-dialog/confirmar-accion-usuario-dialog.component';
import {
  AdvertenciaRolDialogComponent,
  AdvertenciaRolData,
} from '../advertencia-rol-dialog/advertencia-rol-dialog.component';

interface ConfirmData {
  titulo: string;
  mensaje: string;
  confirmLabel: string;
  warn?: boolean;
}

@Component({
  selector: 'app-confirm-rol-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h3 mat-dialog-title>{{ data.titulo }}</h3>
    <mat-dialog-content class="cdlg-content">{{ data.mensaje }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button [color]="data.warn ? 'warn' : 'primary'" [mat-dialog-close]="true">
        {{ data.confirmLabel }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.cdlg-content { font-size: 0.9rem; color: #475569; padding-bottom: 0.5rem; }`],
})
class ConfirmRolDialogComponent {
  readonly data: ConfirmData = inject(MAT_DIALOG_DATA);
}

const DELEGADO_ID = '__delegado__';
const ROL_PRECEPTOR_DELEGADO: Rol = { idRol: DELEGADO_ID, nombre: 'Preceptor Delegado' };

@Component({
  selector: 'app-ficha-usuario',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatTooltipModule,
    MatSnackBarModule,
  ],
  templateUrl: './ficha-usuario.component.html',
  styleUrl:    './ficha-usuario.component.css',
})
export class FichaUsuarioComponent implements OnInit {
  usuario      = signal<Usuario | null>(null);
  cargando     = signal(true);
  error        = signal('');
  accionando   = signal(false);
  errorAccion  = signal('');

  rolesDisponibles: Rol[] = [];
  rolParaAgregar: string | null = null;
  agregando            = signal(false);
  eliminandoRolId      = signal<string | null>(null);
  actualizandoDelegado = signal(false);

  private id!: string;

  constructor(
    private route:        ActivatedRoute,
    private router:       Router,
    private service:      GestionUsuariosService,
    private rolesService: GestionRolesService,
    private dialog:       MatDialog,
    private snack:        MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id')!;
    this.cargar();
    this.rolesService.getRoles().subscribe({
      next: roles => this.rolesDisponibles = roles,
    });
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.errorAccion.set('');
    this.rolParaAgregar = null;
    this.service.getOne(this.id).subscribe({
      next:  u => { this.usuario.set(u); this.cargando.set(false); },
      error: () => { this.error.set('No se pudo cargar el usuario.'); this.cargando.set(false); },
    });
  }

  get u(): Usuario { return this.usuario()!; }

  get esDelegado(): boolean {
    return this.usuario()?.esDelegado === true;
  }

  get tieneRolPreceptor(): boolean {
    return this.usuario()?.roles.some(r => r.toLowerCase() === 'preceptor') ?? false;
  }

  get rolesConObjeto(): Rol[] {
    const u = this.usuario();
    if (!u) return [];
    return u.roles
      .map(nombre => this.rolesDisponibles.find(r => r.nombre.toLowerCase() === nombre.toLowerCase()))
      .filter((r): r is Rol => r !== undefined);
  }

  get rolesAsignables(): Rol[] {
    const u = this.usuario();
    if (!u) return [];
    const asignados = new Set(u.roles.map(r => r.toLowerCase()));
    const reales = this.rolesDisponibles.filter(r => !asignados.has(r.nombre.toLowerCase()));
    if (this.tieneRolPreceptor && !u.esDelegado) {
      return [...reales, ROL_PRECEPTOR_DELEGADO];
    }
    return reales;
  }

  // ── Activar / Desactivar ──────────────────────────────────────────────
  volver(): void {
    this.router.navigate(['/gestion-usuarios']);
  }

  iniciarAccion(): void {
    const u = this.usuario();
    if (!u) return;
    u.activo ? this.iniciarDesactivacion(u) : this.iniciarActivacion(u);
  }

  private iniciarActivacion(u: Usuario): void {
    this.dialog.open(ConfirmarAccionUsuarioDialogComponent, {
      width: '440px', disableClose: true,
      data: { nombre: u.nombre, apellido: u.apellido, accion: 'activar' },
    }).afterClosed().subscribe((ok: boolean) => {
      if (ok) this.ejecutarActivar();
    });
  }

  private iniciarDesactivacion(u: Usuario): void {
    const data: ConfirmarAccionUsuarioData = { nombre: u.nombre, apellido: u.apellido, accion: 'desactivar' };
    this.dialog.open(ConfirmarAccionUsuarioDialogComponent, {
      width: '440px', disableClose: true, data,
    }).afterClosed().subscribe((ok: boolean) => {
      if (!ok) return;
      const conImplicancia = u.roles.some(r => ['docente', 'preceptor'].includes(r.toLowerCase()));
      conImplicancia ? this.mostrarAdvertenciaRol(u) : this.ejecutarDesactivar();
    });
  }

  private mostrarAdvertenciaRol(u: Usuario): void {
    const data: AdvertenciaRolData = {
      esDocente:   u.roles.some(r => r.toLowerCase() === 'docente'),
      esPreceptor: u.roles.some(r => r.toLowerCase() === 'preceptor'),
    };
    this.dialog.open(AdvertenciaRolDialogComponent, {
      width: '460px', disableClose: true, data,
    }).afterClosed().subscribe((ok: boolean) => {
      if (ok) this.ejecutarDesactivar();
    });
  }

  private ejecutarDesactivar(): void {
    this.accionando.set(true);
    this.service.desactivar(this.id).subscribe({
      next:  () => { this.accionando.set(false); this.cargar(); },
      error: () => { this.accionando.set(false); this.errorAccion.set('No se pudo desactivar el usuario.'); },
    });
  }

  private ejecutarActivar(): void {
    this.accionando.set(true);
    this.service.activar(this.id).subscribe({
      next:  () => { this.accionando.set(false); this.cargar(); },
      error: () => { this.accionando.set(false); this.errorAccion.set('No se pudo activar el usuario.'); },
    });
  }

  // ── Roles ─────────────────────────────────────────────────────────────
  agregarRol(): void {
    if (!this.rolParaAgregar || this.agregando()) return;
    const idRol = this.rolParaAgregar;
    const u = this.usuario()!;
    const nombre = `${u.apellido}, ${u.nombre}`;

    if (idRol === DELEGADO_ID) {
      this.dialog.open(ConfirmRolDialogComponent, {
        data: { titulo: 'Asignar rol', mensaje: `¿Asignar "Preceptor Delegado" a ${nombre}?`, confirmLabel: 'Asignar' } satisfies ConfirmData,
        width: '380px',
      }).afterClosed().subscribe(ok => {
        if (!ok) return;
        this.agregando.set(true);
        this.rolesService.actualizarDelegado(this.id, true).subscribe({
          next:  () => { this.agregando.set(false); this.cargar(); this.snack.open('Rol asignado con éxito.', 'Cerrar', { duration: 3000 }); },
          error: () => { this.agregando.set(false); this.snack.open('No se pudo asignar el rol.', 'Cerrar', { duration: 3000 }); },
        });
      });
      return;
    }

    const rol = this.rolesDisponibles.find(r => r.idRol === idRol);
    if (!rol) return;

    this.dialog.open(ConfirmRolDialogComponent, {
      data: { titulo: 'Asignar rol', mensaje: `¿Asignar "${rol.nombre}" a ${nombre}?`, confirmLabel: 'Asignar' } satisfies ConfirmData,
      width: '380px',
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.agregando.set(true);
      this.rolesService.asignarRol(this.id, idRol).subscribe({
        next:  () => { this.agregando.set(false); this.cargar(); this.snack.open('Rol asignado con éxito.', 'Cerrar', { duration: 3000 }); },
        error: () => { this.agregando.set(false); this.snack.open('No se pudo asignar el rol.', 'Cerrar', { duration: 3000 }); },
      });
    });
  }

  quitarRol(rol: Rol): void {
    if (this.eliminandoRolId()) return;
    const u = this.usuario()!;
    const nombre = `${u.apellido}, ${u.nombre}`;

    this.dialog.open(ConfirmRolDialogComponent, {
      data: { titulo: 'Quitar rol', mensaje: `¿Quitar "${rol.nombre}" de ${nombre}?`, confirmLabel: 'Quitar', warn: true } satisfies ConfirmData,
      width: '380px',
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.eliminandoRolId.set(rol.idRol);
      this.rolesService.quitarRol(this.id, rol.idRol).subscribe({
        next:  () => { this.eliminandoRolId.set(null); this.cargar(); this.snack.open('Rol eliminado con éxito.', 'Cerrar', { duration: 3000 }); },
        error: () => { this.eliminandoRolId.set(null); this.snack.open('No se pudo quitar el rol.', 'Cerrar', { duration: 3000 }); },
      });
    });
  }

  quitarDelegado(): void {
    if (this.actualizandoDelegado()) return;
    const u = this.usuario()!;
    const nombre = `${u.apellido}, ${u.nombre}`;

    this.dialog.open(ConfirmRolDialogComponent, {
      data: { titulo: 'Quitar rol', mensaje: `¿Quitar "Preceptor Delegado" de ${nombre}?`, confirmLabel: 'Quitar', warn: true } satisfies ConfirmData,
      width: '380px',
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.actualizandoDelegado.set(true);
      this.rolesService.actualizarDelegado(this.id, false).subscribe({
        next:  () => { this.actualizandoDelegado.set(false); this.cargar(); this.snack.open('Rol eliminado con éxito.', 'Cerrar', { duration: 3000 }); },
        error: () => { this.actualizandoDelegado.set(false); this.snack.open('No se pudo quitar el rol.', 'Cerrar', { duration: 3000 }); },
      });
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────
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

  rolChipClass(nombre: string): string {
    const mapa: Record<string, string> = {
      'Docente':            'chip-docente',
      'Equipo Directivo':   'chip-eq-directivo',
      'Secretario':         'chip-secretario',
      'Preceptor':          'chip-preceptor',
      'Preceptor Delegado': 'chip-preceptor-delegado',
      'Admin':              'chip-admin',
    };
    return mapa[nombre] ?? 'chip-default';
  }

  formatFecha(fechaStr: string): string {
    const d = new Date(fechaStr);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}
