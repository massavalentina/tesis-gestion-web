import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScanConfigComponent } from '../components/scanner-config.component';
import { ScanConfig, Turno } from '../models/scanner.models';
import { QrScannerService } from '../services/scanner.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-attendance-scan-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    ScanConfigComponent
  ],
  template: `
    <!-- CONFIGURACIÓN -->
    <div class="page-content">
  <app-scan-config #config></app-scan-config>
</div>

    <!-- SCANNER (solo visible cuando está activo) -->
    <div *ngIf="scannerActive" class="scanner-container">
      <video #video autoplay muted playsinline></video>
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

    <!-- mini warning -->
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

  turno!: Turno;
  attendanceTypeId!: number;

  constructor(private scanner: QrScannerService) {}

  onStartScan(configComponent: ScanConfigComponent): void {
    const config: ScanConfig | null = configComponent.getConfig();
    if (!config) return;

    this.turno = config.turno;
    this.attendanceTypeId = config.attendanceTypeId;

    this.scannerActive = true;

    this.scanner.start(this.video, qr => this.onQrScanned(qr));
  }

  onQrScanned(qr: string): void {
    this.scanner.stop();

    console.log('QR escaneado:', qr);
    console.log('Turno:', this.turno);
    console.log('Tipo asistencia:', this.attendanceTypeId);


    navigator.vibrate?.(150);

    setTimeout(() => {
      this.scanner.start(this.video, qr => this.onQrScanned(qr));
    }, 1200);
  }

  showScanWarning = false;

onScanButtonClick(configComponent: ScanConfigComponent): void {
  if (!configComponent.isValid() || this.scannerActive) {
    this.showTemporaryWarning();
    return;
  }

  this.onStartScan(configComponent);
}

private showTemporaryWarning(): void {
  this.showScanWarning = true;

  setTimeout(() => {
    this.showScanWarning = false;
  }, 2000);
}

}


