import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { PaginaGeneracionCredencialesQr } from '../../../qr-credential-generation/pages/qr-credential-generation.page';
import { PaginaEnvioCredencialesQr } from '../../../qr-credential-delivery/pages/qr-credential-delivery.page';
import { QrCredentialStatusTableComponent } from '../qr-credential-status-table.component';

@Component({
  selector: 'app-credenciales-qr',
  standalone: true,
  imports: [CommonModule, PaginaGeneracionCredencialesQr, PaginaEnvioCredencialesQr, QrCredentialStatusTableComponent],
  templateUrl: './credenciales-qr.component.html',
  styleUrls: ['./credenciales-qr.component.css']
})
export class CredencialesQrComponent {}
