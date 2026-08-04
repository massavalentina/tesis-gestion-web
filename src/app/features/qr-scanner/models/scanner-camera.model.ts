export type ScannerCameraFacing = 'rear' | 'front' | 'unknown';

export interface ScannerCameraOption {
  deviceId: string;
  label: string;
  facing: ScannerCameraFacing;
  score: number;
  isRemembered: boolean;
}

export interface ScannerCameraSession {
  devices: ScannerCameraOption[];
  activeDeviceId: string | null;
}
