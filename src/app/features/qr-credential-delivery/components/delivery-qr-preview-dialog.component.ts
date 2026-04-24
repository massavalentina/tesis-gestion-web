import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { QrCredentialPreviewCardComponent } from '../../credenciales-qr/components/qr-credential-preview-card.component';

export interface DatosPreviewQrAlumno {
  nombreCompleto: string;
  imageUrl: string;
}

@Component({
  selector: 'app-delivery-qr-preview-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, QrCredentialPreviewCardComponent],
  template: `
    <div class="dlg">
      <h2>Preview QR</h2>
      <app-qr-credential-preview-card
        [nombreCompleto]="data.nombreCompleto"
        [imageUrl]="data.imageUrl">
      </app-qr-credential-preview-card>

      <mat-dialog-actions align="end">
        <button mat-raised-button color="primary" (click)="cerrar()">Cerrar</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dlg { color: #0f2f4b; max-width: 92vw; }
    h2 { margin: 0; font-size: 24px; font-weight: 900; line-height: 1.15; }
  `]
})
export class DialogoPreviewQrAlumnoComponent {
  constructor(
    private dialogRef: MatDialogRef<DialogoPreviewQrAlumnoComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DatosPreviewQrAlumno
  ) {}

  cerrar(): void {
    this.dialogRef.close();
  }
}
