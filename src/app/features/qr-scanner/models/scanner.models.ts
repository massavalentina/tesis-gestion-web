

export type Turno = 'MANIANA' | 'TARDE';

export interface ScanConfig {
  turno: Turno;
  attendanceTypeId: number;
}

export interface AttendanceType {
  id: number;
  name: string;
}

export interface ScanPayload {
  qr: string;
  turno: Turno;
  attendanceTypeId: number;
}
