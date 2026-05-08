import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { inject } from '@angular/core';
import { forkJoin } from 'rxjs';

import { GestionRolesService } from '../../services/gestion-roles.service';
import { UsuarioConRoles } from '../../models/usuario-con-roles.model';
import { Rol } from '../../models/rol.model';

interface ConfirmData {
  titulo: string;
  mensaje: string;
  confirmLabel: string;
  warn?: boolean;
}

@Component({
  selector: 'app-confirm-dialog',
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
class ConfirmDialogComponent {
  readonly data: ConfirmData = inject(MAT_DIALOG_DATA);
}

// Sentinel para el rol sintético "Preceptor Delegado" (no existe en la BD)
const DELEGADO_ID = '__delegado__';
const ROL_PRECEPTOR_DELEGADO: Rol = { idRol: DELEGADO_ID, nombre: 'Preceptor Delegado' };

interface FilaUsuario {
  idUsuario: string;
  mail: string;
  nombre: string | null;
  apellido: string | null;
  documento: string | null;
  esDelegado: boolean | null;
  actualizandoDelegado: boolean;
  roles: Rol[];
  rolParaAgregar: string | null;
  agregando: boolean;
  eliminandoRolId: string | null;
}

@Component({
  selector: 'app-gestion-roles',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDialogModule,
    MatButtonModule,
  ],
  templateUrl: './gestion-roles.component.html',
  styleUrl: './gestion-roles.component.css',
})
export class GestionRolesComponent implements OnInit {
  filas: FilaUsuario[] = [];
  rolesDisponibles: Rol[] = [];
  filtro = '';

  cargando = true;
  error = false;

  constructor(
    private service: GestionRolesService,
    private snack: MatSnackBar,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    forkJoin({
      usuarios: this.service.getUsuarios(),
      roles: this.service.getRoles(),
    }).subscribe({
      next: ({ usuarios, roles }) => {
        this.rolesDisponibles = roles;
        this.filas = usuarios.map(u => this.toFila(u));
        this.cargando = false;
      },
      error: () => {
        this.error = true;
        this.cargando = false;
      },
    });
  }

  get filasFiltradas(): FilaUsuario[] {
    const q = this.filtro.trim().toLowerCase();
    if (!q) return this.filas;
    return this.filas.filter(f =>
      f.mail.toLowerCase().includes(q) ||
      (f.nombre?.toLowerCase().includes(q) ?? false) ||
      (f.apellido?.toLowerCase().includes(q) ?? false) ||
      (f.documento?.includes(q) ?? false),
    );
  }

  get totalUsuarios(): number { return this.filas.length; }

  displayNombre(fila: FilaUsuario): string {
    if (fila.apellido || fila.nombre) {
      return [fila.apellido, fila.nombre].filter(Boolean).join(', ');
    }
    return fila.mail;
  }

  displayIniciales(fila: FilaUsuario): string {
    if (fila.apellido) return fila.apellido[0].toUpperCase();
    if (fila.nombre)   return fila.nombre[0].toUpperCase();
    return fila.mail[0].toUpperCase();
  }

  tieneRolPreceptor(fila: FilaUsuario): boolean {
    return fila.roles.some(r => r.nombre === 'Preceptor');
  }

  rolesAsignables(fila: FilaUsuario): Rol[] {
    const asignados = new Set(fila.roles.map(r => r.idRol));
    const reales = this.rolesDisponibles.filter(r => !asignados.has(r.idRol));

    // Inyectar "Preceptor Delegado" si tiene entidad Preceptor y aún no es delegado
    if (this.tieneRolPreceptor(fila) && fila.esDelegado === false) {
      return [...reales, ROL_PRECEPTOR_DELEGADO];
    }
    return reales;
  }

  agregarRol(fila: FilaUsuario): void {
    if (!fila.rolParaAgregar || fila.agregando) return;
    const idRol = fila.rolParaAgregar;

    if (idRol === DELEGADO_ID) {
      this.dialog.open(ConfirmDialogComponent, {
        data: {
          titulo: 'Asignar rol',
          mensaje: `¿Asignar el rol "Preceptor Delegado" a ${this.displayNombre(fila)}?`,
          confirmLabel: 'Asignar',
        } satisfies ConfirmData,
        width: '380px',
      }).afterClosed().subscribe(confirmado => {
        if (!confirmado) return;
        fila.agregando = true;
        this.service.actualizarDelegado(fila.idUsuario, true).subscribe({
          next: () => {
            fila.esDelegado = true;
            fila.rolParaAgregar = null;
            fila.agregando = false;
          },
          error: () => {
            fila.agregando = false;
            this.snack.open('No se pudo asignar el rol.', 'Cerrar', { duration: 3000 });
          },
        });
      });
      return;
    }

    const rol = this.rolesDisponibles.find(r => r.idRol === idRol);
    if (!rol) return;

    this.dialog.open(ConfirmDialogComponent, {
      data: {
        titulo: 'Asignar rol',
        mensaje: `¿Asignar el rol "${rol.nombre}" a ${this.displayNombre(fila)}?`,
        confirmLabel: 'Asignar',
      } satisfies ConfirmData,
      width: '380px',
    }).afterClosed().subscribe(confirmado => {
      if (!confirmado) return;
      fila.agregando = true;
      this.service.asignarRol(fila.idUsuario, idRol).subscribe({
        next: () => {
          fila.roles = [...fila.roles, rol].sort((a, b) => a.nombre.localeCompare(b.nombre));
          fila.rolParaAgregar = null;
          fila.agregando = false;
        },
        error: () => {
          fila.agregando = false;
          this.snack.open('No se pudo asignar el rol.', 'Cerrar', { duration: 3000 });
        },
      });
    });
  }

  quitarRol(fila: FilaUsuario, rol: Rol): void {
    if (fila.eliminandoRolId) return;

    this.dialog.open(ConfirmDialogComponent, {
      data: {
        titulo: 'Quitar rol',
        mensaje: `¿Quitar el rol "${rol.nombre}" de ${this.displayNombre(fila)}?`,
        confirmLabel: 'Quitar',
        warn: true,
      } satisfies ConfirmData,
      width: '380px',
    }).afterClosed().subscribe(confirmado => {
      if (!confirmado) return;
      fila.eliminandoRolId = rol.idRol;
      this.service.quitarRol(fila.idUsuario, rol.idRol).subscribe({
        next: () => {
          fila.roles = fila.roles.filter(r => r.idRol !== rol.idRol);
          fila.eliminandoRolId = null;
        },
        error: () => {
          fila.eliminandoRolId = null;
          this.snack.open('No se pudo quitar el rol.', 'Cerrar', { duration: 3000 });
        },
      });
    });
  }

  quitarDelegado(fila: FilaUsuario): void {
    if (fila.actualizandoDelegado) return;

    this.dialog.open(ConfirmDialogComponent, {
      data: {
        titulo: 'Quitar rol',
        mensaje: `¿Quitar el rol "Preceptor Delegado" de ${this.displayNombre(fila)}?`,
        confirmLabel: 'Quitar',
        warn: true,
      } satisfies ConfirmData,
      width: '380px',
    }).afterClosed().subscribe(confirmado => {
      if (!confirmado) return;
      fila.actualizandoDelegado = true;
      this.service.actualizarDelegado(fila.idUsuario, false).subscribe({
        next: () => {
          fila.esDelegado = false;
          fila.actualizandoDelegado = false;
        },
        error: () => {
          fila.actualizandoDelegado = false;
          this.snack.open('No se pudo quitar el rol.', 'Cerrar', { duration: 3000 });
        },
      });
    });
  }

  colorRol(nombre: string): string {
    const mapa: Record<string, string> = {
      'Docente':             'chip-docente',
      'Director':            'chip-director',
      'Secretario':          'chip-secretario',
      'Preceptor':           'chip-preceptor',
      'Preceptor Delegado':  'chip-preceptor-delegado',
      'Administrador':       'chip-admin',
    };
    return mapa[nombre] ?? 'chip-default';
  }

  private toFila(u: UsuarioConRoles): FilaUsuario {
    return {
      idUsuario: u.idUsuario,
      mail: u.mail,
      nombre: u.nombre,
      apellido: u.apellido,
      documento: u.documento,
      esDelegado: u.esDelegado,
      actualizandoDelegado: false,
      roles: [...u.roles].sort((a, b) => a.nombre.localeCompare(b.nombre)),
      rolParaAgregar: null,
      agregando: false,
      eliminandoRolId: null,
    };
  }
}
