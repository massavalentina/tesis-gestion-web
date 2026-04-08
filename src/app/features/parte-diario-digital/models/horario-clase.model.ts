export interface HorarioClase {
  idHorario: string;
  idEC: string;
  idClaseDictada: string | null;
  materia: string;
  docente: string;
  horaEntrada: string;
  horaSalida: string;
  /** Presentes solo cuando la clase fue movida de su horario original */
  horaEntradaOriginal?: string;
  horaSalidaOriginal?: string;
  dictada: boolean | null;
  motivo: string | null;
  tema: string | null;
}
