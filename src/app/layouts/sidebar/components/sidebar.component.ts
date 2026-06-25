import { Component, DestroyRef, inject } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ScannerUiStateService } from '../../../core/services/scanner-ui-state.service';
import { AuthService } from '../../../features/auth/services/auth.service';
import { trigger, transition, style, animate } from '@angular/animations';
import {
  AppNavItem,
  ASISTENCIA_NAV_ITEMS,
  HOME_NAV_ITEM,
  REPORTES_ESTRATEGICOS_NAV_ITEMS,
  SECONDARY_NAV_ITEMS,
} from '../../../core/navigation/app-navigation.config';
import { UiPlatformService } from '../../../core/services/ui-platform.service';

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
    NgFor,
    NgIf,
    MatIconModule,
    MatRippleModule,
    MatButtonModule,
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
           [routerLink]="homeItem.route"
           routerLinkActive="is-active"
           [routerLinkActiveOptions]="{ exact: homeItem.exact }"
           (click)="closeAsistencia(); closeCuentas()">
          <mat-icon>{{ homeItem.icon }}</mat-icon>
          <span>{{ homeItem.label }}</span>
        </a>

        <!-- Asistencia (padre desplegable) -->
        <button *ngIf="visibleAsistenciaItems.length > 0"
                class="item parent"
                type="button"
                matRipple
                (click)="toggleAsistencia()">
          <mat-icon>how_to_reg</mat-icon>
          <span>Asistencia</span>
          <mat-icon class="chevron" [class.open]="asistenciaOpen">expand_more</mat-icon>
        </button>

        <!-- Submenú asistencia -->
        <div class="submenu" *ngIf="asistenciaOpen && visibleAsistenciaItems.length > 0" @expandCollapse>
          <a class="subitem"
             *ngFor="let item of visibleAsistenciaItems; trackBy: trackByRoute"
             matRipple
             [routerLink]="item.route"
             routerLinkActive="is-active-sub"
             [routerLinkActiveOptions]="{ exact: item.exact }">
            {{ item.label }}
          </a>
        </div>

        <a *ngFor="let item of visibleDesktopSecondaryItems; trackBy: trackByRoute"
           class="item"
           matRipple
           [routerLink]="item.route"
           routerLinkActive="is-active"
           [routerLinkActiveOptions]="{ exact: item.exact }"
           (click)="closeAsistencia(); closeCuentas()">
          <mat-icon>{{ item.icon }}</mat-icon>
          <span>{{ item.label }}</span>
        </a>

        <!-- Reportes Estratégicos (padre desplegable) — solo Equipo Directivo/Admin -->
        <ng-container *ngIf="puedeVerReportesEstrategicos">
          <button class="item parent"
                  type="button"
                  matRipple
                  (click)="toggleReportes()">
            <mat-icon>insights</mat-icon>
            <span>Reportes Estratégicos</span>
            <mat-icon class="chevron" [class.open]="reportesOpen">expand_more</mat-icon>
          </button>

          <div class="submenu" *ngIf="reportesOpen" @expandCollapse>
            <a class="subitem"
               *ngFor="let item of visibleReportesItems; trackBy: trackByRoute"
               matRipple
               [routerLink]="item.route"
               routerLinkActive="is-active-sub"
               [routerLinkActiveOptions]="{ exact: item.exact }">
              {{ item.label }}
            </a>
          </div>
        </ng-container>

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
           [routerLink]="homeItem.route"
           routerLinkActive="is-active"
           [routerLinkActiveOptions]="{ exact: homeItem.exact }"
           (click)="closeMobile()">
          <mat-icon>{{ homeItem.icon }}</mat-icon>
          <span>{{ homeItem.label }}</span>
        </a>

        <!-- Asistencia -->
        <button *ngIf="visibleAsistenciaItems.length > 0"
                class="item parent"
                type="button"
                matRipple
                (click)="toggleAsistencia()">
          <mat-icon>how_to_reg</mat-icon>
          <span>Asistencia</span>
          <mat-icon class="chevron" [class.open]="asistenciaOpen">expand_more</mat-icon>
        </button>

        <div class="submenu" *ngIf="asistenciaOpen && visibleAsistenciaItems.length > 0" @expandCollapse>
          <a class="subitem"
             *ngFor="let item of visibleAsistenciaItems; trackBy: trackByRoute"
             matRipple
             [routerLink]="item.route"
             routerLinkActive="is-active-sub"
             [routerLinkActiveOptions]="{ exact: item.exact }"
             (click)="closeMobile()">
            {{ item.label }}
          </a>
        </div>

        <a *ngFor="let item of visibleMobileSecondaryItems; trackBy: trackByRoute"
           class="item"
           matRipple
           [routerLink]="item.route"
           routerLinkActive="is-active"
           [routerLinkActiveOptions]="{ exact: item.exact }"
           (click)="closeAsistencia(); closeCuentas(); closeMobile()">
          <mat-icon>{{ item.icon }}</mat-icon>
          <span>{{ item.label }}</span>
        </a>

        <!-- Reportes Estratégicos — solo Equipo Directivo/Admin (mobile) -->
        <ng-container *ngIf="puedeVerReportesEstrategicos">
          <button class="item parent"
                  type="button"
                  matRipple
                  (click)="toggleReportes()">
            <mat-icon>insights</mat-icon>
            <span>Reportes Estratégicos</span>
            <mat-icon class="chevron" [class.open]="reportesOpen">expand_more</mat-icon>
          </button>

          <div class="submenu" *ngIf="reportesOpen" @expandCollapse>
            <a class="subitem"
               *ngFor="let item of visibleReportesItems; trackBy: trackByRoute"
               matRipple
               [routerLink]="item.route"
               routerLinkActive="is-active-sub"
               [routerLinkActiveOptions]="{ exact: item.exact }"
               (click)="closeMobile()">
              {{ item.label }}
            </a>
          </div>
        </ng-container>

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
  readonly homeItem = HOME_NAV_ITEM;
  isMobile = false;
  open = false;
  asistenciaOpen = false;
  reportesOpen = false;
  cuentasOpen = false;
  scannerActivo = false;
  visibleAsistenciaItems: AppNavItem[] = [];
  visibleDesktopSecondaryItems: AppNavItem[] = [];
  visibleMobileSecondaryItems: AppNavItem[] = [];
  visibleReportesItems: AppNavItem[] = [];

  readonly puedeGestionarUsuarios: boolean;
  readonly puedeVerReportesEstrategicos: boolean;
  private readonly esAdmin: boolean;
  private readonly usuarioEsPreceptorDelegado: boolean;

  constructor(
    private scannerUiStateService: ScannerUiStateService,
    private authService: AuthService,
    private uiPlatformService: UiPlatformService,
  ) {
    const usuario = authService.obtenerUsuario();
    this.esAdmin = !!usuario?.esAdmin;
    this.usuarioEsPreceptorDelegado = !!usuario?.esPreceptorDelegado;

    this.puedeGestionarUsuarios = authService.tieneRol('Secretario') || this.esAdmin;
    this.puedeVerReportesEstrategicos = authService.tieneRol('Equipo Directivo') || this.esAdmin;
    this.uiPlatformService.isMobile$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(result => {
        this.isMobile = result;
        this.actualizarItemsVisibles();
        if (!this.isMobile) this.open = false;
      });

    this.scannerUiStateService.scannerActive$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(active => {
        this.scannerActivo = active;
        if (active) this.open = false;
      });
  }

  trackByRoute(_: number, item: AppNavItem): string {
    return item.route;
  }

  toggleAsistencia() {
    this.asistenciaOpen = !this.asistenciaOpen;
    if (this.asistenciaOpen) {
      this.cuentasOpen = false;
      this.reportesOpen = false;
    }
  }

  closeAsistencia() {
    this.asistenciaOpen = false;
  }

  toggleReportes() {
    this.reportesOpen = !this.reportesOpen;
    if (this.reportesOpen) {
      this.asistenciaOpen = false;
      this.cuentasOpen = false;
    }
  }

  closeReportes() {
    this.reportesOpen = false;
  }

  toggleCuentas() {
    this.cuentasOpen = !this.cuentasOpen;
    if (this.cuentasOpen) {
      this.asistenciaOpen = false;
      this.reportesOpen = false;
    }
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

  private actualizarItemsVisibles(): void {
    this.visibleAsistenciaItems = ASISTENCIA_NAV_ITEMS.filter(item => this.canShowNavItem(item));
    const visibleSecondaryItems = SECONDARY_NAV_ITEMS.filter(item => this.canShowNavItem(item));
    this.visibleDesktopSecondaryItems = visibleSecondaryItems.filter(item => item.sectionId !== 'perfil');
    this.visibleMobileSecondaryItems = visibleSecondaryItems;
    this.visibleReportesItems = REPORTES_ESTRATEGICOS_NAV_ITEMS.filter(item => this.canShowNavItem(item));
  }

  private canShowNavItem(item: AppNavItem): boolean {
    if (!this.uiPlatformService.canAccessSection(item.sectionId)) {
      return false;
    }

    switch (item.sectionId) {
      case 'asistenciaRapida':
        return this.esAdmin || this.authService.tienePermiso('BUSQUEDA_RAPIDA_RW');
      case 'qrScanner':
        return this.esAdmin || this.authService.tienePermiso('ASISTENCIA_QR_RW');
      case 'asistenciaManual':
        return this.esAdmin || this.authService.tienePermiso('ASISTENCIA_MANUAL_RW');
      case 'parteDiario':
        return this.esAdmin
          || this.authService.tienePermiso('ASISTENCIA_MANUAL_RW')
          || this.authService.tienePermiso('PARTE_DIARIO_R')
          || this.authService.tieneRol('Docente')
          || this.authService.tieneRol('Equipo Directivo');
      case 'reporteAsistencia':
        return this.esAdmin || this.authService.tienePermiso('REPORTES_ASISTENCIA_RW');
      case 'reporteAsistenciaDocente':
        return this.esAdmin || this.authService.tienePermiso('REPORTES_EC_RW');
      case 'credencialesQr':
        return this.esAdmin
          || (this.usuarioEsPreceptorDelegado && this.authService.tienePermiso('CREDENCIALES_QR_RW'));
      case 'fichaAlumno':
        return this.esAdmin || this.authService.tienePermiso('FICHA_ALUMNO_R');
      case 'misEspaciosCurriculares':
        return this.esAdmin || this.authService.tieneRol('Docente');
      case 'reportesEstrategicosAsistencia':
      case 'reportesEstrategicosCalificaciones':
        return this.esAdmin || this.authService.tieneRol('Equipo Directivo');
      case 'perfil':
      case 'home':
        return true;
      default:
        return false;
    }
  }
}
