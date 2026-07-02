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
  navItem('asistenciaRapida', 'Búsqueda Rápida', '/asistencia-rapida', 'bolt'),
  navItem('qrScanner', 'Escáner QR', '/attendance/scan', 'qr_code_scanner'),
  navItem('asistenciaManual', 'Asistencia Manual', '/asistencia-manual-curso', 'fact_check'),
  navItem('parteDiario', 'Parte Diario', '/parte-diario-digital', 'today'),
  navItem('reporteAsistencia', 'Asistencia General', '/reporte-asistencia', 'bar_chart', false),
  navItem('reporteAsistenciaDocente', 'Asistencia por EC', '/reporte-asistencia-docente', 'school', false),
];

export const REPORTES_ESTRATEGICOS_NAV_ITEMS: AppNavItem[] = [
  navItem('reportesEstrategicosAsistencia', 'Asistencia', '/reportes-estrategicos/asistencia', 'show_chart'),
  navItem('reportesEstrategicosCalificaciones', 'Generales', '/reportes-estrategicos/calificaciones', 'leaderboard'),
];

export const PROFILE_NAV_ITEM = navItem('perfil', 'Mi perfil', '/perfil', 'account_circle');

export const SECONDARY_NAV_ITEMS: AppNavItem[] = [
  navItem('misEspaciosCurriculares', 'Mis espacios', '/mis-espacios-curriculares', 'menu_book', false),
  navItem('credencialesQr', 'Credenciales QR', '/credenciales-qr', 'qr_code'),
  navItem('fichaAlumno', 'Ficha de Alumno', '/ficha-alumno', 'assignment_ind'),
  PROFILE_NAV_ITEM,
];
