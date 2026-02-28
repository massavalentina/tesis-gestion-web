

export interface ScanConfig {
  courseId: string;
  turno: string;
  attendanceTypeId: string;
  attendanceTypeLabel: string;
}

export interface AttendanceScanRequest {
  qr: string;
  idCurso: string;
  turno: string;
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


export interface SelectOption {
  id: string;
  label: string;
}
