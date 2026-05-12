export interface Usuario {
  idUsuario: string;
  nombre: string;
  apellido: string;
  email: string;
  documento: string;
  telefono?: string | null;
  activo: boolean;
  fechaCreacion: string;
  roles: string[];
  idDocente?: string | null;
  idPreceptor?: string | null;
  esDelegado?: boolean | null;
}

export interface CrearUsuarioRequest {
  nombre: string;
  apellido: string;
  email: string;
  documento: string;
  telefono?: string;
  roles: string[];
}

export interface CrearUsuarioResultDto {
  usuario: Usuario;
  contrasenaProvisoria: string;
}
