import { Component, ElementRef, HostListener, OnDestroy } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { LayoutModule } from '@angular/cdk/layout';
import { Router } from '@angular/router';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';

import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, switchMap, tap, catchError } from 'rxjs/operators';

import { FichaAlumnoService } from '../../../features/ficha-alumno/services/ficha-alumno.service';
import { EstudianteBusquedaFicha } from '../../../features/ficha-alumno/models/estudiante-busqueda-ficha.model';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    LayoutModule,
    ReactiveFormsModule,
    MatToolbarModule,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    MatInputModule,
  ],
  template: `
    <div class="navbar">

      <div class="search-container" #searchContainer>
        <div class="search-box">
          <mat-icon>search</mat-icon>
          <input
            type="text"
            placeholder="Buscar alumno..."
            [formControl]="searchCtrl"
            autocomplete="off" />
          <button *ngIf="searchCtrl.value" class="clear-btn" type="button" (click)="limpiar()">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <!-- Dropdown de resultados -->
        <div class="search-results" *ngIf="mostrarResultados">
          <div *ngIf="buscando" class="search-loading">
            <mat-icon class="spin-icon">refresh</mat-icon>
            <span>Buscando...</span>
          </div>
          <button
            *ngFor="let est of resultados"
            type="button"
            class="result-item"
            [class.result-tea]="est.teaGeneral"
            (click)="irAFicha(est)">
            <div class="result-avatar" [class.avatar-tea]="est.teaGeneral">
              <mat-icon>person</mat-icon>
            </div>
            <div class="result-info">
              <span class="result-nombre">{{ est.apellido }}, {{ est.nombre }}</span>
              <span class="result-meta">DNI {{ est.documento }} · Curso {{ est.codigoCurso }}</span>
            </div>
          </button>
          <div *ngIf="!buscando && resultados.length === 0" class="search-empty">
            Sin resultados
          </div>
        </div>
      </div>

      <div class="user-area" *ngIf="!isMobile">
        <span class="username">Preceptor, Daniel</span>

        <button mat-icon-button class="avatar-btn" [matMenuTriggerFor]="userMenu">
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
export class NavbarComponent implements OnDestroy {
  isMobile = false;

  searchCtrl = new FormControl<string>('', { nonNullable: true });
  resultados: EstudianteBusquedaFicha[] = [];
  buscando = false;
  mostrarResultados = false;

  private searchSub: Subscription;

  constructor(
    private breakpointObserver: BreakpointObserver,
    private fichaService: FichaAlumnoService,
    private router: Router,
    private elementRef: ElementRef
  ) {
    this.breakpointObserver.observe([Breakpoints.Handset]).subscribe(result => {
      this.isMobile = result.matches;
    });

    this.searchSub = this.searchCtrl.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      tap(texto => {
        if (texto.trim().length < 3) {
          this.resultados = [];
          this.mostrarResultados = false;
          this.buscando = false;
        }
      }),
      filter(texto => texto.trim().length >= 3),
      tap(() => {
        this.buscando = true;
        this.mostrarResultados = true;
      }),
      switchMap(texto =>
        this.fichaService.buscarEstudiantes(texto.trim()).pipe(
          catchError(() => of([]))
        )
      )
    ).subscribe(res => {
      this.resultados = res;
      this.buscando = false;
      this.mostrarResultados = true;
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.mostrarResultados = false;
    }
  }

  irAFicha(est: EstudianteBusquedaFicha): void {
    this.limpiar();
    this.router.navigate(['/ficha-alumno'], {
      queryParams: { cursoId: est.idCurso, estudianteId: est.idEstudiante }
    });
  }

  limpiar(): void {
    this.searchCtrl.setValue('');
    this.resultados = [];
    this.mostrarResultados = false;
  }

  ngOnDestroy(): void {
    this.searchSub.unsubscribe();
  }
}
