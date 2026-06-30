import { TemaArbolDto, UnidadArbolDto } from './planificacion.model';

export type TipoCalificacion = 'N' | 'R1' | 'R2';
export type TipoIE = 'EvaluacionEscrita' | 'EvaluacionOral' | 'Entrega' | 'TPI';

export interface ArchivoIEGestion {
  idArchivoIE: string;
  tipoCalificacion: TipoCalificacion;
  tipoIE: TipoIE;
  titulo: string;
  nombreArchivo: string;
  urlArchivo?: string | null;
  fechaEjecucion: string;
  fechaCarga: string;
  tieneCalificaciones: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
  motivoBloqueo?: string | null;
  idBloquesTema: string[];
}

export interface InstanciaEvaluativaSlot {
  idIE?: string | null;
  nro: number;
  existe: boolean;
  estado: string;
  notaOriginal: ArchivoIEGestion | null;
  recuperatorio1: ArchivoIEGestion | null;
  recuperatorio2: ArchivoIEGestion | null;
}

export interface GestionEvaluaciones {
  sinPrograma: boolean;
  trazabilidadDisponible: boolean;
  mensajeTrazabilidad?: string | null;
  idPrograma?: string | null;
  tituloPrograma?: string | null;
  estadoPrograma?: string | null;
  origenPrograma?: string | null;
  nombreMateria: string;
  nombreDocente: string;
  nombreCurso: string;
  anioLectivo: number;
  unidades: UnidadArbolDto[];
  instancias: InstanciaEvaluativaSlot[];
}

export interface GuardarArchivoIERequest {
  titulo: string;
  tipoIE: TipoIE;
  fechaEjecucion: string;
  idBloquesTema: string[];
}

export interface EvaluacionTrazabilidadSelection {
  unidad: UnidadArbolDto;
  temas: TemaArbolDto[];
}
