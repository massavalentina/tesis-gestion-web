import { Component, Injectable, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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

import { ReporteAsistenciaService } from '../../services/reporte-asistencia.service';
import { FichaAlumnoService } from '../../../ficha-alumno/services/ficha-alumno.service';
import { ReporteAsistenciaItem } from '../../models/reporte-asistencia.model';
import { CursoFicha } from '../../../ficha-alumno/models/curso-ficha.model';
import { PdfReporteService } from '../../../../core/services/pdf-reporte.service';

// ── Adaptador de fecha DD/MM/YYYY en español (mismo que AsistenciaGeneralManual) ──
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
  selector: 'app-reporte-asistencia',
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
  templateUrl: './reporte-asistencia.component.html',
  styleUrl: './reporte-asistencia.component.css',
})
export class ReporteAsistenciaComponent implements OnInit {
  @ViewChild(MatSort) set matSort(sort: MatSort) {
    if (sort) {
      this.dataSource.sort = sort;
    }
  }

  cursos: CursoFicha[] = [];
  cursoSeleccionado: CursoFicha | null = null;

  fechaDesde: Date | null = null;
  fechaHasta: Date | null = null;
  busqueda = '';

  cargandoCursos = true;
  cargando = false;
  errorCursos = false;
  errorReporte = false;

  totalDiasDictados = 0;
  dataSource = new MatTableDataSource<ReporteAsistenciaItem>([]);
  columnas = [
    'estudiante',
    'dni',
    'presencias',
    'inasistencias',
    'llegadasTarde',
    'ausentePorLLT',
    'retirosAnticipados',
    'retirosExpress',
    'retirosAnticipadosExtendidos',
  ];

  constructor(
    private reporteService: ReporteAsistenciaService,
    private fichaService: FichaAlumnoService,
    private router: Router,
    private route: ActivatedRoute,
    private pdfService: PdfReporteService
  ) {}

  ngOnInit(): void {
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'estudiante': return `${item.apellido} ${item.nombre}`;
        case 'dni': return item.documento;
        case 'presencias': return item.presencias;
        case 'inasistencias': return item.inasistencias;
        case 'llegadasTarde': return item.llegadasTarde;
        case 'ausentePorLLT': return item.ausentePorLLT;
        case 'retirosAnticipados': return item.retirosAnticipados;
        case 'retirosExpress': return item.retirosExpress ?? 0;
        case 'retirosAnticipadosExtendidos': return item.retirosAnticipadosExtendidos ?? 0;
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

    const q = this.route.snapshot.queryParamMap;
    const estadoCursoId = q.get('reporteState_cursoId');
    const estadoFechaDesde = q.get('reporteState_fechaDesde');
    const estadoFechaHasta = q.get('reporteState_fechaHasta');

    this.fichaService
      .getCursos()
      .pipe(
        catchError(() => {
          this.errorCursos = true;
          this.cargandoCursos = false;
          return of([]);
        })
      )
      .subscribe((cursos) => {
        this.cursos = cursos;
        this.cargandoCursos = false;

        if (estadoCursoId) {
          this.cursoSeleccionado = cursos.find(c => c.idCurso === estadoCursoId) ?? null;
          if (estadoFechaDesde) this.fechaDesde = new Date(estadoFechaDesde + 'T00:00:00');
          if (estadoFechaHasta) this.fechaHasta = new Date(estadoFechaHasta + 'T00:00:00');
          if (this.cursoSeleccionado) this.cargarReporte();
        }
      });
  }

  onCursoChange(): void {
    if (!this.cursoSeleccionado) return;
    this.cargarReporte();
  }

  onBusquedaChange(): void {
    this.dataSource.filter = this.busqueda.trim();
  }

  cargarReporte(): void {
    if (!this.cursoSeleccionado) return;
    this.cargando = true;
    this.errorReporte = false;

    const desde = this.fechaDesde ? this.toIsoDate(this.fechaDesde) : undefined;
    const hasta = this.fechaHasta ? this.toIsoDate(this.fechaHasta) : undefined;

    this.reporteService
      .getReporteCurso(this.cursoSeleccionado.idCurso, desde, hasta)
      .pipe(
        catchError(() => {
          this.errorReporte = true;
          this.cargando = false;
          return of({ totalDiasDictados: 0, estudiantes: [] });
        })
      )
      .subscribe((resp) => {
        this.totalDiasDictados = resp.totalDiasDictados;
        this.dataSource.data = resp.estudiantes;
        this.cargando = false;
      });
  }

  limpiarFiltros(): void {
    this.fechaDesde = null;
    this.fechaHasta = null;
    if (this.cursoSeleccionado) this.cargarReporte();
  }

  verDetalle(est: ReporteAsistenciaItem): void {
    const desde = this.fechaDesde ? this.toIsoDate(this.fechaDesde) : null;
    const hasta = this.fechaHasta ? this.toIsoDate(this.fechaHasta) : null;

    const queryParams: Record<string, string> = {
      nombre: est.nombre,
      apellido: est.apellido,
      documento: est.documento,
      presencias: est.presencias.toString(),
      inasistencias: est.inasistencias.toString(),
      llegadasTarde: est.llegadasTarde.toString(),
      ausentePorLLT: est.ausentePorLLT.toString(),
      retirosAnticipados: est.retirosAnticipados.toString(),
      retirosExpress: (est.retirosExpress ?? 0).toString(),
      retirosAnticipadosExtendidos: (est.retirosAnticipadosExtendidos ?? 0).toString(),
      porcentajeAsistencia: est.porcentajeAsistencia.toString(),
      teaGeneral: est.teaGeneral.toString(),
      origen: 'reporte',
      reporteState_cursoId: this.cursoSeleccionado!.idCurso,
    };
    if (desde) {
      queryParams['desde'] = desde;
      queryParams['reporteState_fechaDesde'] = desde;
    }
    if (hasta) {
      queryParams['hasta'] = hasta;
      queryParams['reporteState_fechaHasta'] = hasta;
    }

    this.router.navigate(
      ['/reporte-asistencia/detalle', est.idEstudiante],
      { queryParams }
    );
  }

  exportarPdf(): void {
    if (!this.cursoSeleccionado) return;
    this.pdfService.exportarReporteCurso({
      cursoCodigo: this.cursoSeleccionado.codigo,
      totalDiasDictados: this.totalDiasDictados,
      fechaDesde: this.fechaDesde ? this.toIsoDate(this.fechaDesde) : null,
      fechaHasta: this.fechaHasta ? this.toIsoDate(this.fechaHasta) : null,
      estudiantes: this.dataSource.filteredData,
    });
  }

  getBadgeClase(inasistencias: number, teaGeneral: boolean): string {
    if (teaGeneral) return 'badge-tea';
    if (inasistencias >= 21) return 'badge-rojo';
    if (inasistencias >= 15) return 'badge-naranja';
    if (inasistencias >= 10) return 'badge-amarillo';
    return 'badge-verde';
  }

  private toIsoDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
