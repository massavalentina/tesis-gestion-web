import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-proximamente',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="container">
      <div class="icon-wrap">
        <mat-icon>construction</mat-icon>
      </div>
      <h2>En construcción</h2>
      <p>Esta funcionalidad estará disponible próximamente.</p>
    </div>
  `,
  styles: [`
    .container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 24px;
      gap: 12px;
      text-align: center;
      font-family: 'Open Sans', sans-serif;
    }
    .icon-wrap {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 4px;
    }
    .icon-wrap mat-icon {
      font-size: 36px;
      height: 36px;
      width: 36px;
      color: #94a3b8;
    }
    h2 {
      margin: 0;
      font-size: 1.4rem;
      font-weight: 700;
      color: #0f172a;
    }
    p {
      margin: 0;
      font-size: 14px;
      color: #64748b;
      max-width: 320px;
    }
  `],
})
export class ProximamenteComponent {}
