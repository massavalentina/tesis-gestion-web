import { Injectable, ElementRef } from '@angular/core';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';

@Injectable({ providedIn: 'root' })
export class ServicioEscanerQr {

  private lector = new BrowserMultiFormatReader();
  private controles?: IScannerControls;

  async iniciar(
    video: ElementRef<HTMLVideoElement>,
    alDetectarResultado: (qr: string) => void
  ) {
    const dispositivos = await BrowserMultiFormatReader.listVideoInputDevices();

    const camaraTrasera = dispositivos.find(dispositivo =>
      dispositivo.label.toLowerCase().includes('back') ||
      dispositivo.label.toLowerCase().includes('rear')
    );

    const idDispositivo = camaraTrasera?.deviceId ?? dispositivos[0]?.deviceId;

    this.controles = await this.lector.decodeFromVideoDevice(
      idDispositivo,
      video.nativeElement,
      (resultado) => {
        if (resultado) {
          alDetectarResultado(resultado.getText());
        }
      }
    );
  }

  detener() {
    this.controles?.stop();
  }
}
