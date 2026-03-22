export interface AsistenciaEspacioItem {
  idAsistenciaEspacio: string | null;
  idEC:                string;
  idClaseDictada:      string | null;
  nombreMateria:       string;
  horarioEntrada:      string;
  horarioSalida:       string;
  dictada:             boolean | null;
  presente:            boolean | null;
  presenteOriginal:    boolean | null;
  guardando:           boolean;
}
