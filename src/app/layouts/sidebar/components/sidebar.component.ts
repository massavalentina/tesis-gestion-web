import { Component } from '@angular/core';
import { NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { LayoutModule } from '@angular/cdk/layout';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    NgIf,
    MatIconModule,
    MatRippleModule,
    MatButtonModule,
    LayoutModule
  
  ],
  template: `
    <!-- 🖥 Desktop: sidebar fija -->
<aside class="sidebar desktop" *ngIf="!isMobile">
  <nav>

    <!-- Logo / Home -->
    <a class="logo-item" matRipple>
    <h2 class="logo-text">LOGO APP</h2>
      <div class="logo-placeholder">
        <!-- opción 1: icono -->
        <mat-icon>school</mat-icon>

        <!-- opción 2 (después): imagen -->
        <!-- <img src="assets/logo.png" alt="Logo" /> -->
      </div>
    </a>

    <a class="item" matRipple>
      <mat-icon>home</mat-icon>
      <span>Inicio</span>
    </a>

    <a class="item" matRipple>
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
    <aside
  class="sidebar mobile"
  *ngIf="isMobile && open">

  <!-- Header mobile -->
  <!-- Header mobile -->
<div class="mobile-header">
  <button
    mat-icon-button
    class="close-btn"
    (click)="open = false">
    <mat-icon>chevron_left</mat-icon>
  </button>
</div>


  <nav>
    <a class="item" matRipple>
      <mat-icon>home</mat-icon>
      <span>Inicio</span>
    </a>

    <a class="item" matRipple>
      <mat-icon>person</mat-icon>
      <span>Cuenta</span>
    </a>

    <a class="item" matRipple>
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

  constructor(private breakpointObserver: BreakpointObserver) {
    this.breakpointObserver
      .observe([Breakpoints.Handset])
      .subscribe(result => {
        this.isMobile = result.matches;

        // Si pasa a desktop, cerramos el menú mobile
        if (!this.isMobile) {
          this.open = false;
        }
      });
  }
}


