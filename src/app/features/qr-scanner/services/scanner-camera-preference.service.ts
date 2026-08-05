import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ScannerCameraPreferenceService {
  private static readonly STORAGE_KEY = 'qr-scanner.preferred-camera-id';

  getPreferredDeviceId(): string | null {
    try {
      return localStorage.getItem(ScannerCameraPreferenceService.STORAGE_KEY);
    } catch {
      return null;
    }
  }

  rememberDevice(deviceId: string): void {
    if (!deviceId) return;

    try {
      localStorage.setItem(ScannerCameraPreferenceService.STORAGE_KEY, deviceId);
    } catch {
      // Ignore storage errors on restricted browsers.
    }
  }
}
