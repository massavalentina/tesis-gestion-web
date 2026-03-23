import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

export interface DatosPreviewQrAlumno {
  nombreCompleto: string;
  imageUrl: string;
}

@Component({
  selector: 'app-delivery-qr-preview-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <div class="dlg">
      <h2>Preview QR</h2>
      <p>{{ data.nombreCompleto }}</p>

      <div class="image-wrap">
        <img [src]="data.imageUrl" alt="QR del alumno" />
      </div>

      <mat-dialog-actions align="end">
        <button mat-raised-button color="primary" (click)="cerrar()">Cerrar</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dlg { color: #0f2f4b; max-width: 92vw; }
    h2 { margin: 0; font-size: 24px; font-weight: 900; line-height: 1.15; }
    p { margin: 8px 0 14px; color: rgba(15, 47, 75, 0.74); }
    .image-wrap {
      border-radius: 14px;
      border: 1px solid #dce8f3;
      background: #fff;
      padding: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    img {
      width: min(100%, 320px);
      height: auto;
      border: 1px solid #dce8f3;
      border-radius: 10px;
      background: #fff;
      padding: 8px;
    }
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
