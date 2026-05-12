export interface RestablecerContrasenaRequest {
  token: string;
  documento: string;
  contrasenaNueva: string;
  confirmacionContrasenaNueva: string;
}
