export interface RegistrarAsistenciaManual {
  estudianteId:     string;          // Guid
  fecha:            string;          // 'yyyy-MM-dd'
  turno:            'MANANA' | 'TARDE';
  tipoAsistenciaId: string;          // Guid
  /**
   * Hora del evento en formato 'HH:mm:ss'.
   * — Desarrollo: se envía desde el campo de hora del formulario.
   * — Producción: se omite (undefined/null) y el backend usa DateTime.Now.
   */
  hora?:            string | null;
}