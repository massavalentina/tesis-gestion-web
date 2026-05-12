import { Rol } from './rol.model';

export interface UsuarioConRoles {
  idUsuario: string;
  mail: string;
  nombre: string | null;
  apellido: string | null;
  documento: string | null;
  esDelegado: boolean | null;
  roles: Rol[];
}
