

export type Turno = 'Mañana' | 'Tarde';;

export interface ScanConfig {
  turno: 'Mañana' | 'Tarde';
  attendanceTypeId: string;
}

export interface AttendanceScanRequest {
  qr: string;
  turno: 'Mañana' | 'Tarde';
  attendanceTypeId: string;
}

export interface AttendanceScanResponse {
  student: {
    id: string;
    name: string;
    lastName: string;
    course: string;
  };
  attendance: {
    time: string;
    attendanceType: string;
    turno: string;
  };
}

export interface ApiError {
  code: string;
  message: string;
}

export interface ScannedStudent {
  id: string;
  name: string;
  lastName: string;
  course: string;
}

