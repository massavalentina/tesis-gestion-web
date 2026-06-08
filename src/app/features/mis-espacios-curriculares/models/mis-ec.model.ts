export interface HorarioMisEc {
  diaSemana: string;
  horarioEntrada: string;
  horarioSalida: string;
}

export interface MisEcItem {
  idEC: string;
  idCurso: string;
  nombreMateria: string;
  codigoCurso: string;
  anioNumero: number;
  division: string;
  anioLectivo: number;
  cantidadEstudiantes: number;
  horarios: HorarioMisEc[];
}
