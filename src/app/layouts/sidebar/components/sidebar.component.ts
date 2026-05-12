import { Component, DestroyRef, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { LayoutModule } from '@angular/cdk/layout';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ScannerUiStateService } from '../../../core/services/scanner-ui-state.service';
import { AuthService } from '../../../features/auth/services/auth.service';
import { trigger, transition, style, animate } from '@angular/animations';

const SLIDE = trigger('slide', [
  transition(':enter', [
    style({ transform: 'translateX(-100%)' }),
    animate('280ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: 'translateX(0)' })),
  ]),
  transition(':leave', [
    animate('280ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: 'translateX(-100%)' })),
  ]),
]);

const FADE = trigger('fade', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('200ms ease', style({ opacity: 1 })),
  ]),
  transition(':leave', [
    animate('200ms ease', style({ opacity: 0 })),
  ]),
]);

const EXPAND_COLLAPSE = trigger('expandCollapse', [
  transition(':enter', [
    style({ height: '0', overflow: 'hidden', opacity: 0 }),
    animate('220ms cubic-bezier(0.4, 0, 0.2, 1)', style({ height: '*', opacity: 1 })),
  ]),
  transition(':leave', [
    style({ overflow: 'hidden' }),
    animate('180ms cubic-bezier(0.4, 0, 0.2, 1)', style({ height: '0', opacity: 0 })),
  ]),
]);

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    NgIf,
    MatIconModule,
    MatRippleModule,
    MatButtonModule,
    LayoutModule,
    RouterLink,
    RouterLinkActive,
  ],
  animations: [SLIDE, FADE, EXPAND_COLLAPSE],
  template: `
    <!-- 🖥 Desktop: sidebar fija -->
    <aside class="sidebar desktop" *ngIf="!isMobile">
      <nav>

        <!-- Logo / Home -->
        <a class="logo-item" matRipple routerLink="/">
          <img src="logo.jpg" alt="Logo" class="logo-img" />
        </a>

        <!-- Inicio -->
        <a class="item"
           matRipple
           routerLink="/"
           routerLinkActive="is-active"
           [routerLinkActiveOptions]="{ exact: true }"
           (click)="closeAsistencia(); closeCuentas()">
          <mat-icon>home</mat-icon>
          <span>Inicio</span>
        </a>

        <!-- Asistencia (padre desplegable) -->
        <button *ngIf="mostrarSeccionAsistencia"
                class="item parent"
                type="button"
                matRipple
                (click)="toggleAsistencia()">
          <mat-icon>how_to_reg</mat-icon>
          <span>Asistencia</span>
          <mat-icon class="chevron" [class.open]="asistenciaOpen">expand_more</mat-icon>
        </button>

        <!-- Submenú asistencia -->
        <div class="submenu" *ngIf="asistenciaOpen && mostrarSeccionAsistencia" @expandCollapse>
          <a *ngIf="mostrarBusquedaRapida"
             class="subitem"
             matRipple
             routerLink="/asistencia-rapida"
             routerLinkActive="is-active-sub"
             [routerLinkActiveOptions]="{ exact: true }">
            Búsqueda Rápida
          </a>

          <a class="subitem"
             *ngIf="mostrarEscaneoQr"
             matRipple
             routerLink="/attendance/scan"
             routerLinkActive="is-active-sub"
             [routerLinkActiveOptions]="{ exact: true }">
            Escáner QR
          </a>

          <a *ngIf="mostrarAsistenciaManual"
             class="subitem"
             matRipple
             routerLink="/asistencia-manual-curso"
             routerLinkActive="is-active-sub"
             [routerLinkActiveOptions]="{ exact: true }">
            Asistencia Manual
          </a>

          <a *ngIf="mostrarParteDiario"
             class="subitem"
             matRipple
             routerLink="/parte-diario-digital"
             routerLinkActive="is-active-sub"
             [routerLinkActiveOptions]="{ exact: true }">
            Parte Diario
          </a>

          <a *ngIf="mostrarAsistenciaGeneral"
             class="subitem"
             matRipple
             routerLink="/reporte-asistencia"
             routerLinkActive="is-active-sub"
             [routerLinkActiveOptions]="{ exact: false }">
            Asistencia General
          </a>

          <a *ngIf="mostrarAsistenciaPorEC"
             class="subitem"
             matRipple
             routerLink="/reporte-asistencia-docente"
             routerLinkActive="is-active-sub"
             [routerLinkActiveOptions]="{ exact: false }">
            Asistencia por EC
          </a>
        </div>

        <!-- Credenciales QR -->
        <a *ngIf="mostrarCredencialesQr"
           class="item"
           matRipple
           routerLink="/credenciales-qr"
           routerLinkActive="is-active"
           [routerLinkActiveOptions]="{ exact: true }"
           (click)="closeAsistencia(); closeCuentas()">
          <mat-icon>qr_code</mat-icon>
          <span>Credenciales QR</span>
        </a>

        <!-- Ficha de Alumno -->
        <a *ngIf="mostrarFichaAlumno"
           class="item"
           matRipple
           routerLink="/ficha-alumno"
           routerLinkActive="is-active"
           [routerLinkActiveOptions]="{ exact: true }"
           (click)="closeAsistencia(); closeCuentas()">
          <mat-icon>assignment_ind</mat-icon>
          <span>Ficha de Alumno</span>
        </a>

        <!-- Cuentas (padre desplegable) — solo Secretario/Admin -->
        <ng-container *ngIf="puedeGestionarUsuarios">
          <button class="item parent"
                  type="button"
                  matRipple
                  (click)="toggleCuentas()">
            <mat-icon>manage_accounts</mat-icon>
            <span>Cuentas</span>
            <mat-icon class="chevron" [class.open]="cuentasOpen">expand_more</mat-icon>
          </button>

          <div class="submenu" *ngIf="cuentasOpen" @expandCollapse>
            <a class="subitem"
               matRipple
               routerLink="/gestion-usuarios"
               routerLinkActive="is-active-sub"
               [routerLinkActiveOptions]="{ exact: true }">
              Usuarios
            </a>
          </div>
        </ng-container>

      </nav>
    </aside>

    <!-- 📱 Mobile: botón hamburguesa -->
    <button
      *ngIf="isMobile && !scannerActivo"
      class="mobile-menu-btn"
      type="button"
      (click)="open = true"
      aria-label="Abrir menú">
      <mat-icon>menu</mat-icon>
    </button>

    <!-- 📱 Mobile: overlay -->
    <div
      class="overlay"
      *ngIf="isMobile && open && !scannerActivo"
      @fade
      (click)="open = false">
    </div>

    <!-- 📱 Mobile: panel -->
    <aside class="sidebar mobile" *ngIf="isMobile && open && !scannerActivo" @slide>

      <div class="mobile-header">
        <button mat-icon-button class="close-btn" (click)="open = false">
          <mat-icon>chevron_left</mat-icon>
        </button>
      </div>

      <nav>

        <!-- Inicio -->
        <a class="item"
           matRipple
           routerLink="/"
           routerLinkActive="is-active"
           [routerLinkActiveOptions]="{ exact: true }"
           (click)="closeMobile()">
          <mat-icon>home</mat-icon>
          <span>Inicio</span>
        </a>

        <!-- Asistencia -->
        <button *ngIf="mostrarSeccionAsistencia"
                class="item parent"
                type="button"
                matRipple
                (click)="toggleAsistencia()">
          <mat-icon>how_to_reg</mat-icon>
          <span>Asistencia</span>
          <mat-icon class="chevron" [class.open]="asistenciaOpen">expand_more</mat-icon>
        </button>

        <div class="submenu" *ngIf="asistenciaOpen && mostrarSeccionAsistencia" @expandCollapse>
          <a *ngIf="mostrarBusquedaRapida"
             class="subitem"
             matRipple
             routerLink="/asistencia-rapida"
             routerLinkActive="is-active-sub"
             [routerLinkActiveOptions]="{ exact: true }"
             (click)="closeMobile()">
            Búsqueda Rápida
          </a>

          <a class="subitem"
             *ngIf="mostrarEscaneoQr"
             matRipple
             routerLink="/attendance/scan"
             routerLinkActive="is-active-sub"
             [routerLinkActiveOptions]="{ exact: true }"
             (click)="closeMobile()">
            Escáner QR
          </a>

          <a *ngIf="mostrarAsistenciaManual"
             class="subitem"
             matRipple
             routerLink="/asistencia-manual-curso"
             routerLinkActive="is-active-sub"
             [routerLinkActiveOptions]="{ exact: true }"
             (click)="closeMobile()">
            Asistencia Manual
          </a>

          <a *ngIf="mostrarParteDiario"
             class="subitem"
             matRipple
             routerLink="/parte-diario-digital"
             routerLinkActive="is-active-sub"
             [routerLinkActiveOptions]="{ exact: true }"
             (click)="closeMobile()">
            Parte Diario
          </a>

          <a *ngIf="mostrarAsistenciaGeneral"
             class="subitem"
             matRipple
             routerLink="/reporte-asistencia"
             routerLinkActive="is-active-sub"
             [routerLinkActiveOptions]="{ exact: false }"
             (click)="closeMobile()">
            Asistencia General
          </a>

          <a *ngIf="mostrarAsistenciaPorEC"
             class="subitem"
             matRipple
             routerLink="/reporte-asistencia-docente"
             routerLinkActive="is-active-sub"
             [routerLinkActiveOptions]="{ exact: false }"
             (click)="closeMobile()">
            Asistencia por EC
          </a>
        </div>

        <!-- Credenciales QR -->
        <a *ngIf="mostrarCredencialesQr"
           class="item"
           matRipple
           routerLink="/credenciales-qr"
           routerLinkActive="is-active"
           [routerLinkActiveOptions]="{ exact: true }"
           (click)="closeAsistencia(); closeCuentas(); closeMobile()">
          <mat-icon>qr_code</mat-icon>
          <span>Credenciales QR</span>
        </a>

        <!-- Ficha de Alumno -->
        <a *ngIf="mostrarFichaAlumno"
           class="item"
           matRipple
           routerLink="/ficha-alumno"
           routerLinkActive="is-active"
           [routerLinkActiveOptions]="{ exact: true }"
           (click)="closeAsistencia(); closeCuentas(); closeMobile()">
          <mat-icon>assignment_ind</mat-icon>
          <span>Ficha de Alumno</span>
        </a>

        <!-- Cuentas — solo Secretario/Admin -->
        <ng-container *ngIf="puedeGestionarUsuarios">
          <button class="item parent"
                  type="button"
                  matRipple
                  (click)="toggleCuentas()">
            <mat-icon>manage_accounts</mat-icon>
            <span>Cuentas</span>
            <mat-icon class="chevron" [class.open]="cuentasOpen">expand_more</mat-icon>
          </button>

          <div class="submenu" *ngIf="cuentasOpen" @expandCollapse>
            <a class="subitem"
               matRipple
               routerLink="/gestion-usuarios"
               routerLinkActive="is-active-sub"
               [routerLinkActiveOptions]="{ exact: true }"
               (click)="closeMobile()">
              Usuarios
            </a>
          </div>
        </ng-container>

        <!-- Mi perfil -->
        <a class="item"
           matRipple
           routerLink="/perfil"
           routerLinkActive="is-active"
           [routerLinkActiveOptions]="{ exact: true }"
           (click)="closeMobile()">
          <mat-icon>account_circle</mat-icon>
          <span>Mi perfil</span>
        </a>

        <!-- Cerrar sesión -->
        <a class="item" matRipple (click)="cerrarSesion()">
          <mat-icon>logout</mat-icon>
          <span>Cerrar sesión</span>
        </a>

      </nav>
    </aside>
  `,
  styleUrls: ['../scss/sidebar.component.scss'],
})
export class SidebarComponent {
  private readonly destroyRef = inject(DestroyRef);
  isMobile = false;
  open = false;
  asistenciaOpen = false;
  cuentasOpen = false;
  scannerActivo = false;

  readonly puedeGestionarUsuarios: boolean;
  readonly mostrarBusquedaRapida: boolean;
  readonly mostrarAsistenciaManual: boolean;
  readonly mostrarParteDiario: boolean;
  readonly mostrarAsistenciaGeneral: boolean;
  readonly mostrarAsistenciaPorEC: boolean;
  readonly mostrarCredencialesQr: boolean;
  readonly mostrarFichaAlumno: boolean;
  readonly mostrarSeccionAsistencia: boolean;
  private readonly tienePermisoEscaneoQr: boolean;

  get mostrarEscaneoQr(): boolean {
    return this.isMobile && this.tienePermisoEscaneoQr;
  }

  constructor(
    private breakpointObserver: BreakpointObserver,
    private scannerUiStateService: ScannerUiStateService,
    private authService: AuthService,
  ) {
    const usuario = authService.obtenerUsuario();
    const esAdmin = !!usuario?.esAdmin;

    this.puedeGestionarUsuarios = authService.tieneRol('Secretario') || esAdmin;
    this.mostrarBusquedaRapida    = esAdmin || authService.tienePermiso('BUSQUEDA_RAPIDA_RW');
    this.mostrarAsistenciaManual  = esAdmin || authService.tienePermiso('ASISTENCIA_MANUAL_RW');
    this.mostrarParteDiario       = esAdmin || authService.tienePermiso('ASISTENCIA_MANUAL_RW') || authService.tienePermiso('PARTE_DIARIO_R') || authService.tieneRol('Docente') || authService.tieneRol('Equipo Directivo');
    this.mostrarAsistenciaGeneral = esAdmin || authService.tienePermiso('REPORTES_ASISTENCIA_RW');
    this.mostrarAsistenciaPorEC   = esAdmin || authService.tienePermiso('REPORTES_ASISTENCIA_RW');
    this.tienePermisoEscaneoQr    = esAdmin || authService.tienePermiso('ASISTENCIA_QR_RW');
    this.mostrarCredencialesQr    = esAdmin || (!!usuario?.esPreceptorDelegado && authService.tienePermiso('CREDENCIALES_QR_RW'));
    this.mostrarFichaAlumno       = esAdmin || authService.tienePermiso('FICHA_ALUMNO_R');
    this.mostrarSeccionAsistencia = this.mostrarBusquedaRapida || this.mostrarAsistenciaManual || this.mostrarParteDiario || this.mostrarAsistenciaGeneral || this.mostrarAsistenciaPorEC || this.tienePermisoEscaneoQr;
    this.breakpointObserver.observe([Breakpoints.Handset])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(result => {
        this.isMobile = result.matches;
        if (!this.isMobile) this.open = false;
      });

    this.scannerUiStateService.scannerActive$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(active => {
        this.scannerActivo = active;
        if (active) this.open = false;
      });
  }

  toggleAsistencia() {
    this.asistenciaOpen = !this.asistenciaOpen;
    if (this.asistenciaOpen) this.cuentasOpen = false;
  }

  closeAsistencia() {
    this.asistenciaOpen = false;
  }

  toggleCuentas() {
    this.cuentasOpen = !this.cuentasOpen;
    if (this.cuentasOpen) this.asistenciaOpen = false;
  }

  closeCuentas() {
    this.cuentasOpen = false;
  }

  closeMobile() {
    if (this.isMobile) this.open = false;
  }

  cerrarSesion(): void {
    this.closeMobile();
    this.authService.logout();
  }
}
