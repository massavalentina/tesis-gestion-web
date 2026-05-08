import { Routes } from '@angular/router';
import { WeatherComponent } from '../app/deploy-test/weather.component';
import { PaginaEscanerAsistencia } from './features/qr-scanner/pages/escaner.page';
import { PaginaGeneracionCredencialesQr } from './features/qr-credential-generation/pages/qr-credential-generation.page';
import { LayoutComponent } from './layouts/layout.component';
import { cambiosSinGuardarGuard } from './features/asistencia-general-manual/guards/cambios-sin-guardar.guard';
import { authGuard } from './core/auth/guards/auth.guard';
import { permisoGuard } from './core/auth/guards/permiso.guard';
import { permisoORolGuard } from './core/auth/guards/permiso-o-rol.guard';

export const routes: Routes = [
  {
    path: 'weather-test',
    component: WeatherComponent,
  },
  {
    path: 'qr-credentials/generation',
    component: PaginaGeneracionCredencialesQr,
    canActivate: [authGuard, permisoGuard('CREDENCIALES_QR_RW')],
  },
  // ⚠️ SOLO DESARROLLO — Eliminar esta ruta antes de pasar a producción
  {
    path: 'dev-login',
    loadComponent: () =>
      import('./features/dev-login/dev-login.component').then(m => m.DevLoginComponent),
  },
  {
    path: 'sin-permiso',
    loadComponent: () =>
      import('./features/sin-permiso/sin-permiso.component').then(m => m.SinPermisoComponent),
  },
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('../app/features/home/home/home.component')
            .then(m => m.HomeComponent),
      },
      {
        path: 'asistencia-rapida',
        loadComponent: () =>
          import('../app/features/asistencia-rapida/components/asistencia-rapida/asistencia-rapida.component')
            .then(m => m.AsistenciaRapidaComponent),
        canActivate: [authGuard, permisoGuard('BUSQUEDA_RAPIDA_RW')],
      },
      {
        path: 'asistencia-manual-curso',
        loadComponent: () =>
          import('../app/features/asistencia-general-manual/components/asistencia-general-manual.component')
            .then(m => m.AsistenciaGeneralManualComponent),
        canActivate: [authGuard, permisoGuard('ASISTENCIA_MANUAL_RW')],
        canDeactivate: [cambiosSinGuardarGuard],
      },
      {
        path: 'parte-diario-digital',
        loadComponent: () =>
          import('../app/features/parte-diario-digital/components/parte-diario.component')
            .then(m => m.ParteDiarioComponent),
        // Docente puede ver el parte diario (solo lectura + comentarios + PDF)
        canActivate: [authGuard, permisoORolGuard(['ASISTENCIA_MANUAL_RW'], ['Docente'])],
      },
      {
        path: 'attendance/scan',
        component: PaginaEscanerAsistencia,
        canActivate: [authGuard, permisoGuard('ASISTENCIA_QR_RW')],
      },
      {
        path: 'credenciales-qr',
        loadComponent: () =>
          import('../app/features/credenciales-qr/components/credenciales-qr/credenciales-qr.component')
            .then(m => m.CredencialesQrComponent),
        canActivate: [authGuard, permisoGuard('CREDENCIALES_QR_RW')],
      },
      {
        path: 'cuenta',
        loadComponent: () =>
          import('../app/features/proximamente/proximamente.component')
            .then(m => m.ProximamenteComponent),
        canActivate: [authGuard],
      },
      {
        path: 'gestion-roles',
        loadComponent: () =>
          import('../app/features/gestion-roles/components/gestion-roles/gestion-roles.component')
            .then(m => m.GestionRolesComponent),
        canActivate: [authGuard, permisoGuard('ASIGNACION_ROLES_RW')],
      },
      {
        path: 'ficha-alumno',
        loadComponent: () =>
          import('../app/features/ficha-alumno/components/ficha-alumno/ficha-alumno.component')
            .then(m => m.FichaAlumnoComponent),
        canActivate: [authGuard, permisoGuard('FICHA_ALUMNO_R')],
      },
      {
        path: 'reporte-asistencia',
        loadComponent: () =>
          import('../app/features/reporte-asistencia/components/reporte-asistencia/reporte-asistencia.component')
            .then(m => m.ReporteAsistenciaComponent),
        canActivate: [authGuard, permisoGuard('REPORTES_ASISTENCIA_R')],
      },
      {
        path: 'reporte-asistencia/detalle/:estudianteId',
        loadComponent: () =>
          import('../app/features/reporte-asistencia/components/detalle-asistencia-estudiante/detalle-asistencia-estudiante.component')
            .then(m => m.DetalleAsistenciaEstudianteComponent),
        canActivate: [authGuard, permisoGuard('REPORTES_ASISTENCIA_R')],
      },
      {
        path: 'ficha-alumno/detalle/:estudianteId',
        loadComponent: () =>
          import('../app/features/reporte-asistencia/components/detalle-asistencia-estudiante/detalle-asistencia-estudiante.component')
            .then(m => m.DetalleAsistenciaEstudianteComponent),
        canActivate: [authGuard, permisoGuard('FICHA_ALUMNO_R')],
      },
      {
        path: 'reporte-asistencia-docente',
        loadComponent: () =>
          import('../app/features/reporte-asistencia-docente/components/reporte-asistencia-docente/reporte-asistencia-docente.component')
            .then(m => m.ReporteAsistenciaDocenteComponent),
        canActivate: [authGuard, permisoGuard('REPORTES_ASISTENCIA_RW')],
      },
      {
        path: 'reporte-asistencia-docente/detalle/:estudianteId/:idEC',
        loadComponent: () =>
          import('../app/features/reporte-asistencia-docente/components/detalle-asistencia-docente/detalle-asistencia-docente.component')
            .then(m => m.DetalleAsistenciaDocenteComponent),
        canActivate: [authGuard, permisoGuard('REPORTES_ASISTENCIA_RW')],
      },
    ],
  },
];
