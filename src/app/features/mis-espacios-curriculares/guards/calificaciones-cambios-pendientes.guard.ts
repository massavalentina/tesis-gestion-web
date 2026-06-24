import { CanDeactivateFn } from '@angular/router';
import { MisEcCalificacionesComponent } from '../components/mis-ec-calificaciones/mis-ec-calificaciones.component';

export const calificacionesCambiosPendientesGuard: CanDeactivateFn<MisEcCalificacionesComponent> =
  component => component.tieneCambiosSinGuardar()
    ? component.confirmarSalidaConCambios('navigation')
    : true;
