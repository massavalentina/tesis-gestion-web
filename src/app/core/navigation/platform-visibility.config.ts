import { Data } from '@angular/router';

export type PlatformVisibility = 'all' | 'mobile' | 'desktop';

export const APP_SECTION_VISIBILITY = {
  home: 'all',
  asistenciaRapida: 'mobile',
  qrScanner: 'mobile',
  asistenciaManual: 'all',
  parteDiario: 'all',
  reporteAsistencia: 'desktop',
  reporteAsistenciaDocente: 'desktop',
  calendario: 'desktop',
  credencialesQr: 'desktop',
  fichaAlumno: 'all',
  fichaAlumnoDetalleAsistencia: 'desktop',
  fichaAlumnoDetalleCalificaciones: 'desktop',
  perfil: 'all',
  misEspaciosCurriculares: 'desktop',
  reportesEstrategicosAsistencia: 'desktop',
  reportesEstrategicosCalificaciones: 'desktop',
  reporteRetiros: 'all',
  gestionUsuarios: 'desktop',
} as const satisfies Record<string, PlatformVisibility>;

export type AppSectionId = keyof typeof APP_SECTION_VISIBILITY;

export const buildSectionRouteData = (sectionId: AppSectionId): Data => ({
  sectionId,
  platformVisibility: APP_SECTION_VISIBILITY[sectionId],
});

export const getSectionPlatformVisibility = (
  sectionId: AppSectionId
): PlatformVisibility => APP_SECTION_VISIBILITY[sectionId];
