import { Component, Injectable, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';

import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DATE_LOCALE,
  MatNativeDateModule,
  NativeDateAdapter,
  DateAdapter,
  MAT_DATE_FORMATS,
  MatDateFormats,
} from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ReporteRetirosService, OpcionCurso } from '../../services/reporte-retiros.service';
import { RetiroReporteItem } from '../../models/retiro-reporte-item.model';

@Injectable()
class DdMmYyyyDateAdapter extends NativeDateAdapter {
  override format(date: Date, displayFormat: object): string {
    if ((displayFormat as unknown as string) === 'input') {
      const d = String(date.getDate()).padStart(2, '0');
      const m = String(date.getMonth() + 1).padStart(2, '0');
      return `${d}/${m}/${date.getFullYear()}`;
    }
    return super.format(date, displayFormat);
  }
}

const DD_MM_YYYY: MatDateFormats = {
  parse:   { dateInput: { day: 'numeric', month: 'numeric', year: 'numeric' } },
  display: {
    dateInput:          'input',
    monthYearLabel:     { year: 'numeric', month: 'short'  },
    dateA11yLabel:      { year: 'numeric', month: 'long',  day: 'numeric' },
    monthYearA11yLabel: { year: 'numeric', month: 'long'   },
  },
};

@Component({
  selector: 'app-reporte-retiros',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTooltipModule,
  ],
  providers: [
    { provide: MAT_DATE_LOCALE,  useValue: 'es-AR'            },
    { provide: DateAdapter,      useClass: DdMmYyyyDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: DD_MM_YYYY          },
  ],
  templateUrl: './reporte-retiros.component.html',
  styleUrl: './reporte-retiros.component.css',
})
export class ReporteRetirosComponent implements OnInit {
  @ViewChild(MatSort) set matSort(sort: MatSort) {
    if (sort) this.dataSource.sort = sort;
  }

  cursos: OpcionCurso[] = [];
  cursoSeleccionado: OpcionCurso | null = null;

  fechaDesde: Date = new Date();
  fechaHasta: Date = new Date();
  busqueda = '';

  cargandoCursos = true;
  cargando = false;
  errorCursos = false;
  errorReporte = false;
  consultado = false;

  expandido: RetiroReporteItem | null = null;
  printTimestamp = '';

  dataSource = new MatTableDataSource<RetiroReporteItem>([]);
  columnas = [
    'estudiante',
    'dni',
    'curso',
    'fecha',
    'tipo',
    'estado',
    'horaSalida',
    'horaLimite',
    'horaReingreso',
    'expandir',
  ];
  columnasDetalle = ['detalle'];

  constructor(private service: ReporteRetirosService) {}

  get tieneReingreso(): boolean {
    return this.dataSource.data.some(i => i.conReingreso);
  }

  get printDesde(): string {
    return this.formatFecha(this.toIsoDate(this.fechaDesde));
  }

  get printHasta(): string {
    return this.formatFecha(this.toIsoDate(this.fechaHasta));
  }

  get printCursoLabel(): string {
    return this.cursoSeleccionado?.label ?? 'Todos los cursos';
  }

  ngOnInit(): void {
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'estudiante': return `${item.apellido} ${item.nombre}`;
        case 'dni': return item.documento;
        case 'curso': return item.curso;
        case 'fecha': return item.fecha;
        default: return '';
      }
    };
    this.dataSource.filterPredicate = (item, filter) => {
      const f = filter.toLowerCase();
      return (
        item.nombre.toLowerCase().includes(f) ||
        item.apellido.toLowerCase().includes(f) ||
        item.documento.toLowerCase().includes(f)
      );
    };

    this.service.getCursos().pipe(
      catchError(() => {
        this.errorCursos = true;
        this.cargandoCursos = false;
        return of([]);
      })
    ).subscribe(cursos => {
      this.cursos = cursos.sort((a, b) => a.label.localeCompare(b.label));
      this.cargandoCursos = false;
      this.cargarReporte();
    });
  }

  cargarReporte(): void {
    this.cargando = true;
    this.errorReporte = false;
    this.expandido = null;

    const desde = this.toIsoDate(this.fechaDesde);
    const hasta = this.toIsoDate(this.fechaHasta);

    this.service.getReporte(desde, hasta, this.cursoSeleccionado?.id).pipe(
      catchError(() => {
        this.errorReporte = true;
        this.cargando = false;
        this.consultado = true;
        return of([]);
      })
    ).subscribe(items => {
      this.dataSource.data = items;
      this.cargando = false;
      this.consultado = true;
    });
  }

  limpiarFiltros(): void {
    this.fechaDesde = new Date();
    this.fechaHasta = new Date();
    this.cursoSeleccionado = null;
    this.busqueda = '';
    this.dataSource.filter = '';
    this.dataSource.data = [];
    this.consultado = false;
    this.expandido = null;
  }

  onBusquedaChange(): void {
    this.dataSource.filter = this.busqueda.trim();
  }

  toggleExpand(item: RetiroReporteItem): void {
    this.expandido = this.expandido === item ? null : item;
  }

  imprimir(): void {
    const now = new Date();
    const p = (n: number) => n.toString().padStart(2, '0');
    this.printTimestamp = `${p(now.getDate())}/${p(now.getMonth() + 1)}/${now.getFullYear()} ${p(now.getHours())}:${p(now.getMinutes())}`;
    setTimeout(() => window.print(), 0);
  }

  formatFecha(iso: string): string {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  estadoBadgeClass(item: RetiroReporteItem): string {
    switch (item.etiquetaEstado) {
      case 'ConReingreso':     return 'badge-ambar';
      case 'Reingresado':      return 'badge-verde';
      case 'ReingresoVencido': return 'badge-rojo';
      default:                 return 'badge-gris';
    }
  }

  estadoLabel(item: RetiroReporteItem): string {
    switch (item.etiquetaEstado) {
      case 'ConReingreso':     return 'Con Reingreso';
      case 'Reingresado':      return 'Reingresado';
      case 'ReingresoVencido': return 'Reingreso Vencido';
      default:                 return 'Sin Reingreso';
    }
  }

  private toIsoDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
