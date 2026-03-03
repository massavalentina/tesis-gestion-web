import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface AsistenciaSuccessDialogData {
  mensaje: string;
}

@Component({
  standalone: true,
  selector: 'app-asistencia-success-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  styles: [`
    :host {
      display: block;
      font-family: 'Open Sans', sans-serif;
    }

    /* Igual que Confirm */
    .dlg {
      text-align: center;
      padding: 22px 20px 20px;
      border-radius: 34px;
      background: #ffffff;
      max-width: 360px;
      margin: auto;
    }

    .title {
      font-size: 20px;
      line-height: 1.25;
      font-weight: 800;
      margin: 0 0 12px;
    }

    .ok-wrap {
      display: flex;
      justify-content: center;
      margin: 6px 0 14px;
    }

    /* Botón OK = mismo tamaño que los del confirm */
    .round-btn {
      width: 62px;
      height: 62px;
      border-radius: 999px;
      min-width: 62px;
      border: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      background: #2E7D32;
      box-shadow: 0 12px 22px rgba(0,0,0,.18);
      transition: transform .08s ease, filter .15s ease;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }

    .round-btn:active {
      transform: scale(.96);
    }

    .round-btn mat-icon {
      color: #ffffff;
      font-size: 30px;
      width: 30px;
      height: 30px;
    }

    /* Mensaje con mismo estilo “subtexto” del confirm */
    .msg {
      font-size: 13px;
      opacity: .78;
      font-weight: 600;
      margin: 0;
      line-height: 1.35;
      word-break: break-word;
    }

    @media (max-width: 360px) {
      .dlg {
        padding: 18px 14px;
        border-radius: 28px;
      }

      .round-btn {
        width: 56px;
        height: 56px;
        min-width: 56px;
      }

      .round-btn mat-icon {
        font-size: 26px;
        width: 26px;
        height: 26px;
      }

      .title { font-size: 18px; }
    }
  `],
  template: `
    <div class="dlg" role="dialog" aria-modal="true" aria-label="Éxito">
      <h2 class="title">¡Operación realizada con éxito!</h2>

      <div class="ok-wrap">
        <button
          type="button"
          class="round-btn"
          (click)="cerrar()"
          aria-label="Aceptar"
          title="Aceptar"
        >
          <mat-icon>check</mat-icon>
        </button>
      </div>

      <div class="msg" *ngIf="data?.mensaje">
        {{ data.mensaje }}
      </div>
    </div>
  `,
  styles: [`
    /* ✅ Evita scroll interno que mete Angular Material por defecto */
    :host ::ng-deep .mat-mdc-dialog-content{
      max-height: none !important;
      overflow: visible !important;
    }

    :host ::ng-deep .mat-mdc-dialog-surface{
      overflow: visible !important;
    }

    .dlg {
      overflow-x: hidden;
      overflow-y: visible;
      max-width: 92vw;

      /* ✅ le damos un poquito más de alto para que no “aprete” */
      min-height: 220px;
      padding: 2px 2px;
    }

    .dlg__head{
      display:flex;
      gap:14px;
      align-items:flex-start;
      margin-bottom: 14px;
    }

    .dlg__icon{
      width: 46px;
      height: 46px;
      border-radius: 14px;
      display:grid;
      place-items:center;
      background:#c9f7d5;
      border:1px solid #c7d9eb;
      color:#1a4d2e;
      flex: 0 0 auto;
    }

    .dlg__icon mat-icon{
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .dlg__titles{
      flex:1;
      min-width:0;
    }

    .dlg__badge{
      display:inline-flex;
      align-items:center;
      padding:4px 10px;
      border-radius:999px;
      background:#c9f7d5;
      border:1px solid #c7d9eb;
      font-size:12px;
      font-weight: 900;
      color:#1a4d2e;
      margin-bottom: 8px;
    }

    h2{
      margin:0;
      font-weight: 1000;
      font-size: 18px;
      letter-spacing:-0.3px;
      color:#0f2f4b;
    }

    .dlg__sub{
      margin-top:6px;
      font-size:13px;
      color:rgba(15,47,75,.75);
      font-weight:600;
    }

    .dlg__body{
      margin-top: 10px;
    }

    .dlg__panel{
      padding: 14px 14px; /* ✅ un toque más de padding */
      border-radius: 16px;
      background:#ffffff;
      border:1px solid rgba(199,217,235,.85);
      box-shadow: 0 8px 18px rgba(0,0,0,0.04);
    }

    .dlg__panelTitle{
      font-size:12px;
      font-weight: 900;
      color:#3c78b4;
      margin-bottom: 6px;
    }

    .dlg__panelText{
      overflow-wrap: anywhere;
      word-break: break-word;
      white-space: pre-line; /* ✅ si viene con saltos de línea */
      line-height: 1.35;
      font-weight: 750;
      color: rgba(15,47,75,.85);
    }

    .dlg__actions{
      display:flex;
      justify-content:flex-end;
      margin-top: 16px;
    }

    .btn-primary{
      background-color: #3c78b4 !important;
      color: #fff !important;
      border-radius: 12px !important;
      font-weight: 900 !important;
      padding: 10px 16px !important;
      box-shadow: 0 10px 22px rgba(60,120,180,.22) !important;
    }

    @media (max-width: 600px){
      .dlg{
        min-width: 0;
        width: 100%;
        min-height: 240px; /* ✅ mobile suele apretar más */
      }
    }
  `]
})
export class AsistenciaSuccessDialogComponent {

  constructor(
    public dialogRef: MatDialogRef<AsistenciaSuccessDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AsistenciaSuccessDialogData
  ) {}

  cerrar() {
    this.dialogRef.close(true);
  }
}