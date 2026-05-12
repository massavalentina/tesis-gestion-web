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
}

export interface CrearUsuarioRequest {
  nombre: string;
  apellido: string;
  email: string;
  documento: string;
  telefono?: string;
}

export interface CrearUsuarioResult {
  usuario: Usuario;
  contrasenaProvisoria: string;
}
