import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { GestionUsuariosService } from '../../services/gestion-usuarios.service';
import { Usuario } from '../../models/usuario.model';
import { NuevoUsuarioDialogComponent } from '../nuevo-usuario-dialog/nuevo-usuario-dialog.component';

@Component({
  selector: 'app-gestion-usuarios',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSelectModule,
    MatFormFieldModule,
  ],
  templateUrl: './gestion-usuarios.component.html',
  styleUrl:    './gestion-usuarios.component.css',
})
export class GestionUsuariosComponent implements OnInit {
  @ViewChild(MatSort) set matSort(sort: MatSort) {
    if (sort) this.dataSource.sort = sort;
  }

  readonly columnas = ['nombre', 'email', 'documento', 'roles', 'estado'];
  dataSource = new MatTableDataSource<Usuario>([]);

  cargando     = signal(true);
  error        = signal('');
  filtroEstado = signal<'activo' | 'inactivo' | null>(null);
  filtroRol    = signal<string | null>(null);

  constructor(
    private service: GestionUsuariosService,
    private dialog:  MatDialog,
    private router:  Router,
  ) {}

  ngOnInit(): void {
    this.dataSource.sortingDataAccessor = (u, col) => {
      switch (col) {
        case 'nombre':    return `${u.apellido} ${u.nombre}`;
        case 'email':     return u.email;
        case 'documento': return u.documento;
        case 'estado':    return u.activo ? 'Activo' : 'Inactivo';
        default: return '';
      }
    };
    this.dataSource.filterPredicate = (u: Usuario, filterJson: string) => {
      if (!filterJson) return true;
      const { estado, rol } = JSON.parse(filterJson) as { estado: string | null; rol: string | null };
      if (estado === 'activo'   && !u.activo) return false;
      if (estado === 'inactivo' &&  u.activo) return false;
      if (rol) {
        if (rol === 'sin-rol')            return u.roles.length === 0 && !u.esDelegado;
        if (rol === 'preceptor-delegado') return u.esDelegado === true;
        return u.roles.some(r => r.toLowerCase() === rol.toLowerCase());
      }
      return true;
    };
    this.cargar();
  }

  // ── Contadores (sobre datos completos, no filtrados) ────────────────────────
  get cantTotal()    { return this.dataSource.data.length; }
  get cantActivos()  { return this.dataSource.data.filter(u =>  u.activo).length; }
  get cantInactivos(){ return this.dataSource.data.filter(u => !u.activo).length; }
  get cantSinRol()   { return this.dataSource.data.filter(u => u.roles.length === 0 && !u.esDelegado).length; }
  get cantDelegados(){ return this.dataSource.data.filter(u => u.esDelegado === true).length; }

  cantRol(rol: string): number {
    return this.dataSource.data.filter(u =>
      u.roles.some(r => r.toLowerCase() === rol.toLowerCase())
    ).length;
  }

  // ── Prioridad de rol para ordenamiento ──────────────────────────────────────
  private rolPrioridad(u: Usuario): number {
    if (u.esDelegado) return 3;
    const roles = u.roles.map(r => r.toLowerCase());
    if (roles.includes('admin'))            return 0;
    if (roles.includes('equipo directivo')) return 1;
    if (roles.includes('secretario'))       return 2;
    if (roles.includes('preceptor'))        return 4;
    if (roles.includes('docente'))          return 5;
    return 6;
  }

  private sortUsuarios(usuarios: Usuario[]): Usuario[] {
    return [...usuarios].sort((a, b) => {
      if (a.activo !== b.activo) return a.activo ? -1 : 1;
      return this.rolPrioridad(a) - this.rolPrioridad(b);
    });
  }

  // ── Filtros ─────────────────────────────────────────────────────────────────
  toggleFiltroEstado(estado: 'activo' | 'inactivo'): void {
    this.filtroEstado.update(v => v === estado ? null : estado);
    this.aplicarFiltro();
  }

  setFiltroRol(rol: string | null): void {
    this.filtroRol.set(rol);
    this.aplicarFiltro();
  }

  private aplicarFiltro(): void {
    const estado = this.filtroEstado();
    const rol    = this.filtroRol();
    this.dataSource.filter = (!estado && !rol)
      ? ''
      : JSON.stringify({ estado, rol });
  }

  // ── Acciones ────────────────────────────────────────────────────────────────
  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.service.getAll().subscribe({
      next:  (usuarios) => { this.dataSource.data = this.sortUsuarios(usuarios); this.cargando.set(false); },
      error: ()         => { this.error.set('No se pudieron cargar los usuarios.'); this.cargando.set(false); },
    });
  }

  abrirNuevo(): void {
    const ref = this.dialog.open(NuevoUsuarioDialogComponent, {
      width: '480px',
      disableClose: true,
    });
    ref.afterClosed().subscribe((creado: Usuario | null) => {
      if (creado) this.cargar();
    });
  }

  navegarAFicha(id: string): void {
    this.router.navigate(['/gestion-usuarios', id]);
  }

  rolColor(rol: string): string {
    switch (rol.toLowerCase()) {
      case 'docente':             return 'chip-celeste';
      case 'preceptor':           return 'chip-violeta';
      case 'preceptor delegado':  return 'chip-delegado';
      case 'equipo directivo':    return 'chip-naranja';
      case 'admin':               return 'chip-rojo';
      case 'secretario':          return 'chip-teal';
      default:                    return 'chip-gris';
    }
  }
}
