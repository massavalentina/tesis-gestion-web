import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  DataZoomComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  BarChart, LineChart, PieChart,
  TitleComponent, TooltipComponent, GridComponent, LegendComponent, MarkLineComponent,
  DataZoomComponent,
  CanvasRenderer,
]);

export interface ChartFullscreenData {
  options: EChartsOption;
  titulo: string;
}

@Component({
  selector: 'app-chart-fullscreen-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  template: `
    <div class="fullscreen-dialog">
      <div class="fullscreen-header">
        <h2>{{ data.titulo }}</h2>
        <button mat-icon-button mat-dialog-close>
          <mat-icon>close</mat-icon>
        </button>
      </div>
      <div class="fullscreen-chart" echarts [options]="data.options"></div>
    </div>
  `,
  styles: [`
    .fullscreen-dialog {
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: 8px 16px 16px;
      box-sizing: border-box;
    }
    .fullscreen-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .fullscreen-header h2 {
      font-family: 'Open Sans', sans-serif;
      font-weight: 600;
      font-size: 1.1rem;
      margin: 0;
      color: #1e293b;
    }
    .fullscreen-chart {
      flex: 1;
      width: 100%;
      min-height: 0;
    }
  `],
})
export class ChartFullscreenDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: ChartFullscreenData) {}
}
