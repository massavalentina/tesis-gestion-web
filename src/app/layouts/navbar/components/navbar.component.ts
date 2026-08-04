import { Component, ElementRef, HostListener, OnDestroy } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { LayoutModule } from '@angular/cdk/layout';
import { NavigationEnd, Router } from '@angular/router';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';

import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, map, switchMap, tap, catchError } from 'rxjs/operators';

import { FichaAlumnoService } from '../../../features/ficha-alumno/services/ficha-alumno.service';
import { EstudianteBusquedaFicha } from '../../../features/ficha-alumno/models/estudiante-busqueda-ficha.model';
import { AuthService } from '../../../features/auth/services/auth.service';
import { PROFILE_NAV_ITEM } from '../../../core/navigation/app-navigation.config';

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

      <div class="search-container" #searchContainer *ngIf="!ocultarBusquedaGlobal">
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
              <span class="result-nombre" [innerHTML]="highlight(est.apellido + ', ' + est.nombre)"></span>
              <span class="result-meta">DNI <span [innerHTML]="highlight(est.documento)"></span> · Curso {{ est.codigoCurso }}</span>
            </div>
          </button>
          <div *ngIf="!buscando && resultados.length === 0" class="search-empty">
            Sin resultados
          </div>
        </div>
      </div>

      <div class="user-area" *ngIf="!isMobile">
        <div class="username">
          <span class="username-nombre">{{ nombreUsuario }}</span>
          <span class="username-rol">{{ rolUsuario }}</span>
        </div>

        <button class="avatar-btn" [matMenuTriggerFor]="userMenu">
          {{ iniciales }}
        </button>

        <mat-menu #userMenu="matMenu" xPosition="before">
          <button mat-menu-item (click)="irACuenta()">
            <mat-icon>person</mat-icon>
            <span>Mi perfil</span>
          </button>
          <button mat-menu-item (click)="authService.logout()">
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
  readonly profileItem = PROFILE_NAV_ITEM;
  isMobile = false;

  /** Rutas con su propio buscador: se oculta el buscador global de la navbar para no duplicar. */
  private static readonly RUTAS_SIN_BUSQUEDA_GLOBAL = ['/asistencia-rapida'];
  ocultarBusquedaGlobal = false;

  searchCtrl = new FormControl<string>('', { nonNullable: true });
  resultados: EstudianteBusquedaFicha[] = [];
  buscando = false;
  mostrarResultados = false;

  nombreUsuario: string;
  rolUsuario: string;
  iniciales: string;

  private searchSub: Subscription;
  private routerSub: Subscription;

  constructor(
    private breakpointObserver: BreakpointObserver,
    private fichaService: FichaAlumnoService,
    private router: Router,
    private elementRef: ElementRef,
    private sanitizer: DomSanitizer,
    public authService: AuthService,
  ) {
    const usuario = authService.obtenerUsuario();
    this.nombreUsuario = usuario?.nombre ?? '';
    const partes = this.nombreUsuario.trim().split(/\s+/);
    this.iniciales = partes.length >= 2
      ? (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
      : (partes[0]?.[0] ?? '?').toUpperCase();
    const roles: string[] = usuario?.roles ? [...usuario.roles] : [];
    if (usuario?.esPreceptorDelegado) {
      if (!roles.includes('Preceptor Delegado')) roles.push('Preceptor Delegado');
      const idx = roles.findIndex(r => r.toLowerCase() === 'preceptor');
      if (idx !== -1) roles.splice(idx, 1);
    }
    this.rolUsuario = roles.join(' · ');
    this.breakpointObserver.observe([Breakpoints.Handset]).subscribe(result => {
      this.isMobile = result.matches;
    });

    this.ocultarBusquedaGlobal = this.calcularOcultarBusqueda(this.router.url);
    this.routerSub = this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd)
    ).subscribe(e => {
      this.ocultarBusquedaGlobal = this.calcularOcultarBusqueda(e.urlAfterRedirects);
    });

    this.searchSub = this.searchCtrl.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      tap(texto => {
        if (texto.trim().length < 1) {
          this.resultados = [];
          this.mostrarResultados = false;
          this.buscando = false;
        }
      }),
      filter(texto => texto.trim().length >= 1),
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

  /** Resalta, dentro de `text`, las palabras que el usuario tipeó en el buscador. */
  highlight(text: string): SafeHtml {
    const escaped = this.escapeHtml(text ?? '');
    const tokens = this.searchCtrl.value
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(t => t.length > 0)
      .map(t => this.escapeRegex(t));

    if (tokens.length === 0) return this.sanitizer.bypassSecurityTrustHtml(escaped);

    const pattern = new RegExp(`(${tokens.join('|')})`, 'gi');
    const resaltado = escaped.replace(pattern, '<mark class="search-match">$1</mark>');
    return this.sanitizer.bypassSecurityTrustHtml(resaltado);
  }

  private escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private calcularOcultarBusqueda(url: string): boolean {
    return NavbarComponent.RUTAS_SIN_BUSQUEDA_GLOBAL.some(ruta => url.startsWith(ruta));
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

  irACuenta(): void {
    this.router.navigate([this.profileItem.route]);
  }

  ngOnDestroy(): void {
    this.searchSub.unsubscribe();
    this.routerSub.unsubscribe();
  }
}
