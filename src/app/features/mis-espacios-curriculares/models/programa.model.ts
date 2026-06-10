export interface ProgramaResumen {
  idPrograma: string;
  titulo: string;
  anioLectivo: number;
  estado: 'Borrador' | 'Confirmado' | 'Vigente' | 'NoVigente';
  origen: 'Manual' | 'Archivo';
  nombreMateria: string;
  codigoCurso: string;
  horasCatedra: number;
  fechaCreacion: string;
  cantidadUnidades: number;
  cantidadTemas: number;
  cantidadObjetivos: number;
  nombreDocente: string;
}

export interface ProgramaDetalle {
  idPrograma: string;
  idCurso: string;
  idEC: string;
  anioLectivo: number;
  titulo: string;
  descripcion?: string;
  horasCatedra: number;
  estado: string;
  origen: string;
  fechaVencimiento: string;
  fechaCreacion: string;
  nombreMateria: string;
  codigoCurso: string;
  anioNumero: number;
  division: string;
  nombreDocente: string;
  objetivos: ObjetivoDto[];
  unidades: UnidadConTemasDto[];
}

export interface ObjetivoDto {
  idObjetivo?: string;
  descripcion: string;
  nro: number;
}

export interface UnidadConTemasDto {
  idUnidad?: string;
  titulo: string;
  descripcion?: string;
  nro: number;
  temas: TemaDto[];
}

export interface TemaDto {
  idTema?: string;
  titulo: string;
  descripcion?: string;
  nro: number;
}

export interface CrearProgramaDto {
  idCurso: string;
  idEC: string;
  anioLectivo: number;
  titulo: string;
  descripcion?: string;
  horasCatedra: number;
  objetivos: ObjetivoDto[];
  unidades: UnidadConTemasDto[];
}
