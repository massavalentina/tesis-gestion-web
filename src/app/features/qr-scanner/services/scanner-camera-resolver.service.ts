import { Injectable } from '@angular/core';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { ScannerCameraOption } from '../models/scanner-camera.model';
import {
  getBestRearScannerCamera,
  getNextScannerCamera,
  isGenericCameraLabel,
  mapMediaDeviceToScannerCamera,
  sortScannerCameras
} from '../utils/scanner-camera.utils';
import { ScannerCameraPreferenceService } from './scanner-camera-preference.service';

@Injectable({ providedIn: 'root' })
export class ScannerCameraResolverService {
  constructor(
    private readonly preferenceService: ScannerCameraPreferenceService
  ) {}

  async listAvailableCameras(): Promise<ScannerCameraOption[]> {
    try {
      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      const rememberedDeviceId = this.preferenceService.getPreferredDeviceId();

      return devices
        .map(device => mapMediaDeviceToScannerCamera(device, rememberedDeviceId))
        .sort(sortScannerCameras);
    } catch {
      return [];
    }
  }

  resolveInitialDeviceId(devices: ScannerCameraOption[]): string | null {
    const remembered = devices.find(device => device.isRemembered);
    if (remembered) return remembered.deviceId;

    const bestRear = getBestRearScannerCamera(devices);
    if (!bestRear) return null;

    if (bestRear.score >= 6) {
      return bestRear.deviceId;
    }

    if (!isGenericCameraLabel(bestRear.label)) {
      return bestRear.deviceId;
    }

    return null;
  }

  shouldPromoteRearCamera(
    devices: ScannerCameraOption[],
    activeDeviceId: string | null
  ): boolean {
    if (!activeDeviceId) return false;

    const active = devices.find(device => device.deviceId === activeDeviceId);
    const rear = getBestRearScannerCamera(devices);

    if (!active || !rear || rear.deviceId === activeDeviceId) {
      return false;
    }

    return active.facing !== 'rear' && rear.score >= 6;
  }

  getBestRearDeviceId(devices: ScannerCameraOption[]): string | null {
    return getBestRearScannerCamera(devices)?.deviceId ?? null;
  }

  getNextDevice(
    devices: ScannerCameraOption[],
    activeDeviceId: string | null
  ): ScannerCameraOption | null {
    return getNextScannerCamera(devices, activeDeviceId);
  }

  rememberDevice(deviceId: string): void {
    this.preferenceService.rememberDevice(deviceId);
  }
}
