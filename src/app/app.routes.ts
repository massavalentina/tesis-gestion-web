import { Route, Routes } from '@angular/router';
import { WeatherComponent } from '../app/deploy-test/weather.component';
import { PaginaGeneracionCredencialesQr } from './features/qr-credential-generation/pages/qr-credential-generation.page';
import { LayoutComponent } from './layouts/layout.component';
import { cambiosSinGuardarGuard } from './features/asistencia-general-manual/guards/cambios-sin-guardar.guard';
import { authGuard } from './core/auth/guards/auth.guard';
import { permisoGuard } from './core/auth/guards/permiso.guard';
import { permisoSinRolGuard } from './core/auth/guards/permiso-sin-rol.guard';
import { permisoORolGuard } from './core/auth/guards/permiso-o-rol.guard';
import { calificacionesCambiosPendientesGuard } from './features/mis-espacios-curriculares/guards/calificaciones-cambios-pendientes.guard';
import { colaPendienteGuard } from './features/qr-scanner/guards/cola-pendiente.guard';
import { PaginaEscanerAsistencia } from './features/qr-scanner/pages/escaner.page';
import { credencialesQrGuard } from './core/auth/guards/credenciales-qr.guard';
import { plataformaGuard } from './core/auth/guards/plataforma.guard';
import { AppSectionId, buildSectionRouteData } from './core/navigation/platform-visibility.config';

const withSectionData = (
  sectionId: AppSectionId
): Pick<Route, 'data'> => ({
  data: buildSectionRouteData(sectionId),
});

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component')
        .then(m => m.LoginComponent),
  },
  {
    path: 'olvide-contrasena',
    loadComponent: () =>
      import('./features/auth/olvide-contrasena/olvide-contrasena.component')
        .then(m => m.OlvideContrasenaComponent),
  },
  {
    path: 'restablecer-contrasena',
    loadComponent: () =>
      import('./features/auth/restablecer-contrasena/restablecer-contrasena.component')
        .then(m => m.RestablecerContrasenaComponent),
  },
  {
    path: 'weather-test',
    component: WeatherComponent,
  },
  {
    path: 'qr-credentials/generation',
    ...withSectionData('credencialesQr'),
    component: PaginaGeneracionCredencialesQr,
    canActivate: [authGuard, plataformaGuard, credencialesQrGuard],
  },
  {
    path: 'sin-permiso',
    loadComponent: () =>
      import('./features/sin-permiso/sin-permiso.component').then(m => m.SinPermisoComponent),
  },
  {
    path: 'dispositivo-no-permitido',
    loadComponent: () =>
      import('./features/dispositivo-no-permitido/dispositivo-no-permitido.component')
        .then(m => m.DispositivoNoPermitidoComponent),
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    canActivateChild: [plataformaGuard],
    children: [
      {
        path: '',
        ...withSectionData('home'),
        loadComponent: () =>
          import('../app/features/home/home/home.component')
            .then(m => m.HomeComponent),
      },
      {
        path: 'asistencia-rapida',
        ...withSectionData('asistenciaRapida'),
        loadComponent: () =>
          import('../app/features/asistencia-rapida/components/asistencia-rapida/asistencia-rapida.component')
            .then(m => m.AsistenciaRapidaComponent),
        canActivate: [authGuard, permisoGuard('BUSQUEDA_RAPIDA_RW')],
      },
      {
        path: 'asistencia-manual-curso',
        ...withSectionData('asistenciaManual'),
        loadComponent: () =>
          import('../app/features/asistencia-general-manual/components/asistencia-general-manual.component')
            .then(m => m.AsistenciaGeneralManualComponent),
        canActivate: [authGuard, permisoGuard('ASISTENCIA_MANUAL_RW')],
        canDeactivate: [cambiosSinGuardarGuard],
      },
      {
        path: 'parte-diario-digital',
        ...withSectionData('parteDiario'),
        loadComponent: () =>
          import('../app/features/parte-diario-digital/components/parte-diario.component')
            .then(m => m.ParteDiarioComponent),
        // Docente puede ver el parte diario (solo lectura + comentarios + PDF)
        canActivate: [authGuard, permisoORolGuard(['ASISTENCIA_MANUAL_RW', 'PARTE_DIARIO_R'], ['Docente', 'Equipo Directivo'])],
      },
      {
        path: 'reporte-retiros',
        ...withSectionData('reporteRetiros'),
        loadComponent: () =>
          import('../app/features/reporte-retiros/components/reporte-retiros/reporte-retiros.component')
            .then(m => m.ReporteRetirosComponent),
        canActivate: [authGuard, permisoORolGuard([], ['Preceptor'])],
      },
      {
        path: 'attendance/scan',
        ...withSectionData('qrScanner'),
        component: PaginaEscanerAsistencia,
        canActivate: [authGuard, permisoGuard('ASISTENCIA_QR_RW')],
        canDeactivate: [colaPendienteGuard],
      },
      {
        path: 'credenciales-qr',
        ...withSectionData('credencialesQr'),
        loadComponent: () =>
          import('../app/features/credenciales-qr/components/credenciales-qr/credenciales-qr.component')
            .then(m => m.CredencialesQrComponent),
        canActivate: [authGuard, credencialesQrGuard],
      },
      {
        path: 'perfil',
        ...withSectionData('perfil'),
        loadComponent: () =>
          import('../app/features/perfil/perfil.component')
            .then(m => m.PerfilComponent),
      },
      {
        path: 'ficha-alumno',
        ...withSectionData('fichaAlumno'),
        loadComponent: () =>
          import('../app/features/ficha-alumno/components/ficha-alumno/ficha-alumno.component')
            .then(m => m.FichaAlumnoComponent),
        canActivate: [authGuard, permisoGuard('FICHA_ALUMNO_R')],
      },
      {
        path: 'reporte-asistencia',
        ...withSectionData('reporteAsistencia'),
        loadComponent: () =>
          import('../app/features/reporte-asistencia/components/reporte-asistencia/reporte-asistencia.component')
            .then(m => m.ReporteAsistenciaComponent),
        canActivate: [authGuard, permisoGuard('REPORTES_ASISTENCIA_RW')],
      },
      {
        path: 'reporte-asistencia/detalle/:estudianteId',
        ...withSectionData('reporteAsistencia'),
        loadComponent: () =>
          import('../app/features/reporte-asistencia/components/detalle-asistencia-estudiante/detalle-asistencia-estudiante.component')
            .then(m => m.DetalleAsistenciaEstudianteComponent),
        canActivate: [authGuard, permisoGuard('REPORTES_ASISTENCIA_RW')],
      },
      {
        path: 'ficha-alumno/detalle/:estudianteId',
        ...withSectionData('fichaAlumnoDetalleAsistencia'),
        loadComponent: () =>
          import('../app/features/reporte-asistencia/components/detalle-asistencia-estudiante/detalle-asistencia-estudiante.component')
            .then(m => m.DetalleAsistenciaEstudianteComponent),
        canActivate: [authGuard, permisoGuard('FICHA_ALUMNO_R')],
      },
      {
        path: 'ficha-alumno/reporte-calificaciones/:estudianteId',
        ...withSectionData('fichaAlumnoDetalleCalificaciones'),
        loadComponent: () =>
          import('./features/ficha-alumno/components/reporte-calificaciones-estudiante/reporte-calificaciones-estudiante.component')
            .then(m => m.ReporteCalificacionesEstudianteComponent),
        canActivate: [authGuard, permisoGuard('FICHA_ALUMNO_R')],
      },
      {
        path: 'reporte-asistencia-docente',
        ...withSectionData('reporteAsistenciaDocente'),
        loadComponent: () =>
          import('../app/features/reporte-asistencia-docente/components/reporte-asistencia-docente/reporte-asistencia-docente.component')
            .then(m => m.ReporteAsistenciaDocenteComponent),
        canActivate: [authGuard, permisoSinRolGuard('REPORTES_EC_RW', ['Secretario'])],
      },
      {
        path: 'reporte-asistencia-docente/detalle/:estudianteId/:idEC',
        ...withSectionData('reporteAsistenciaDocente'),
        loadComponent: () =>
          import('../app/features/reporte-asistencia-docente/components/detalle-asistencia-docente/detalle-asistencia-docente.component')
            .then(m => m.DetalleAsistenciaDocenteComponent),
        canActivate: [authGuard, permisoSinRolGuard('REPORTES_EC_RW', ['Secretario'])],
      },
      {
        path: 'reportes-estrategicos/asistencia',
        ...withSectionData('reportesEstrategicosAsistencia'),
        loadComponent: () =>
          import('./features/reportes-estrategicos/components/dashboard-asistencia/dashboard-asistencia.component')
            .then(m => m.DashboardAsistenciaComponent),
        canActivate: [authGuard, permisoORolGuard([], ['Equipo Directivo'])],
      },
      {
        path: 'reportes-estrategicos/calificaciones',
        ...withSectionData('reportesEstrategicosCalificaciones'),
        loadComponent: () =>
          import('./features/reportes-estrategicos/components/dashboard-calificaciones/dashboard-calificaciones.component')
            .then(m => m.DashboardCalificacionesComponent),
        canActivate: [authGuard, permisoORolGuard([], ['Equipo Directivo'])],
      },
      {
        path: 'gestion-usuarios',
        ...withSectionData('gestionUsuarios'),
        loadComponent: () =>
          import('../app/features/gestion-usuarios/components/gestion-usuarios/gestion-usuarios.component')
            .then(m => m.GestionUsuariosComponent),
        canActivate: [authGuard, permisoORolGuard([], ['Secretario'])],
      },
      {
        path: 'gestion-usuarios/:id',
        ...withSectionData('gestionUsuarios'),
        loadComponent: () =>
          import('../app/features/gestion-usuarios/components/ficha-usuario/ficha-usuario.component')
            .then(m => m.FichaUsuarioComponent),
        canActivate: [authGuard, permisoORolGuard([], ['Secretario'])],
      },
      {
        path: 'calendario',
        ...withSectionData('calendario'),
        loadComponent: () =>
          import('./features/calendario/components/calendario/calendario.component')
            .then(m => m.CalendarioComponent),
        canActivate: [authGuard, permisoORolGuard([], ['Equipo Directivo', 'Secretario', 'Docente', 'Preceptor'])],
      },
      {
        path: 'mis-espacios-curriculares',
        ...withSectionData('misEspaciosCurriculares'),
        loadComponent: () =>
          import('../app/features/mis-espacios-curriculares/components/mis-ec-list/mis-ec-list.component')
            .then(m => m.MisEcListComponent),
        canActivate: [authGuard, permisoORolGuard([], ['Docente'])],
      },
      {
        path: 'mis-espacios-curriculares/:idEC/planificacion',
        ...withSectionData('misEspaciosCurriculares'),
        loadComponent: () =>
          import('./features/mis-espacios-curriculares/components/mis-ec-planificacion/mis-ec-planificacion.component')
            .then(m => m.MisEcPlanificacionComponent),
        canActivate: [authGuard, permisoORolGuard([], ['Docente'])],
      },
      {
        path: 'mis-espacios-curriculares/:idEC/calendario',
        ...withSectionData('misEspaciosCurriculares'),
        loadComponent: () =>
          import('./features/mis-espacios-curriculares/components/mis-ec-calendario/mis-ec-calendario.component')
            .then(m => m.MisEcCalendarioComponent),
        canActivate: [authGuard, permisoORolGuard([], ['Docente'])],
      },
      {
        path: 'mis-espacios-curriculares/:idEC',
        ...withSectionData('misEspaciosCurriculares'),
        loadComponent: () =>
          import('../app/features/mis-espacios-curriculares/components/mis-ec-detail/mis-ec-detail.component')
            .then(m => m.MisEcDetailComponent),
        canActivate: [authGuard, permisoORolGuard([], ['Docente'])],
      },
      {
        path: 'mis-espacios-curriculares/:idEC/calificaciones',
        ...withSectionData('misEspaciosCurriculares'),
        loadComponent: () =>
          import('../app/features/mis-espacios-curriculares/components/mis-ec-calificaciones/mis-ec-calificaciones.component')
            .then(m => m.MisEcCalificacionesComponent),
        canActivate: [authGuard, permisoORolGuard([], ['Docente'])],
        canDeactivate: [calificacionesCambiosPendientesGuard],
      },
      {
        path: 'mis-espacios-curriculares/:idEC/reportes',
        ...withSectionData('misEspaciosCurriculares'),
        loadComponent: () =>
          import('./features/mis-espacios-curriculares/components/mis-ec-reportes/mis-ec-reportes.component')
            .then(m => m.MisEcReportesComponent),
        canActivate: [authGuard, permisoORolGuard([], ['Docente', 'Equipo Directivo', 'Secretario'])],
      },
      {
        path: 'mis-espacios-curriculares/:idEC/evaluaciones',
        ...withSectionData('misEspaciosCurriculares'),
        loadComponent: () =>
          import('./features/mis-espacios-curriculares/components/mis-ec-evaluaciones/mis-ec-evaluaciones.component')
            .then(m => m.MisEcEvaluacionesComponent),
        canActivate: [authGuard, permisoORolGuard([], ['Docente'])],
      },
      {
        path: 'mis-espacios-curriculares/:idEC/calificaciones/importar',
        ...withSectionData('misEspaciosCurriculares'),
        loadComponent: () =>
          import('../app/features/mis-espacios-curriculares/components/mis-ec-calificaciones-import/mis-ec-calificaciones-import.component')
            .then(m => m.MisEcCalificacionesImportComponent),
        canActivate: [authGuard, permisoORolGuard([], ['Docente'])],
      },
      {
        path: 'mis-espacios-curriculares/:idEC/calificaciones/importar/:idImportacion',
        ...withSectionData('misEspaciosCurriculares'),
        loadComponent: () =>
          import('../app/features/mis-espacios-curriculares/components/mis-ec-calificaciones-import/mis-ec-calificaciones-import.component')
            .then(m => m.MisEcCalificacionesImportComponent),
        canActivate: [authGuard, permisoORolGuard([], ['Docente'])],
      },
      {
        path: 'mis-espacios-curriculares/:idEC/programas',
        ...withSectionData('misEspaciosCurriculares'),
        loadComponent: () =>
          import('../app/features/mis-espacios-curriculares/components/mis-ec-programas/mis-ec-programas.component')
            .then(m => m.MisEcProgramasComponent),
        canActivate: [authGuard, permisoORolGuard([], ['Docente'])],
      },
      {
        path: 'mis-espacios-curriculares/:idEC/programas/archivo',
        ...withSectionData('misEspaciosCurriculares'),
        loadComponent: () =>
          import('../app/features/mis-espacios-curriculares/components/mis-ec-programa-archivo/mis-ec-programa-archivo.component')
            .then(m => m.MisEcProgramaArchivoComponent),
        canActivate: [authGuard, permisoORolGuard([], ['Docente'])],
      },
      {
        path: 'mis-espacios-curriculares/:idEC/programas/nuevo',
        ...withSectionData('misEspaciosCurriculares'),
        loadComponent: () =>
          import('../app/features/mis-espacios-curriculares/components/programa-form/programa-form.component')
            .then(m => m.ProgramaFormComponent),
        canActivate: [authGuard, permisoORolGuard([], ['Docente'])],
      },
      {
        path: 'mis-espacios-curriculares/:idEC/programas/archivo/:idPrograma',
        ...withSectionData('misEspaciosCurriculares'),
        loadComponent: () =>
          import('../app/features/mis-espacios-curriculares/components/mis-ec-programa-archivo/mis-ec-programa-archivo.component')
            .then(m => m.MisEcProgramaArchivoComponent),
        canActivate: [authGuard, permisoORolGuard([], ['Docente'])],
      },
      {
        path: 'mis-espacios-curriculares/:idEC/programas/:idPrograma',
        ...withSectionData('misEspaciosCurriculares'),
        loadComponent: () =>
          import('../app/features/mis-espacios-curriculares/components/programa-detalle/programa-detalle.component')
            .then(m => m.ProgramaDetalleComponent),
        canActivate: [authGuard, permisoORolGuard([], ['Docente'])],
      },
      {
        path: 'mis-espacios-curriculares/:idEC/programas/:idPrograma/editar',
        ...withSectionData('misEspaciosCurriculares'),
        loadComponent: () =>
          import('../app/features/mis-espacios-curriculares/components/programa-form/programa-form.component')
            .then(m => m.ProgramaFormComponent),

        canActivate: [authGuard, permisoORolGuard([], ['Docente'])],
      },
    ],
  },
];
