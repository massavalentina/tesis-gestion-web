import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AttendanceScanRequest,
  AttendanceScanResponse,
  Turno
} from '../models/scanner.models';

@Injectable({ providedIn: 'root' })
export class AttendanceService {

  private readonly baseUrl = 'http://localhost:5050/api/attendance';

  constructor(private http: HttpClient) {}

  scan(request: AttendanceScanRequest): Observable<AttendanceScanResponse> {
    return this.http.post<AttendanceScanResponse>(
      `${this.baseUrl}/scan`,
      request
    );
  }


   preview(qr: string): Observable<AttendanceScanResponse> {
    return this.http.post<AttendanceScanResponse>(
      `${this.baseUrl}/preview`,
      { qr }
    );
  }

  // 💾 CONFIRMAR — guarda todas las asistencias
  confirm(payload: {
    turno: Turno;
    attendanceTypeId: string;
    studentIds: string[];
  }): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/confirm`,
      payload
    );
  }

}
