export interface AsistenciaEspacioItem {
  idAsistenciaEspacio: string | null;
  idEC:                string;
  idClaseDictada:      string | null;
  nombreMateria:       string;
  horarioEntrada:         string;
  horarioSalida:          string;
  horarioEntradaOriginal: string | null;
  horarioSalidaOriginal:  string | null;
  dictada:                boolean | null;
  presente:            boolean | null;
  presenteOriginal:    boolean | null;
  guardando:           boolean;
}
