import { CanDeactivateFn } from '@angular/router';
import { AsistenciaGeneralManualComponent } from '../components/asistencia-general-manual.component';

export const cambiosSinGuardarGuard: CanDeactivateFn<AsistenciaGeneralManualComponent> =
  (component) => component.hayModificaciones
    ? component.confirmarDescarteNavegacion()
    : true;
