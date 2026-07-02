export interface EventoInstitucional {
  idEvento: string;
  titulo: string;
  descripcion?: string;
  tipoEvento: number;
  tipoEventoLabel: string;
  fechaInicio: string;
  fechaFin: string;
  contabilizaAsistencia: boolean;
  cambioActividad: boolean;
  comentarioCambioActividad?: string;
  anioLectivo: number;
  cursos: CursoEvento[];
}

export interface CursoEvento {
  idCurso: string;
  label: string;
}

export interface CrearEventoRequest {
  titulo: string;
  descripcion?: string;
  tipoEvento: number;
  fechaInicio: string;
  fechaFin: string;
  contabilizaAsistencia: boolean;
  cambioActividad: boolean;
  comentarioCambioActividad?: string;
  cursoIds?: string[];
}

export interface AuditoriaEvento {
  idAuditoria: string;
  tipoOperacion: string;
  valoresAnteriores?: string;
  valoresNuevos?: string;
  nombreUsuario: string;
  apellidoUsuario: string;
  fechaRegistro: string;
}

export interface TipoEvento {
  id: number;
  label: string;
}

export interface CursoSeleccion {
  id: string;
  label: string;
}

export interface DiaCalendario {
  fecha: Date;
  enMes: boolean;
  key: string;
  eventos: EventoInstitucional[];
}

export const LABEL_TIPO_EVENTO: Record<number, string> = {
  1: 'Evento Institucional',
  2: 'Evento Extraordinario',
  3: 'Evento Festivo',
  4: 'Feriado',
  5: 'Período de Clases',
  6: 'Período de Evaluación',
};

export const COLORES_TIPO_EVENTO: Record<number, { bg: string; border: string; text: string }> = {
  1: { bg: '#e3f2fd', border: '#1976d2', text: '#1565c0' },
  2: { bg: '#fff3e0', border: '#f57c00', text: '#e65100' },
  3: { bg: '#fce4ec', border: '#c62828', text: '#b71c1c' },
  4: { bg: '#ffebee', border: '#d32f2f', text: '#c62828' },
  5: { bg: '#e8f5e9', border: '#2e7d32', text: '#1b5e20' },
  6: { bg: '#f3e5f5', border: '#7b1fa2', text: '#6a1b9a' },
};
