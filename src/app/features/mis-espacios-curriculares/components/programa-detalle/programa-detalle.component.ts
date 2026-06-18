import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { filter } from 'rxjs/operators';
import { ProgramaService } from '../../services/programa.service';
import { ProgramaDetalle, ProgramaResumen } from '../../models/programa.model';
import {
  ConfirmarAccionDialogComponent,
  ConfirmarAccionData,
} from '../confirmar-accion-dialog/confirmar-accion-dialog.component';
import { AuthService } from '../../../auth/services/auth.service';
import { PdfReporteService, ProgramaEstructuradoData } from '../../../../core/services/pdf-reporte.service';

@Component({
  selector: 'app-programa-detalle',
  standalone: true,
  imports: [CommonModule, MatSnackBarModule, MatDialogModule],
  templateUrl: './programa-detalle.component.html',
  styleUrl: './programa-detalle.component.scss',
})
export class ProgramaDetalleComponent implements OnInit {
  programa: ProgramaDetalle | null = null;
  loading = true;
  idEC = '';
  idPrograma = '';
  procesando = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private programaService: ProgramaService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private authService: AuthService,
    private pdfService: PdfReporteService,
  ) {}

  ngOnInit(): void {
    this.idEC = this.route.snapshot.paramMap.get('idEC') ?? '';
    this.idPrograma = this.route.snapshot.paramMap.get('idPrograma') ?? '';
    this.cargar();
  }

  private cargar(): void {
    this.loading = true;
    this.programaService.getPrograma(this.idPrograma).subscribe({
      next: (p) => { this.programa = p; this.loading = false; },
      error: () => {
        this.snackBar.open('Error al cargar el programa.', 'Cerrar', { duration: 4000 });
        this.loading = false;
      },
    });
  }

  get esBorrador(): boolean   { return this.programa?.estado === 'Borrador';   }
  get esConfirmado(): boolean { return this.programa?.estado === 'Confirmado'; }
  get esVigente(): boolean    { return this.programa?.estado === 'Vigente';    }
  get esNoVigente(): boolean  { return this.programa?.estado === 'NoVigente';  }
  get esAnioActual(): boolean { return this.programa?.anioLectivo === new Date().getFullYear(); }
  get esAdmin(): boolean      { return this.authService.currentUser?.esAdmin ?? false; }

  badgeClass(): string {
    switch (this.programa?.estado) {
      case 'Vigente':    return 'badge-vigente';
      case 'Borrador':   return 'badge-borrador';
      case 'Confirmado': return 'badge-confirmado';
      case 'NoVigente':  return 'badge-novigente';
      default: return '';
    }
  }

  badgeLabel(): string {
    return this.programa?.estado === 'NoVigente' ? 'No vigente' : (this.programa?.estado ?? '');
  }

  formatFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  }

  formatCurso(): string {
    if (!this.programa) return '';
    return `${this.programa.anioNumero}°${this.programa.division}`;
  }

  // ─── Acciones ───

  editar(): void {
    this.router.navigate([
      '/mis-espacios-curriculares', this.idEC, 'programas', this.idPrograma, 'editar',
    ]);
  }

  private abrirDialogo(data: ConfirmarAccionData, accion: () => void): void {
    this.dialog
      .open(ConfirmarAccionDialogComponent, { data, width: '420px' })
      .afterClosed()
      .pipe(filter((r: boolean) => r === true))
      .subscribe(() => accion());
  }

  confirmarPrograma(): void {
    this.abrirDialogo(
      {
        titulo: 'Confirmar programa',
        mensaje:
          'Al confirmar, el programa ya no podrá ser editado. ' +
          'Asegurate de que el contenido esté completo antes de continuar.',
        textoConfirmar: 'Confirmar',
        color: 'primary',
      },
      () => this.ejecutarCambioEstado('Confirmado', 'Programa confirmado correctamente.'),
    );
  }

  ponerVigente(): void {
    this.programaService.getProgramasPorEC(this.idEC).subscribe({
      next: (programas: ProgramaResumen[]) => {
        const vigente = programas.find(p => p.estado === 'Vigente');
        const mensaje = vigente
          ? `El programa "${vigente.titulo}" del ${vigente.anioLectivo}, creado por ${vigente.nombreDocente} el ${this.formatFecha(vigente.fechaCreacion)}, será reemplazado por el programa seleccionado.`
          : '¿Confirmás que querés establecer este programa como vigente?';
        this.abrirDialogo(
          { titulo: 'Establecer como Vigente', mensaje, textoConfirmar: 'Establecer como Vigente', color: 'primary' },
          () => this.ejecutarCambioEstado('Vigente', 'Programa establecido como vigente.'),
        );
      },
      error: () => this.abrirDialogo(
        {
          titulo: 'Establecer como Vigente',
          mensaje: '¿Confirmás que querés establecer este programa como vigente?',
          textoConfirmar: 'Establecer como Vigente',
          color: 'primary',
        },
        () => this.ejecutarCambioEstado('Vigente', 'Programa establecido como vigente.'),
      ),
    });
  }

  establecerComoConfirmado(): void {
    this.abrirDialogo(
      {
        titulo: 'Establecer como Confirmado',
        mensaje: 'El programa dejará de estar vigente y volverá al estado Confirmado. ¿Confirmás la acción?',
        textoConfirmar: 'Establecer como Confirmado',
        color: 'primary',
      },
      () => this.ejecutarCambioEstado('Confirmado', 'Programa establecido como confirmado.'),
    );
  }

  establecerComoNoVigente(): void {
    this.abrirDialogo(
      {
        titulo: 'Establecer como No Vigente',
        mensaje:
          'El programa pasará a "No vigente" y quedará almacenado como información histórica. ' +
          'Esta acción no se puede deshacer.',
        textoConfirmar: 'Establecer como No Vigente',
        color: 'warn',
      },
      () => this.ejecutarCambioEstado('NoVigente', 'Programa establecido como no vigente.'),
    );
  }

  eliminar(): void {
    this.abrirDialogo(
      {
        titulo: 'Eliminar programa',
        mensaje: 'El programa se eliminará permanentemente. Esta acción no tiene vuelta atrás.',
        textoConfirmar: 'Eliminar',
        color: 'warn',
      },
      () => {
        this.procesando = true;
        this.programaService.eliminar(this.idPrograma).subscribe({
          next: () => {
            this.snackBar.open('Programa eliminado.', 'Cerrar', { duration: 3000 });
            this.procesando = false;
            this.router.navigate(['/mis-espacios-curriculares', this.idEC, 'programas']);
          },
          error: (err) => {
            const msg = typeof err?.error === 'string' ? err.error : 'Error al eliminar el programa.';
            this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
            this.procesando = false;
          },
        });
      },
    );
  }

  private ejecutarCambioEstado(nuevoEstado: string, mensajeExito: string): void {
    this.procesando = true;
    this.programaService.cambiarEstado(this.idPrograma, nuevoEstado).subscribe({
      next: () => {
        this.snackBar.open(mensajeExito, 'Cerrar', { duration: 3000 });
        this.procesando = false;
        this.cargar();
      },
      error: (err) => {
        const msg = typeof err?.error === 'string' ? err.error : 'Error al cambiar el estado.';
        this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
        this.procesando = false;
      },
    });
  }

  volver(): void {
    this.router.navigate(['/mis-espacios-curriculares', this.idEC, 'programas']);
  }

  irAEspacio(): void {
    this.router.navigate(['/mis-espacios-curriculares', this.idEC]);
  }

  irAMisEspacios(): void {
    this.router.navigate(['/mis-espacios-curriculares']);
  }

  exportarPDF(): void {
    if (!this.programa) return;
    void this.pdfService.exportarProgramaEstructurado({
      nombreMateria:          this.programa.nombreMateria,
      cursoLabel:             this.formatCurso(),
      anioLectivo:            this.programa.anioLectivo,
      nombreDocente:          this.programa.nombreDocente,
      fechaCreacion:          this.formatFecha(this.programa.fechaCreacion),
      fechaUltimaModificacion: this.formatFecha(this.programa.fechaUltimaModificacion),
      fechaVencimiento:       this.programa.fechaVencimiento,
      descripcion:            this.programa.descripcion,
      objetivos:              this.programa.objetivos,
      unidades:               this.programa.unidades,
    } as ProgramaEstructuradoData).catch(() => {
      this.snackBar.open('No se pudo exportar el PDF.', 'Cerrar', { duration: 4000 });
    });
  }
}
