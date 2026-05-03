import { Routes } from '@angular/router';
import { WeatherComponent } from '../app/deploy-test/weather.component';
import { PaginaEscanerAsistencia } from './features/qr-scanner/pages/escaner.page';
import { PaginaGeneracionCredencialesQr } from './features/qr-credential-generation/pages/qr-credential-generation.page';
import { LayoutComponent } from './layouts/layout.component';
import { cambiosSinGuardarGuard } from './features/asistencia-general-manual/guards/cambios-sin-guardar.guard';

export const routes: Routes = [
  {
    path: 'weather-test',
    component: WeatherComponent
  },
  {
    path: 'qr-credentials/generation',
    component: PaginaGeneracionCredencialesQr
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
      },
      {
        path: 'asistencia-manual-curso',
        loadComponent: () =>
          import('../app/features/asistencia-general-manual/components/asistencia-general-manual.component')
            .then(m => m.AsistenciaGeneralManualComponent),
        canDeactivate: [cambiosSinGuardarGuard],
      },
      {
        path: 'parte-diario-digital',
        loadComponent: () =>
          import('../app/features/parte-diario-digital/components/parte-diario.component')
            .then(m => m.ParteDiarioComponent),
      },
      
      {
        path: 'attendance/scan',
        component: PaginaEscanerAsistencia
      },
      {
        path: 'credenciales-qr',
        loadComponent: () =>
          import('../app/features/credenciales-qr/components/credenciales-qr/credenciales-qr.component')
            .then(m => m.CredencialesQrComponent),
      },
      {
        path: 'cuenta',
        loadComponent: () =>
          import('../app/features/proximamente/proximamente.component')
            .then(m => m.ProximamenteComponent),
      },
      {
        path: 'ficha-alumno',
        loadComponent: () =>
          import('../app/features/ficha-alumno/components/ficha-alumno/ficha-alumno.component')
            .then(m => m.FichaAlumnoComponent),
      },
      {
        path: 'reporte-asistencia',
        loadComponent: () =>
          import('../app/features/reporte-asistencia/components/reporte-asistencia/reporte-asistencia.component')
            .then(m => m.ReporteAsistenciaComponent),
      },
      {
        path: 'reporte-asistencia/detalle/:estudianteId',
        loadComponent: () =>
          import('../app/features/reporte-asistencia/components/detalle-asistencia-estudiante/detalle-asistencia-estudiante.component')
            .then(m => m.DetalleAsistenciaEstudianteComponent),
      },
      {
        path: 'ficha-alumno/detalle/:estudianteId',
        loadComponent: () =>
          import('../app/features/reporte-asistencia/components/detalle-asistencia-estudiante/detalle-asistencia-estudiante.component')
            .then(m => m.DetalleAsistenciaEstudianteComponent),
      },
      {
        path: 'reporte-asistencia-docente',
        loadComponent: () =>
          import('../app/features/reporte-asistencia-docente/components/reporte-asistencia-docente/reporte-asistencia-docente.component')
            .then(m => m.ReporteAsistenciaDocenteComponent),
      },
      {
        path: 'reporte-asistencia-docente/detalle/:estudianteId/:idEC',
        loadComponent: () =>
          import('../app/features/reporte-asistencia-docente/components/detalle-asistencia-docente/detalle-asistencia-docente.component')
            .then(m => m.DetalleAsistenciaDocenteComponent),
      },
      {
        path: 'reporte-retiros',
        loadComponent: () =>
          import('../app/features/reporte-retiros/components/reporte-retiros/reporte-retiros.component')
            .then(m => m.ReporteRetirosComponent),
      },
    ],
  }
];
