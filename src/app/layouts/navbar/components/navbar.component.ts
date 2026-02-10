import { Component } from '@angular/core';
import { NgIf } from '@angular/common';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { LayoutModule } from '@angular/cdk/layout';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';

import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SearchBusService } from '../../../core/services/search-bus.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    NgIf,
    LayoutModule,
    ReactiveFormsModule,

    MatToolbarModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatButtonModule
  ],
  template: `
    <div class="navbar">

      <!-- Search -->
      <div class="search-container">
        <div class="search-box">
          <mat-icon>search</mat-icon>

          <input
            type="text"
            placeholder="Buscar..."
            [formControl]="searchCtrl"
          />
        </div>
      </div>

      <!-- Usuario (desktop) -->
      <div class="user-area" *ngIf="!isMobile">
        <span class="username">Preceptor, Daniel</span>

        <button
          mat-icon-button
          class="avatar-btn"
          [matMenuTriggerFor]="userMenu">
          <mat-icon class="avatar">account_circle</mat-icon>
        </button>

        <mat-menu #userMenu="matMenu" xPosition="before">
          <button mat-menu-item>
            <mat-icon>person</mat-icon>
            <span>Cuenta</span>
          </button>

          <button mat-menu-item>
            <mat-icon>logout</mat-icon>
            <span>Cerrar sesión</span>
          </button>
        </mat-menu>
      </div>

    </div>
  `,
  styleUrls: ['../scss/navbar.component.scss'],
})
export class NavbarComponent {
  isMobile = false;

  // ✅ control del input
  searchCtrl = new FormControl<string>('', { nonNullable: true });

  constructor(
    private breakpointObserver: BreakpointObserver,
    private searchBus: SearchBusService
  ) {
    this.breakpointObserver
      .observe([Breakpoints.Handset])
      .subscribe(result => {
        this.isMobile = result.matches;
      });

    // ✅ emitir cada vez que escriben
    this.searchCtrl.valueChanges.subscribe(value => {
      this.searchBus.setQuery(value);
    });
  }
}
