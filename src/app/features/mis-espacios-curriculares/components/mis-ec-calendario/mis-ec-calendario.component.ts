import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { PlanificacionService } from '../../services/planificacion.service';
import { MisEspaciosCurricularesService } from '../../services/mis-espacios-curriculares.service';
import { MisEcItem } from '../../models/mis-ec.model';
import { ArbolPlanificacionDto, ClasePlanificacionDto } from '../../models/planificacion.model';

type ColorEvento = 'azul' | 'verde' | 'rojo';
type EstadoEvento = 'Planificada' | 'Dictada' | 'Sin dictar';

interface EventoCalendario {
  clase: ClasePlanificacionDto;
  color: ColorEvento;
  estadoLabel: EstadoEvento;
}

interface DiaCalendario {
  fecha: Date;
  enMes: boolean;
  key: string;
}

// Vista solo lectura, pensada para integrarse a futuro con el calendario institucional
// (desarrollado por otro equipo). Cuando esté disponible, se podrán sumar también
// las fechas de exámenes; por ahora solo se muestran las clases planificadas.

@Component({
  selector: 'app-mis-ec-calendario',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mis-ec-calendario.component.html',
  styleUrl: './mis-ec-calendario.component.scss',
})
export class MisEcCalendarioComponent implements OnInit {
  idEC = '';
  loading = true;
  error = '';
  arbol: ArbolPlanificacionDto | null = null;
  espacio: MisEcItem | null = null;

  get cursoLabel(): string {
    return this.espacio ? `${this.espacio.anioNumero}°${this.espacio.division}` : '';
  }

  mesActual = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  diaPopoverKey: string | null = null;

  private eventosPorDia = new Map<string, EventoCalendario[]>();

  readonly diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  private readonly nombresMes = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  constructor(
    private service: PlanificacionService,
    private ecService: MisEspaciosCurricularesService,
    private route: ActivatedRoute,
    private router: Router,
    private elementRef: ElementRef<HTMLElement>,
  ) {}

  ngOnInit(): void {
    this.idEC = this.route.snapshot.paramMap.get('idEC') ?? '';
    this.cargarArbol();
  }

  private cargarArbol(): void {
    this.loading = true;
    this.error = '';
    forkJoin({
      arbol: this.service.getArbol(this.idEC),
      espacio: this.ecService.getEspacioCurricularPorId(this.idEC).pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ arbol, espacio }) => {
        this.arbol = arbol;
        this.espacio = espacio;
        this.construirEventos();
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudo cargar el calendario. Verificá tu conexión e intentá de nuevo.';
        this.loading = false;
      },
    });
  }

  private construirEventos(): void {
    this.eventosPorDia.clear();
    if (!this.arbol) return;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    for (const unidad of this.arbol.unidades) {
      for (const tema of unidad.temas) {
        for (const clase of tema.clases) {
          if (clase.estado === 'Dado') {
            const fecha = clase.fechaDictada ?? clase.fechaEstimada;
            if (fecha) this.agregarEvento(fecha, { clase, color: 'verde', estadoLabel: 'Dictada' });
          } else if (clase.fechaEstimada) {
            const sinDictar = this.parseFecha(clase.fechaEstimada) < hoy;
            this.agregarEvento(clase.fechaEstimada, {
              clase,
              color: sinDictar ? 'rojo' : 'azul',
              estadoLabel: sinDictar ? 'Sin dictar' : 'Planificada',
            });
          }
        }
      }
    }
  }

  private agregarEvento(fechaIso: string, evento: EventoCalendario): void {
    const lista = this.eventosPorDia.get(fechaIso) ?? [];
    lista.push(evento);
    this.eventosPorDia.set(fechaIso, lista);
  }

  private parseFecha(iso: string): Date {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  private toKey(fecha: Date): string {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // ─── Grilla del mes ──────────────────────────────────────────────────────────

  get diasDelMes(): DiaCalendario[] {
    const year = this.mesActual.getFullYear();
    const month = this.mesActual.getMonth();
    const primerDia = new Date(year, month, 1);
    const ultimoDia = new Date(year, month + 1, 0);
    const offsetInicio = (primerDia.getDay() + 6) % 7; // lunes = 0

    const dias: DiaCalendario[] = [];

    for (let i = offsetInicio; i > 0; i--) {
      const d = new Date(year, month, 1 - i);
      dias.push({ fecha: d, enMes: false, key: this.toKey(d) });
    }
    for (let day = 1; day <= ultimoDia.getDate(); day++) {
      const d = new Date(year, month, day);
      dias.push({ fecha: d, enMes: true, key: this.toKey(d) });
    }
    while (dias.length % 7 !== 0) {
      const ultimaFecha = dias[dias.length - 1].fecha;
      const d = new Date(ultimaFecha.getFullYear(), ultimaFecha.getMonth(), ultimaFecha.getDate() + 1);
      dias.push({ fecha: d, enMes: false, key: this.toKey(d) });
    }
    return dias;
  }

  get nombreMes(): string { return this.nombresMes[this.mesActual.getMonth()]; }
  get anioActual(): number { return this.mesActual.getFullYear(); }

  mesAnterior(): void {
    this.mesActual = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() - 1, 1);
    this.diaPopoverKey = null;
  }

  mesSiguiente(): void {
    this.mesActual = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() + 1, 1);
    this.diaPopoverKey = null;
  }

  irAHoy(): void {
    const hoy = new Date();
    this.mesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    this.diaPopoverKey = null;
  }

  esHoy(fecha: Date): boolean {
    const hoy = new Date();
    return fecha.getFullYear() === hoy.getFullYear()
      && fecha.getMonth() === hoy.getMonth()
      && fecha.getDate() === hoy.getDate();
  }

  eventosDelDia(key: string): EventoCalendario[] {
    return this.eventosPorDia.get(key) ?? [];
  }

  private readonly ordenColores: ColorEvento[] = ['azul', 'rojo', 'verde'];

  coloresDelDia(key: string): ColorEvento[] {
    const presentes = new Set(this.eventosDelDia(key).map(e => e.color));
    return this.ordenColores.filter(c => presentes.has(c));
  }

  colorDominante(key: string): ColorEvento | null {
    const colores = this.coloresDelDia(key);
    return colores.length === 1 ? colores[0] : null;
  }

  toggleDia(dia: DiaCalendario): void {
    if (this.eventosDelDia(dia.key).length === 0) return;
    this.diaPopoverKey = this.diaPopoverKey === dia.key ? null : dia.key;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.diaPopoverKey) return;
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.diaPopoverKey = null;
    }
  }

  formatFecha(iso: string): string {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  // ─── Navegación ──────────────────────────────────────────────────────────────

  volver(): void {
    this.router.navigate(['/mis-espacios-curriculares', this.idEC]);
  }
}
