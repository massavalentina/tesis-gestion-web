export interface RegistrarAsistenciaRapida {
  estudianteId: string;
  fecha: string;           // ISO: '2026-02-09'
  turno: 'MANANA' | 'TARDE';
  tipoAsistenciaId: string;
}