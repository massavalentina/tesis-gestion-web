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
import { forkJoin, of, switchMap } from 'rxjs';
import { GestionUsuariosService } from '../../services/gestion-usuarios.service';
import { GestionRolesService } from '../../../gestion-roles/services/gestion-roles.service';
import { AsignacionService } from '../../services/asignacion.service';
import { Usuario } from '../../models/usuario.model';
import { DocenteECActivo, DocenteECHistorial, PreceptorCursoActivo, PreceptorCursoHistorial } from '../../models/asignacion.model';
import { Rol } from '../../../gestion-roles/models/rol.model';
import {
  ConfirmarAccionUsuarioDialogComponent,
  ConfirmarAccionUsuarioData,
} from '../confirmar-accion-usuario-dialog/confirmar-accion-usuario-dialog.component';
import {
  AdvertenciaRolDialogComponent,
  AdvertenciaRolData,
} from '../advertencia-rol-dialog/advertencia-rol-dialog.component';
import {
  DesasignarMotivoDialogComponent,
  DesasignarMotivoData,
  DesasignarMotivoResult,
} from '../desasignar-motivo-dialog/desasignar-motivo-dialog.component';
import {
  AsignarECDialogComponent,
  AsignarECData,
  AsignarECResult,
} from '../asignar-ec-dialog/asignar-ec-dialog.component';
import {
  AsignarCursoDialogComponent,
  AsignarCursoData,
  AsignarCursoResult,
} from '../asignar-curso-dialog/asignar-curso-dialog.component';

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

  // Asignaciones
  ecActivos    = signal<DocenteECActivo[]>([]);
  ecHistorial  = signal<DocenteECHistorial[]>([]);
  cursoActivos = signal<PreceptorCursoActivo[]>([]);
  cursoHistorial = signal<PreceptorCursoHistorial[]>([]);
  cargandoAsignaciones = signal(false);
  asignando          = signal(false);
  desasignando       = signal(false);
  desasignandoECId   = signal<string | null>(null);
  desasignandoCursoId = signal<string | null>(null);
  mostrarHistorialEC     = signal(false);
  mostrarHistorialCurso  = signal(false);

  private id!: string;

  constructor(
    private route:            ActivatedRoute,
    private router:           Router,
    private service:          GestionUsuariosService,
    private rolesService:     GestionRolesService,
    private asignacionService: AsignacionService,
    private dialog:           MatDialog,
    private snack:            MatSnackBar,
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
      next: u => {
        this.usuario.set(u);
        this.cargando.set(false);
        this.cargarAsignaciones(u);
      },
      error: () => { this.error.set('No se pudo cargar el usuario.'); this.cargando.set(false); },
    });
  }

  private cargarAsignaciones(u: Usuario): void {
    const esDocente   = u.roles.some(r => r.toLowerCase() === 'docente');
    const esPreceptor = u.roles.some(r => r.toLowerCase() === 'preceptor');
    if (!esDocente && !esPreceptor) return;

    this.cargandoAsignaciones.set(true);
    const docente$   = esDocente && u.idDocente
      ? this.asignacionService.getECsDocente(u.idDocente)
      : of(null);
    const preceptor$ = esPreceptor && u.idPreceptor
      ? this.asignacionService.getCursosPreceptor(u.idPreceptor)
      : of(null);

    forkJoin([docente$, preceptor$]).subscribe({
      next: ([ecs, cursos]) => {
        this.ecActivos.set(ecs?.activos ?? []);
        this.ecHistorial.set(ecs?.historial ?? []);
        this.cursoActivos.set(cursos?.activos ?? []);
        this.cursoHistorial.set(cursos?.historial ?? []);
        this.cargandoAsignaciones.set(false);
      },
      error: () => this.cargandoAsignaciones.set(false),
    });
  }

  get u(): Usuario { return this.usuario()!; }

  get esDelegado(): boolean {
    return this.usuario()?.esDelegado === true;
  }

  get tieneRolPreceptor(): boolean {
    return this.usuario()?.roles.some(r => r.toLowerCase() === 'preceptor') ?? false;
  }

  get tieneRolDocente(): boolean {
    return this.usuario()?.roles.some(r => r.toLowerCase() === 'docente') ?? false;
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
      conImplicancia ? this.mostrarAdvertenciaDesactivar(u) : this.ejecutarDesactivar(null);
    });
  }

  private mostrarAdvertenciaDesactivar(u: Usuario): void {
    const data: AdvertenciaRolData = {
      esDocente:   u.roles.some(r => r.toLowerCase() === 'docente'),
      esPreceptor: u.roles.some(r => r.toLowerCase() === 'preceptor'),
    };
    this.dialog.open(AdvertenciaRolDialogComponent, {
      width: '460px', disableClose: true, data,
    }).afterClosed().subscribe((ok: boolean) => {
      if (!ok) return;

      const activos = [
        ...this.ecActivos().map(ec => ({ label: ec.nombreCurricula, detalle: ec.codigoCurso })),
        ...this.cursoActivos().map(c => ({ label: `${c.anio}° ${c.division}`, detalle: c.codigoCurso })),
      ];

      if (activos.length === 0) {
        this.ejecutarDesactivar(null);
        return;
      }

      const tipo = u.roles.some(r => r.toLowerCase() === 'docente') ? 'docente' : 'preceptor';
      this.dialog.open(DesasignarMotivoDialogComponent, {
        width: '480px', disableClose: true,
        data: { tipo, items: activos } satisfies DesasignarMotivoData,
      }).afterClosed().subscribe((res: DesasignarMotivoResult | null) => {
        if (!res) return;
        this.desasignarYDesactivar(u, res.motivo);
      });
    });
  }

  private desasignarYDesactivar(u: Usuario, motivo: string): void {
    this.accionando.set(true);
    const esDocente   = u.roles.some(r => r.toLowerCase() === 'docente');
    const esPreceptor = u.roles.some(r => r.toLowerCase() === 'preceptor');

    const desasignar$ = forkJoin([
      esDocente && u.idDocente
        ? this.asignacionService.desasignarECs(u.idDocente, motivo)
        : of(undefined),
      esPreceptor && u.idPreceptor
        ? this.asignacionService.desasignarCursos(u.idPreceptor, motivo)
        : of(undefined),
    ]);

    desasignar$.pipe(
      switchMap(() => this.service.desactivar(this.id)),
    ).subscribe({
      next:  () => { this.accionando.set(false); this.cargar(); },
      error: () => { this.accionando.set(false); this.errorAccion.set('No se pudo desactivar el usuario.'); },
    });
  }

  private ejecutarDesactivar(motivo: string | null): void {
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
    const esRolConAsignaciones = ['docente', 'preceptor'].includes(rol.nombre.toLowerCase());

    if (esRolConAsignaciones) {
      const esDocente = rol.nombre.toLowerCase() === 'docente';
      const activos = esDocente
        ? this.ecActivos().map(ec => ({ label: ec.nombreCurricula, detalle: ec.codigoCurso }))
        : this.cursoActivos().map(c => ({ label: `${c.anio}° ${c.division}`, detalle: c.codigoCurso }));

      if (activos.length > 0) {
        this.dialog.open(DesasignarMotivoDialogComponent, {
          width: '480px', disableClose: true,
          data: { tipo: esDocente ? 'docente' : 'preceptor', items: activos } satisfies DesasignarMotivoData,
        }).afterClosed().subscribe((res: DesasignarMotivoResult | null) => {
          if (!res) return;
          this.desasignarYQuitarRol(u, rol, esDocente, res.motivo);
        });
        return;
      }
    }

    this.dialog.open(ConfirmRolDialogComponent, {
      data: { titulo: 'Quitar rol', mensaje: `¿Quitar "${rol.nombre}" de ${nombre}?`, confirmLabel: 'Quitar', warn: true } satisfies ConfirmData,
      width: '380px',
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.ejecutarQuitarRol(rol.idRol);
    });
  }

  private desasignarYQuitarRol(u: Usuario, rol: Rol, esDocente: boolean, motivo: string): void {
    this.eliminandoRolId.set(rol.idRol);
    const desasignar$ = esDocente && u.idDocente
      ? this.asignacionService.desasignarECs(u.idDocente, motivo)
      : u.idPreceptor
        ? this.asignacionService.desasignarCursos(u.idPreceptor, motivo)
        : of(undefined);

    desasignar$.pipe(
      switchMap(() => this.rolesService.quitarRol(this.id, rol.idRol)),
    ).subscribe({
      next:  () => { this.eliminandoRolId.set(null); this.cargar(); this.snack.open('Rol eliminado con éxito.', 'Cerrar', { duration: 3000 }); },
      error: () => { this.eliminandoRolId.set(null); this.snack.open('No se pudo quitar el rol.', 'Cerrar', { duration: 3000 }); },
    });
  }

  private ejecutarQuitarRol(idRol: string): void {
    this.eliminandoRolId.set(idRol);
    this.rolesService.quitarRol(this.id, idRol).subscribe({
      next:  () => { this.eliminandoRolId.set(null); this.cargar(); this.snack.open('Rol eliminado con éxito.', 'Cerrar', { duration: 3000 }); },
      error: () => { this.eliminandoRolId.set(null); this.snack.open('No se pudo quitar el rol.', 'Cerrar', { duration: 3000 }); },
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

  // ── Asignaciones ──────────────────────────────────────────────────────
  abrirAsignarEC(): void {
    const u = this.usuario()!;
    if (!u.idDocente) return;
    this.dialog.open(AsignarECDialogComponent, {
      width: '500px', disableClose: true,
      data: { idDocente: u.idDocente, nombreDocente: `${u.apellido}, ${u.nombre}` } satisfies AsignarECData,
    }).afterClosed().subscribe((res: AsignarECResult | null) => {
      if (!res) return;
      this.asignando.set(true);
      this.asignacionService.asignarEC(u.idDocente!, res.idEC).subscribe({
        next:  () => { this.asignando.set(false); this.cargar(); this.snack.open('Espacio curricular asignado.', 'Cerrar', { duration: 3000 }); },
        error: (err) => {
          this.asignando.set(false);
          const msg = err?.error?.error ?? 'No se pudo asignar el espacio curricular.';
          this.snack.open(msg, 'Cerrar', { duration: 4000 });
        },
      });
    });
  }

  abrirDesasignarECs(): void {
    const u = this.usuario()!;
    if (!u.idDocente || this.ecActivos().length === 0) return;
    const items = this.ecActivos().map(ec => ({ label: ec.nombreCurricula, detalle: ec.codigoCurso }));
    this.dialog.open(DesasignarMotivoDialogComponent, {
      width: '480px', disableClose: true,
      data: { tipo: 'docente', items } satisfies DesasignarMotivoData,
    }).afterClosed().subscribe((res: DesasignarMotivoResult | null) => {
      if (!res) return;
      this.desasignando.set(true);
      this.asignacionService.desasignarECs(u.idDocente!, res.motivo).subscribe({
        next:  () => { this.desasignando.set(false); this.cargar(); this.snack.open('Desasignación realizada.', 'Cerrar', { duration: 3000 }); },
        error: () => { this.desasignando.set(false); this.snack.open('No se pudo desasignar.', 'Cerrar', { duration: 3000 }); },
      });
    });
  }

  abrirAsignarCurso(): void {
    const u = this.usuario()!;
    if (!u.idPreceptor) return;
    this.dialog.open(AsignarCursoDialogComponent, {
      width: '500px', disableClose: true,
      data: { idPreceptor: u.idPreceptor, nombrePreceptor: `${u.apellido}, ${u.nombre}` } satisfies AsignarCursoData,
    }).afterClosed().subscribe((res: AsignarCursoResult | null) => {
      if (!res) return;
      this.asignando.set(true);
      this.asignacionService.asignarCurso(u.idPreceptor!, res.idCurso).subscribe({
        next:  () => { this.asignando.set(false); this.cargar(); this.snack.open('Curso asignado.', 'Cerrar', { duration: 3000 }); },
        error: (err) => {
          this.asignando.set(false);
          const msg = err?.error?.error ?? 'No se pudo asignar el curso.';
          this.snack.open(msg, 'Cerrar', { duration: 4000 });
        },
      });
    });
  }

  abrirDesasignarCursos(): void {
    const u = this.usuario()!;
    if (!u.idPreceptor || this.cursoActivos().length === 0) return;
    const items = this.cursoActivos().map(c => ({ label: `${c.anio}° ${c.division}`, detalle: c.codigoCurso }));
    this.dialog.open(DesasignarMotivoDialogComponent, {
      width: '480px', disableClose: true,
      data: { tipo: 'preceptor', items } satisfies DesasignarMotivoData,
    }).afterClosed().subscribe((res: DesasignarMotivoResult | null) => {
      if (!res) return;
      this.desasignando.set(true);
      this.asignacionService.desasignarCursos(u.idPreceptor!, res.motivo).subscribe({
        next:  () => { this.desasignando.set(false); this.cargar(); this.snack.open('Desasignación realizada.', 'Cerrar', { duration: 3000 }); },
        error: () => { this.desasignando.set(false); this.snack.open('No se pudo desasignar.', 'Cerrar', { duration: 3000 }); },
      });
    });
  }

  toggleHistorialEC(): void   { this.mostrarHistorialEC.update(v => !v); }
  toggleHistorialCurso(): void { this.mostrarHistorialCurso.update(v => !v); }

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

  formatHorario(h: { diaSemana: string; horarioEntrada: string; horarioSalida: string }): string {
    const dias: Record<string, string> = {
      monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles',
      thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo',
    };
    const dia = dias[h.diaSemana.toLowerCase()] ?? h.diaSemana;
    return `${dia} ${h.horarioEntrada}–${h.horarioSalida}`;
  }

  desasignarECIndividual(ec: DocenteECActivo): void {
    const u = this.usuario()!;
    if (!u.idDocente) return;
    this.dialog.open(DesasignarMotivoDialogComponent, {
      width: '480px', disableClose: true,
      data: { tipo: 'docente', items: [{ label: ec.nombreCurricula, detalle: ec.codigoCurso }] } satisfies DesasignarMotivoData,
    }).afterClosed().subscribe((res: DesasignarMotivoResult | null) => {
      if (!res) return;
      this.desasignandoECId.set(ec.idDocenteEC);
      this.asignacionService.desasignarEC(u.idDocente!, ec.idDocenteEC, res.motivo).subscribe({
        next:  () => { this.desasignandoECId.set(null); this.cargar(); this.snack.open('Espacio curricular desasignado.', 'Cerrar', { duration: 3000 }); },
        error: () => { this.desasignandoECId.set(null); this.snack.open('No se pudo desasignar.', 'Cerrar', { duration: 3000 }); },
      });
    });
  }

  desasignarCursoIndividual(c: PreceptorCursoActivo): void {
    const u = this.usuario()!;
    if (!u.idPreceptor) return;
    this.dialog.open(DesasignarMotivoDialogComponent, {
      width: '480px', disableClose: true,
      data: { tipo: 'preceptor', items: [{ label: `${c.anio}° ${c.division}`, detalle: c.codigoCurso }] } satisfies DesasignarMotivoData,
    }).afterClosed().subscribe((res: DesasignarMotivoResult | null) => {
      if (!res) return;
      this.desasignandoCursoId.set(c.idPreceptorCurso);
      this.asignacionService.desasignarCurso(u.idPreceptor!, c.idPreceptorCurso, res.motivo).subscribe({
        next:  () => { this.desasignandoCursoId.set(null); this.cargar(); this.snack.open('Curso desasignado.', 'Cerrar', { duration: 3000 }); },
        error: () => { this.desasignandoCursoId.set(null); this.snack.open('No se pudo desasignar.', 'Cerrar', { duration: 3000 }); },
      });
    });
  }
}
