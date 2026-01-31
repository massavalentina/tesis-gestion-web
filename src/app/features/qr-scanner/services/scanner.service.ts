import { Injectable, ElementRef } from '@angular/core';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';

@Injectable({ providedIn: 'root' })
export class QrScannerService {

  private reader = new BrowserMultiFormatReader();
  private controls?: IScannerControls;

  async start(
    video: ElementRef<HTMLVideoElement>,
    onResult: (qr: string) => void
  ) {
    const devices = await BrowserMultiFormatReader.listVideoInputDevices();

    const backCamera = devices.find(d =>
      d.label.toLowerCase().includes('back') ||
      d.label.toLowerCase().includes('rear')
    );

    const deviceId = backCamera?.deviceId ?? devices[0]?.deviceId;

    this.controls = await this.reader.decodeFromVideoDevice(
      deviceId,
      video.nativeElement,
      (result) => {
        if (result) {
          onResult(result.getText());
        }
      }
    );
  }

  stop() {
    this.controls?.stop();
  }
}
