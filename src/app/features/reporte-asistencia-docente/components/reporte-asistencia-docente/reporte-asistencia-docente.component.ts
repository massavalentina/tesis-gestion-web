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

import { ReporteAsistenciaDocenteService } from '../../services/reporte-asistencia-docente.service';
import { FichaAlumnoService } from '../../../ficha-alumno/services/ficha-alumno.service';
import { ReporteDocenteItem } from '../../models/reporte-asistencia-docente.model';
import { EspacioCurricular } from '../../models/espacio-curricular.model';
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
  selector: 'app-reporte-asistencia-docente',
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
  templateUrl: './reporte-asistencia-docente.component.html',
  styleUrl: './reporte-asistencia-docente.component.css',
})
export class ReporteAsistenciaDocenteComponent implements OnInit {
  @ViewChild(MatSort) set matSort(sort: MatSort) {
    if (sort) this.dataSource.sort = sort;
  }

  cursos: CursoFicha[] = [];
  cursoSeleccionado: CursoFicha | null = null;
  espacios: EspacioCurricular[] = [];
  espacioSeleccionado: EspacioCurricular | null = null;

  fechaDesde: Date | null = null;
  fechaHasta: Date | null = null;
  busqueda = '';

  cargandoCursos = true;
  cargandoEspacios = false;
  cargando = false;
  errorCursos = false;
  errorEspacios = false;
  errorReporte = false;

  totalClasesDictadas = 0;
  nombreEspacio = '';
  dataSource = new MatTableDataSource<ReporteDocenteItem>([]);
  columnas = [
    'estudiante',
    'dni',
    'presencias',
    'inasistencias',
    'porcentajeAsistencia',
    'condicion',
  ];

  constructor(
    private docenteService: ReporteAsistenciaDocenteService,
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
        case 'porcentajeAsistencia': return item.porcentajeAsistencia;
        case 'condicion': return item.porcentajeAsistencia;
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
    const estadoEspacioId = q.get('reporteState_espacioId');
    const estadoFechaDesde = q.get('reporteState_fechaDesde');
    const estadoFechaHasta = q.get('reporteState_fechaHasta');

    this.fichaService.getCursos().pipe(
      catchError(() => {
        this.errorCursos = true;
        this.cargandoCursos = false;
        return of([]);
      })
    ).subscribe((cursos) => {
      this.cursos = cursos;
      this.cargandoCursos = false;

      if (estadoCursoId) {
        this.cursoSeleccionado = cursos.find(c => c.idCurso === estadoCursoId) ?? null;
        if (estadoFechaDesde) this.fechaDesde = new Date(estadoFechaDesde + 'T00:00:00');
        if (estadoFechaHasta) this.fechaHasta = new Date(estadoFechaHasta + 'T00:00:00');
        if (this.cursoSeleccionado) {
          this.cargarEspacios(estadoEspacioId ?? null);
        }
      }
    });
  }

  onCursoChange(): void {
    this.espacioSeleccionado = null;
    this.espacios = [];
    this.dataSource.data = [];
    this.nombreEspacio = '';
    if (!this.cursoSeleccionado) return;
    this.cargarEspacios(null);
  }

  cargarEspacios(preseleccionarId: string | null): void {
    if (!this.cursoSeleccionado) return;
    this.cargandoEspacios = true;
    this.errorEspacios = false;

    this.docenteService.getEspaciosCurriculares(this.cursoSeleccionado.idCurso).pipe(
      catchError(() => {
        this.errorEspacios = true;
        this.cargandoEspacios = false;
        return of([]);
      })
    ).subscribe((espacios) => {
      this.espacios = espacios;
      this.cargandoEspacios = false;
      if (preseleccionarId) {
        this.espacioSeleccionado = espacios.find(e => e.idEC === preseleccionarId) ?? null;
        if (this.espacioSeleccionado) this.cargarReporte();
      }
    });
  }

  onEspacioChange(): void {
    if (!this.espacioSeleccionado) return;
    this.cargarReporte();
  }

  onBusquedaChange(): void {
    this.dataSource.filter = this.busqueda.trim();
  }

  cargarReporte(): void {
    if (!this.cursoSeleccionado || !this.espacioSeleccionado) return;
    this.cargando = true;
    this.errorReporte = false;

    const desde = this.fechaDesde ? this.toIsoDate(this.fechaDesde) : undefined;
    const hasta = this.fechaHasta ? this.toIsoDate(this.fechaHasta) : undefined;

    this.docenteService.getReporteEspacio(
      this.espacioSeleccionado.idEC,
      this.cursoSeleccionado.idCurso,
      desde,
      hasta
    ).pipe(
      catchError(() => {
        this.errorReporte = true;
        this.cargando = false;
        return of({ totalClasesDictadas: 0, nombreEspacio: '', estudiantes: [] });
      })
    ).subscribe((resp) => {
      this.totalClasesDictadas = resp.totalClasesDictadas;
      this.nombreEspacio = resp.nombreEspacio;
      this.dataSource.data = resp.estudiantes;
      this.cargando = false;
    });
  }

  limpiarFiltros(): void {
    this.fechaDesde = null;
    this.fechaHasta = null;
    if (this.cursoSeleccionado && this.espacioSeleccionado) this.cargarReporte();
  }

  verDetalle(est: ReporteDocenteItem): void {
    const desde = this.fechaDesde ? this.toIsoDate(this.fechaDesde) : null;
    const hasta = this.fechaHasta ? this.toIsoDate(this.fechaHasta) : null;

    const queryParams: Record<string, string> = {
      nombre: est.nombre,
      apellido: est.apellido,
      documento: est.documento,
      presencias: est.presencias.toString(),
      inasistencias: est.inasistencias.toString(),
      llegadasTarde: est.llegadasTarde.toString(),
      retirosAnticipados: est.retirosAnticipados.toString(),
      porcentajeAsistencia: est.porcentajeAsistencia.toString(),
      teaGeneral: est.teaGeneral.toString(),
      nombreEspacio: this.nombreEspacio,
      cursoCodigo: this.cursoSeleccionado!.codigo,
      reporteState_cursoId: this.cursoSeleccionado!.idCurso,
      reporteState_espacioId: this.espacioSeleccionado!.idEC,
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
      ['/reporte-asistencia-docente/detalle', est.idEstudiante, this.espacioSeleccionado!.idEC],
      { queryParams }
    );
  }

  exportarPdf(): void {
    if (!this.cursoSeleccionado || !this.espacioSeleccionado) return;
    this.pdfService.exportarReporteDocente({
      cursoCodigo: this.cursoSeleccionado.codigo,
      nombreEspacio: this.nombreEspacio,
      totalClasesDictadas: this.totalClasesDictadas,
      fechaDesde: this.fechaDesde ? this.toIsoDate(this.fechaDesde) : null,
      fechaHasta: this.fechaHasta ? this.toIsoDate(this.fechaHasta) : null,
      estudiantes: this.dataSource.filteredData,
    });
  }

  getBadgeClase(porcentaje: number, teaGeneral: boolean): string {
    if (teaGeneral) return 'badge-tea';
    if (porcentaje >= 85) return 'badge-verde';
    if (porcentaje >= 80) return 'badge-amarillo';
    if (porcentaje >= 75) return 'badge-naranja';
    return 'badge-rojo';
  }

  getCondicion(porcentaje: number, teaGeneral: boolean): string {
    if (teaGeneral) return 'TEA';
    if (porcentaje >= 85) return 'Regular';
    if (porcentaje >= 75) return 'Riesgo';
    return 'TEA';
  }

  getCondicionClase(porcentaje: number, teaGeneral: boolean): string {
    if (teaGeneral) return 'condicion-tea';
    if (porcentaje >= 85) return 'condicion-regular';
    if (porcentaje >= 75) return 'condicion-riesgo';
    return 'condicion-tea';
  }

  private toIsoDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
