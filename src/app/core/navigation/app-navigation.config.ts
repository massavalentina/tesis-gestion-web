import {
  AppSectionId,
  PlatformVisibility,
  getSectionPlatformVisibility,
} from './platform-visibility.config';

export interface AppNavItem {
  sectionId: AppSectionId;
  label: string;
  route: string;
  exact: boolean;
  platformVisibility: PlatformVisibility;
  icon?: string;
}

const navItem = (
  sectionId: AppSectionId,
  label: string,
  route: string,
  icon?: string,
  exact = true
): AppNavItem => ({
  sectionId,
  label,
  route,
  exact,
  icon,
  platformVisibility: getSectionPlatformVisibility(sectionId),
});

export const HOME_NAV_ITEM = navItem('home', 'Inicio', '/', 'home');

export const ASISTENCIA_NAV_ITEMS: AppNavItem[] = [
  navItem('asistenciaRapida', 'Búsqueda Rápida', '/asistencia-rapida'),
  navItem('qrScanner', 'Escáner QR', '/attendance/scan'),
  navItem('asistenciaManual', 'Asistencia Manual', '/asistencia-manual-curso'),
  navItem('parteDiario', 'Parte Diario', '/parte-diario-digital'),
  navItem('reporteRetiros', 'Listado de Retiros', '/reporte-retiros'),
  navItem('reporteAsistencia', 'Asistencia General', '/reporte-asistencia', undefined, false),
  navItem('reporteAsistenciaDocente', 'Asistencia por EC', '/reporte-asistencia-docente', undefined, false),
];

export const REPORTES_ESTRATEGICOS_NAV_ITEMS: AppNavItem[] = [
  navItem('reportesEstrategicosAsistencia', 'Asistencia', '/reportes-estrategicos/asistencia'),
];

export const PROFILE_NAV_ITEM = navItem('perfil', 'Mi perfil', '/perfil', 'account_circle');

export const SECONDARY_NAV_ITEMS: AppNavItem[] = [
  navItem('misEspaciosCurriculares', 'Mis espacios', '/mis-espacios-curriculares', 'menu_book', false),
  navItem('credencialesQr', 'Credenciales QR', '/credenciales-qr', 'qr_code'),
  navItem('fichaAlumno', 'Ficha de Alumno', '/ficha-alumno', 'assignment_ind'),
  PROFILE_NAV_ITEM,
];
