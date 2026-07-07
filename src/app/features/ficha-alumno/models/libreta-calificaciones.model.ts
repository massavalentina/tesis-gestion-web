export interface LibretaInstancia {
  nro: number;
  n: number | null;
  r1: number | null;
  r2: number | null;
}

export interface LibretaEspacio {
  idEC: string;
  nombreMateria: string;
  instancias: LibretaInstancia[];
}
