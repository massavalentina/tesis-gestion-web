export interface ArbolPlanificacionDto {
  bloqueado: boolean;
  mensajeBloqueo?: string;
  sinPrograma: boolean;
  permiteCrearItems: boolean;
  nombreMateria: string;
  tituloPrograma: string;
  nombreDocente: string;
  anioLectivo: number;
  estadoPrograma: string;
  urlPrograma?: string;
  avance: number;
  totalTemas: number;
  temasCompletos: number;
  unidades: UnidadArbolDto[];
}

export interface UnidadArbolDto {
  idUnidad: string;
  idBloquePrograma: string;
  titulo: string;
  descripcion?: string;
  nro: number;
  estado: string;
  temas: TemaArbolDto[];
}

export interface TemaArbolDto {
  idTema: string;
  idBloquePrograma: string;
  titulo: string;
  descripcion?: string;
  nro: number;
  estado: string;
  clases: ClasePlanificacionDto[];
}

export interface ClasePlanificacionDto {
  idPlanificacion: string;
  titulo: string;
  descripcion?: string;
  fechaEstimada?: string;
  fechaDictada?: string;
  estado: string;
  url?: string;
  fechaCreacion: string;
}

export interface CrearItemDto {
  titulo: string;
  descripcion?: string;
}
