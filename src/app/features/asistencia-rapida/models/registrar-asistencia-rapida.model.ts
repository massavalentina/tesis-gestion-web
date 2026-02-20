export interface RegistrarAsistenciaRapida {
  estudianteId: string;
  fecha: string;
  turno: 'MANANA' | 'TARDE';
  tipoAsistenciaId: string;
  hora?: string; // ✅ NUEVO (HH:mm:ss)
}