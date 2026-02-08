import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-success-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="success-dialog">
      <div class="icon">
        <mat-icon>check_circle</mat-icon>
      </div>

      <h2>Éxito</h2>

      <p>{{ data.message }}</p>

      <button mat-raised-button color="primary" (click)="close()">
        Aceptar
      </button>
    </div>
  `,
  styles: [`
    .success-dialog {
      text-align: center;
      padding: 24px;
      border-radius: 24px;
      background: white;
      max-width: 320px;
    }

    .icon mat-icon {
      font-size: 48px;
      color: #2e7d32;
    }

    h2 {
      margin: 12px 0;
      color: #2e7d32;
    }

    p {
      margin-bottom: 20px;
      font-weight: 500;
    }
  `]
})
export class SuccessDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<SuccessDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { message: string }
  ) {}

  close() {
    this.dialogRef.close();
  }
}
