export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpira: string;
  requiresPasswordChange: boolean;
  idUsuario: string;
  nombre: string;
  apellido: string;
  email: string;
  documento: string;
  roles: string[];
}
