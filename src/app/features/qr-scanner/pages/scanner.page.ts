import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScanConfigComponent } from '../components/scanner-config.component';
import { AttendanceScanResponse, ScanConfig, ScannedStudent, Turno } from '../models/scanner.models';
import { QrScannerService } from '../services/scanner.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AttendanceService } from '../services/attendance.service';
import { MatDialog } from '@angular/material/dialog';
import { ScanConfirmDialogComponent } from '../components/scan-confirm-dialog.component';
import { ScanErrorDialogComponent } from '../components/scan-error-dialog.component';
import { SuccessDialogComponent } from '../components/success-dialog.component';
import { ConfirmRegisterDialogComponent } from '../components/confirm-register-dialog.component';
import { CancelRegisterDialogComponent } from '../components/cancel-register-dialog.component';
import { MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-attendance-scan-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    ScanConfigComponent,
    MatDialogModule
  ],
  template: `
    <!-- CONFIGURACIÓN -->
    <div class="page-content">
    <app-scan-config
      #config
      [canSubmit]="scannedStudents.length > 0 && !scannerActive"
      (confirmRegister)="confirmRegister()"
      (cancelRegister)="cancelRegister()">
    </app-scan-config>
    </div>
    <!-- SCANNER -->
    <div *ngIf="scannerActive" class="scanner-container">
    <button class="close-scanner" (click)="closeScanner()">✕</button>

      <video #video autoplay muted playsinline></video>
    </div>

    <div class="scan-counter" *ngIf="scannedStudents.length > 0">
      {{ scannedStudents.length }} alumno(s) escaneado(s)
    </div>

    <!-- BOTTOM NAVBAR -->
    <div class="bottom-bar">
      <button
        mat-fab
        color="primary"
        class="scan-btn"
        [class.disabled]="!config.isValid() || scannerActive"
        (click)="onScanButtonClick(config)">
        <mat-icon>qr_code_scanner</mat-icon>
      </button>

      <div class="scan-warning" *ngIf="showScanWarning">
        ⚠️ Completá los campos para comenzar
      </div>
    </div>
  `,
  styleUrls: ['../scss/scanner.page.scss']
  })
  
export class AttendanceScanPage {
  

  @ViewChild('video') video!: ElementRef<HTMLVideoElement>;

  scannerActive = false;
  isProcessing = false;

  turno!: Turno;
  attendanceTypeId!: string;

  constructor(private scanner: QrScannerService, private attendanceService: AttendanceService, private dialog: MatDialog
  ) {}

  scannedStudents: ScannedStudent[] = [];

  onStartScan(configComponent: ScanConfigComponent): void {
  const config: ScanConfig | null = configComponent.getConfig();
  if (!config) return;

  this.turno = config.turno;
  this.attendanceTypeId = config.attendanceTypeId;

  this.scannerActive = true;

  setTimeout(() => {
    console.log('Video element:', this.video); 
    this.scanner.start(this.video, qr => this.onQrScanned(qr));
    }, 0);
  }

  resumeScanner() {
    this.isProcessing = false;

    setTimeout(() => {
      this.scanner.start(this.video, qr => this.onQrScanned(qr));
      }, 500);
  }

  addStudentToSession(res: AttendanceScanResponse) {
    const alreadyAdded = this.scannedStudents.some(
      s => s.id === res.student.id
    );

    if (alreadyAdded) {
      this.dialog.open(ScanErrorDialogComponent, {
        disableClose: true,
        data: {
          title: 'Atención',
          message: 'Este alumno ya fue escaneado en esta sesión'
        }
      });
      return;
    }

    this.scannedStudents.push({
      id: res.student.id,
      name: res.student.name,
      lastName: res.student.lastName,
      course: res.student.course
      });
      navigator.vibrate?.(150);
    }


  openConfirmDialog(res: AttendanceScanResponse) {
    const dialogRef = this.dialog.open(ScanConfirmDialogComponent, {
      disableClose: true,
      data: {
        name: res.student.name,
        lastName: res.student.lastName,
        course: res.student.course,
        turno: this.turno,
        attendanceType: this.attendanceTypeId
      }
    });

  dialogRef.afterClosed().subscribe((accepted: boolean) => {
    if (accepted) {
      this.addStudentToSession(res); 
    }
    this.resumeScanner();
    });
  }


  onQrScanned(qr: string): void {
    if (this.isProcessing) return;
    this.isProcessing = true;

    this.scanner.stop();

    this.attendanceService.preview(qr).subscribe({
      next: (res) => {
        this.openConfirmDialog(res);
      },
      error: (err) => {
        const apiError = err?.error;

        this.dialog.open(ScanErrorDialogComponent, {
          disableClose: true,
          data: {
            title: 'Atención',
            message: apiError?.message ?? 'Código no reconocido'
          }
        }).afterClosed().subscribe(() => {
          this.resumeScanner();
        });
      }
    });
  }

  showScanWarning = false;

  onScanButtonClick(configComponent: ScanConfigComponent): void {
  console.log('CLICK scan');

  if (!configComponent.isValid() || this.scannerActive) {
    console.log('Config inválida o scanner activo');
    this.showTemporaryWarning();
    return;
  }

  console.log('Config válida, iniciando scan');
    this.onStartScan(configComponent);
  }


  private showTemporaryWarning(): void {
    this.showScanWarning = true;

  setTimeout(() => {
    this.showScanWarning = false;
    }, 2000);
  }

  closeScanner() {
    this.scanner.stop();
    this.scannerActive = false;
    this.isProcessing = false;
  }

  resetSession() {
    this.scannedStudents = [];
    this.scannerActive = false;
    this.isProcessing = false;
  }

  persistAttendance() {
    const payload = {
      turno: this.turno,
      attendanceTypeId: this.attendanceTypeId,
      studentIds: this.scannedStudents.map(s => s.id)
    };

    this.attendanceService.confirm(payload).subscribe({
      next: () => {
        this.dialog.open(SuccessDialogComponent, {
          disableClose: true,
          data: { message: 'Asistencias cargadas correctamente' }
        }).afterClosed().subscribe(() => {
          this.resetSession();
        });
      },
      error: (err) => {
        this.dialog.open(ScanErrorDialogComponent, {
          disableClose: true,
          data: {
            title: 'Error',
            message: err?.error?.message ?? 'Error al cargar asistencias'
          }
        });
      }
    });
  }

  confirmRegister() {
    const dialogRef = this.dialog.open(ConfirmRegisterDialogComponent, {
      disableClose: true,
      data: {
        course: this.scannedStudents[0]?.course,
        turno: this.turno,
        attendanceType: this.attendanceTypeId,
        scannedCount: this.scannedStudents.length,
        totalStudents: 30 
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.persistAttendance();
      }
    });
  }

cancelRegister() {
  const dialogRef = this.dialog.open(CancelRegisterDialogComponent, {
    disableClose: true
  });

  dialogRef.afterClosed().subscribe((confirmed: boolean) => {
    if (confirmed) {
      this.resetSession();
    }
    });
  }

}


