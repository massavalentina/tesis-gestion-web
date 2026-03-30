export interface ComentarioParte {
  idComentario: string;
  timestamp: string;
  contenido: string;
  tipo: 'Comentario' | 'Evento';
  autor: string;
}
