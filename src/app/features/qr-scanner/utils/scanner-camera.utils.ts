import { ScannerCameraFacing, ScannerCameraOption } from '../models/scanner-camera.model';

const REAR_KEYWORDS = [
  'back',
  'rear',
  'environment',
  'trasera',
  'traseira',
  'posterior',
  'world',
  'wide',
  'ultra wide'
];

const FRONT_KEYWORDS = [
  'front',
  'user',
  'frontal',
  'selfie',
  'facetime'
];

export function mapMediaDeviceToScannerCamera(
  device: MediaDeviceInfo,
  rememberedDeviceId: string | null
): ScannerCameraOption {
  const label = (device.label ?? '').trim() || 'Cámara disponible';
  const normalizedLabel = normalizeCameraLabel(label);
  const facing = inferScannerCameraFacing(normalizedLabel);
  const score = scoreScannerCamera(normalizedLabel, facing);

  return {
    deviceId: device.deviceId,
    label,
    facing,
    score,
    isRemembered: rememberedDeviceId === device.deviceId
  };
}

export function sortScannerCameras(a: ScannerCameraOption, b: ScannerCameraOption): number {
  if (a.isRemembered !== b.isRemembered) {
    return a.isRemembered ? -1 : 1;
  }

  if (a.facing !== b.facing) {
    return facingRank(b.facing) - facingRank(a.facing);
  }

  if (a.score !== b.score) {
    return b.score - a.score;
  }

  return a.label.localeCompare(b.label);
}

export function getNextScannerCamera(
  devices: ScannerCameraOption[],
  activeDeviceId: string | null
): ScannerCameraOption | null {
  if (devices.length < 2) return null;

  const currentIndex = devices.findIndex(device => device.deviceId === activeDeviceId);
  const nextIndex = currentIndex >= 0
    ? (currentIndex + 1) % devices.length
    : 0;

  return devices[nextIndex] ?? null;
}

export function getBestRearScannerCamera(
  devices: ScannerCameraOption[]
): ScannerCameraOption | null {
  return devices.find(device => device.facing === 'rear') ?? null;
}

export function isGenericCameraLabel(label: string): boolean {
  const normalized = normalizeCameraLabel(label);
  return normalized === 'camara disponible'
    || normalized.startsWith('video device')
    || normalized.startsWith('camera ')
    || normalized.startsWith('camara ');
}

function inferScannerCameraFacing(label: string): ScannerCameraFacing {
  if (REAR_KEYWORDS.some(keyword => label.includes(keyword))) {
    return 'rear';
  }

  if (FRONT_KEYWORDS.some(keyword => label.includes(keyword))) {
    return 'front';
  }

  return 'unknown';
}

function scoreScannerCamera(label: string, facing: ScannerCameraFacing): number {
  let score = facing === 'rear' ? 4 : facing === 'front' ? 1 : 2;

  if (label.includes('environment')) score += 4;
  if (label.includes('back') || label.includes('rear')) score += 3;
  if (label.includes('wide')) score += 1;
  if (label.includes('ultra wide')) score += 1;
  if (label.includes('front') || label.includes('user') || label.includes('selfie')) score -= 2;

  return score;
}

function facingRank(facing: ScannerCameraFacing): number {
  switch (facing) {
    case 'rear':
      return 3;
    case 'unknown':
      return 2;
    case 'front':
      return 1;
    default:
      return 0;
  }
}

function normalizeCameraLabel(label: string): string {
  return (label ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}
