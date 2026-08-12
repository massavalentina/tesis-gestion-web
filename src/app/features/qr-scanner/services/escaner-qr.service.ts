import { ElementRef, Injectable } from '@angular/core';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { ScannerCameraOption, ScannerCameraSession } from '../models/scanner-camera.model';
import { ScannerCameraResolverService } from './scanner-camera-resolver.service';

@Injectable({ providedIn: 'root' })
export class ServicioEscanerQr {
  private readonly lector = new BrowserMultiFormatReader();
  private controles?: IScannerControls;

  constructor(
    private readonly cameraResolver: ScannerCameraResolverService
  ) {}

  async iniciar(
    video: ElementRef<HTMLVideoElement>,
    alDetectarResultado: (qr: string) => void
  ): Promise<ScannerCameraSession> {
    const preview = video.nativeElement;
    const camerasBeforeStart = await this.cameraResolver.listAvailableCameras();
    const initialDeviceId = this.cameraResolver.resolveInitialDeviceId(camerasBeforeStart);

    let session = await this.iniciarSesion(preview, alDetectarResultado, initialDeviceId, true);

    if (this.cameraResolver.shouldPromoteRearCamera(session.devices, session.activeDeviceId)) {
      const rearDeviceId = this.cameraResolver.getBestRearDeviceId(session.devices);
      if (rearDeviceId && rearDeviceId !== session.activeDeviceId) {
        try {
          session = await this.iniciarSesion(preview, alDetectarResultado, rearDeviceId, false);
        } catch {
          // Keep the camera that was already opened if the rear retry fails.
        }
      }
    }

    return session;
  }

  async cambiarCamara(
    video: ElementRef<HTMLVideoElement>,
    alDetectarResultado: (qr: string) => void,
    targetDeviceId: string
  ): Promise<ScannerCameraSession> {
    const preview = video.nativeElement;
    const currentDeviceId = this.obtenerDispositivoActivo();

    if (currentDeviceId === targetDeviceId) {
      return {
        devices: await this.cameraResolver.listAvailableCameras(),
        activeDeviceId: currentDeviceId
      };
    }

    this.detener();

    try {
      return await this.iniciarSesion(preview, alDetectarResultado, targetDeviceId, false);
    } catch (error) {
      if (currentDeviceId && currentDeviceId !== targetDeviceId) {
        try {
          await this.iniciarSesion(preview, alDetectarResultado, currentDeviceId, false);
        } catch {
          // Keep original error from the requested camera change.
        }
      }

      throw error;
    }
  }

  obtenerSiguienteCamara(
    devices: ScannerCameraOption[],
    activeDeviceId: string | null
  ): ScannerCameraOption | null {
    return this.cameraResolver.getNextDevice(devices, activeDeviceId);
  }

  detener(): void {
    this.controles?.stop();
    this.controles = undefined;
  }

  private async iniciarSesion(
    preview: HTMLVideoElement,
    alDetectarResultado: (qr: string) => void,
    preferredDeviceId: string | null,
    allowEnvironmentFallback: boolean
  ): Promise<ScannerCameraSession> {
    await this.iniciarLectura(preview, alDetectarResultado, preferredDeviceId, allowEnvironmentFallback);

    const activeDeviceId = this.obtenerDispositivoActivo() ?? preferredDeviceId ?? null;
    if (activeDeviceId) {
      this.cameraResolver.rememberDevice(activeDeviceId);
    }

    const devices = await this.cameraResolver.listAvailableCameras();

    return {
      devices,
      activeDeviceId
    };
  }

  private async iniciarLectura(
    preview: HTMLVideoElement,
    alDetectarResultado: (qr: string) => void,
    preferredDeviceId: string | null,
    allowEnvironmentFallback: boolean
  ): Promise<void> {
    this.detener();

    try {
      this.controles = await this.lector.decodeFromVideoDevice(
        preferredDeviceId ?? undefined,
        preview,
        (resultado) => {
          if (resultado) {
            alDetectarResultado(resultado.getText());
          }
        }
      );
    } catch (error) {
      this.detener();

      if (allowEnvironmentFallback && preferredDeviceId) {
        this.controles = await this.lector.decodeFromVideoDevice(
          undefined,
          preview,
          (resultado) => {
            if (resultado) {
              alDetectarResultado(resultado.getText());
            }
          }
        );
        return;
      }

      throw error;
    }
  }

  private obtenerDispositivoActivo(): string | null {
    const settings = this.controles?.streamVideoSettingsGet?.(
      ((track: MediaStreamTrack) => track.kind === 'video') as any
    );

    return typeof settings?.deviceId === 'string' && settings.deviceId
      ? settings.deviceId
      : null;
  }
}
