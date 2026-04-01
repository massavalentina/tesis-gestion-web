export interface ComentarioParte {
  idComentario: string;
  timestamp:    string;
  contenido:    string;
  tipo:         'Comentario' | 'Evento';
  subTipo:      'NOTA' | 'ASISTENCIA' | 'HORARIO';
  titulo:       string | null;
  detalle:      string | null;
  autor:        string;
}
