import { Component } from '@angular/core';
import { NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { LayoutModule } from '@angular/cdk/layout';
import { RouterLink, RouterLinkActive } from '@angular/router';

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
           [routerLinkActiveOptions]="{ exact: true }">
          <mat-icon>home</mat-icon>
          <span>Inicio</span>
        </a>

        <!-- Asistencia (padre desplegable) -->
        <button class="item parent"
                type="button"
                matRipple
                (click)="toggleAsistencia()">
          <mat-icon>how_to_reg</mat-icon>
          <span>Asistencia</span>
          <mat-icon class="chevron" [class.open]="asistenciaOpen">expand_more</mat-icon>
        </button>

        <!-- Submenú asistencia -->
        <div class="submenu" *ngIf="asistenciaOpen">
          <a class="subitem"
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

          <a class="subitem"
             matRipple
             routerLink="/asistencia-manual-curso"
             routerLinkActive="is-active-sub"
             [routerLinkActiveOptions]="{ exact: true }">
            Asistencia Manual
          </a>

          <a class="subitem"
             matRipple
             routerLink="/parte-diario-digital"
             routerLinkActive="is-active-sub"
             [routerLinkActiveOptions]="{ exact: true }">
            Parte Diario
          </a>
        </div>

        <!-- Credenciales QR -->
        <a class="item"
           matRipple
           routerLink="/credenciales-qr"
           routerLinkActive="is-active"
           [routerLinkActiveOptions]="{ exact: true }">
          <mat-icon>qr_code</mat-icon>
          <span>Credenciales QR</span>
        </a>

        <!-- Cuenta -->
        <a class="item"
           matRipple
           routerLink="/cuenta"
           routerLinkActive="is-active"
           [routerLinkActiveOptions]="{ exact: true }">
          <mat-icon>person</mat-icon>
          <span>Cuenta</span>
        </a>

      </nav>
    </aside>

    <!-- 📱 Mobile: botón hamburguesa -->
    <button
      *ngIf="isMobile"
      mat-icon-button
      class="mobile-menu-btn"
      (click)="open = true">
      <mat-icon>menu</mat-icon>
    </button>

    <!-- 📱 Mobile: overlay -->
    <div
      class="overlay"
      *ngIf="isMobile && open"
      (click)="open = false">
    </div>

    <!-- 📱 Mobile: panel -->
    <aside class="sidebar mobile" *ngIf="isMobile && open">

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
        <button class="item parent"
                type="button"
                matRipple
                (click)="toggleAsistencia()">
          <mat-icon>how_to_reg</mat-icon>
          <span>Asistencia</span>
          <mat-icon class="chevron" [class.open]="asistenciaOpen">expand_more</mat-icon>
        </button>

        <div class="submenu" *ngIf="asistenciaOpen">
          <a class="subitem"
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

          <a class="subitem"
             matRipple
             routerLink="/asistencia-manual-curso"
             routerLinkActive="is-active-sub"
             [routerLinkActiveOptions]="{ exact: true }"
             (click)="closeMobile()">
            Asistencia Manual
          </a>

          <a class="subitem"
             matRipple
             routerLink="/parte-diario-digital"
             routerLinkActive="is-active-sub"
             [routerLinkActiveOptions]="{ exact: true }"
             (click)="closeMobile()">
            Parte Diario
          </a>
        </div>

        <!-- Credenciales QR -->
        <a class="item"
           matRipple
           routerLink="/credenciales-qr"
           routerLinkActive="is-active"
           [routerLinkActiveOptions]="{ exact: true }"
           (click)="closeMobile()">
          <mat-icon>qr_code</mat-icon>
          <span>Credenciales QR</span>
        </a>

        <!-- Cuenta -->
        <a class="item"
           matRipple
           routerLink="/cuenta"
           routerLinkActive="is-active"
           [routerLinkActiveOptions]="{ exact: true }"
           (click)="closeMobile()">
          <mat-icon>person</mat-icon>
          <span>Cuenta</span>
        </a>

        <!-- Cerrar sesión -->
        <a class="item" matRipple (click)="closeMobile()">
          <mat-icon>logout</mat-icon>
          <span>Cerrar sesión</span>
        </a>

      </nav>
    </aside>
  `,
  styleUrls: ['../scss/sidebar.component.scss'],
})
export class SidebarComponent {
  isMobile = false;
  open = false;
  asistenciaOpen = false;

  get mostrarEscaneoQr(): boolean {
    return this.isMobile;
  }

  constructor(private breakpointObserver: BreakpointObserver) {
    this.breakpointObserver.observe([Breakpoints.Handset]).subscribe(result => {
      this.isMobile = result.matches;
      if (!this.isMobile) this.open = false;
    });
  }

  toggleAsistencia() {
    this.asistenciaOpen = !this.asistenciaOpen;
  }

  closeMobile() {
    if (this.isMobile) this.open = false;
  }
}
