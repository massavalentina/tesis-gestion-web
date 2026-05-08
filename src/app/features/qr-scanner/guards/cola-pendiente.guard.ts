import { CanDeactivateFn } from '@angular/router';
import { Observable } from 'rxjs';

type ComponenteScannerConPendientes = {
  tienePendientes: () => boolean;
  confirmarDescarteNavegacion: () => Observable<boolean> | Promise<boolean> | boolean;
};

export const colaPendienteGuard: CanDeactivateFn<ComponenteScannerConPendientes> =
  (component) => component.tienePendientes()
    ? component.confirmarDescarteNavegacion()
    : true;
