import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

import { ReporteAsistenciaItem } from '../../features/reporte-asistencia/models/reporte-asistencia.model';
import { DetalleAsistencia } from '../../features/reporte-asistencia/models/detalle-asistencia.model';
import { ReporteDocenteItem } from '../../features/reporte-asistencia-docente/models/reporte-asistencia-docente.model';
import { DetalleDocenteRegistro } from '../../features/reporte-asistencia-docente/models/detalle-docente.model';
import { ParteDiarioResumen } from '../../features/parte-diario-digital/models/parte-diario-resumen.model';
import { ComentarioParte } from '../../features/parte-diario-digital/models/comentario-parte.model';
import { TurnoParte } from '../../features/parte-diario-digital/models/turno-parte.model';
import { HorarioClase } from '../../features/parte-diario-digital/models/horario-clase.model';
import { EstudianteParte } from '../../features/parte-diario-digital/models/estudiante-parte.model';
import { RetiroReporteItem } from '../../features/reporte-retiros/models/retiro-reporte-item.model';

// ─── Colores ──────────────────────────────────────────────────────────────────
const VERDE    = [46, 125, 50]    as [number, number, number];
const AMARILLO = [183, 130, 0]    as [number, number, number];
const NARANJA  = [200, 95, 0]     as [number, number, number];
const ROJO     = [183, 28, 28]    as [number, number, number];
const GRIS     = [117, 117, 117]  as [number, number, number];
const HEADER_BG = [21, 101, 192]  as [number, number, number];

const HEADER_H = 26; // altura reservada para el encabezado (mm)
type PdfWithAutoTable = jsPDF & { lastAutoTable?: { finalY: number } };

function badgeColor(inasistencias: number, teaGeneral: boolean): [number, number, number] {
  if (teaGeneral)           return GRIS;
  if (inasistencias >= 21)  return ROJO;
  if (inasistencias >= 15)  return NARANJA;
  if (inasistencias >= 10)  return AMARILLO;
  return VERDE;
}

function formatFecha(fecha: string): string {
  if (!fecha) return '-';
  const [y, m, d] = fecha.split('-');
  return `${d}/${m}/${y}`;
}

function hoy(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

function periodoTexto(desde: string | null, hasta: string | null): string {
  if (!desde && !hasta) return 'Sin filtro de fecha';
  if (desde && hasta) return `${formatFecha(desde)} al ${formatFecha(hasta)}`;
  if (desde)  return `Desde ${formatFecha(desde)}`;
  return `Hasta ${formatFecha(hasta!)}`;
}

/**
 * Dibuja el encabezado en la página actual (estilo "parte diario"):
 * logo a la izquierda, título + subtítulo a la derecha, línea azul inferior.
 * Si el logo no está disponible usa el fondo azul clásico.
 * Devuelve el Y donde empieza el contenido.
 */
function drawPageHeader(
  doc: jsPDF,
  titulo: string,
  subtitulo: string,
  logoDataUrl?: string | null
): number {
  const pageW = doc.internal.pageSize.getWidth();

  if (logoDataUrl) {
    // ── Encabezado estilo parte diario: fondo blanco, logo + texto, línea azul ──
    try {
      doc.addImage(logoDataUrl, 'JPEG', 6, 3, 16, 16);
    } catch {
      // Logo inaccesible — continúa sin él
    }
    const tx = 26;
    doc.setTextColor(...HEADER_BG);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(titulo, tx, 10);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(subtitulo, tx, 17);

    // Línea azul divisoria
    doc.setDrawColor(...HEADER_BG);
    doc.setLineWidth(0.6);
    doc.line(0, 22, pageW, 22);
  } else {
    // ── Fallback: banda azul original ──
    doc.setFillColor(...HEADER_BG);
    doc.rect(0, 0, pageW, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(titulo, 14, 10);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitulo, 14, 17);
  }

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  return HEADER_H;
}

// ─── Colores por porcentaje ───────────────────────────────────────────────────
function porcentajeColor(porcentaje: number, teaGeneral: boolean): [number, number, number] {
  if (teaGeneral)       return GRIS;
  if (porcentaje >= 85) return VERDE;
  if (porcentaje >= 80) return AMARILLO;
  if (porcentaje >= 75) return NARANJA;
  return ROJO;
}

function condicionTexto(porcentaje: number, teaGeneral: boolean): string {
  if (teaGeneral)       return 'TEA';
  if (porcentaje >= 85) return 'Regular';
  if (porcentaje >= 75) return 'Riesgo';
  return 'TEA';
}

function codigoColor(codigo: string): [number, number, number] {
  switch ((codigo ?? '').toUpperCase()) {
    case 'P':    return [46, 125, 50];
    case 'A':    return [183, 28, 28];
    case 'LLT':
    case 'LLTE': return [183, 130, 0];
    case 'LLTC': return [200, 95, 0];
    case 'RA':
    case 'RAE':
    case 'RE':   return [21, 101, 192];
    case 'ANC':  return [40, 53, 147];
    default:     return [100, 100, 100];
  }
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  return `${hh}:${mm} ${dd}/${mo}/${d.getFullYear()}`;
}

function sortEstudiantesParte(estudiantes: EstudianteParte[]): EstudianteParte[] {
  return [...estudiantes].sort((a, b) =>
    a.apellido.localeCompare(b.apellido, 'es-AR') || a.nombre.localeCompare(b.nombre, 'es-AR')
  );
}

function shortStudentName(estudiante: EstudianteParte): string {
  return `${estudiante.apellido}, ${estudiante.nombre.charAt(0)}.`;
}

function retiroEtiquetaTexto(etiqueta: string | null | undefined): string {
  switch (etiqueta) {
    case 'ConReingreso':
      return 'Reingreso pendiente';
    case 'ReingresoVencido':
      return 'Reingreso vencido';
    case 'Reingresado':
      return 'Reingresado';
    default:
      return etiqueta ?? '';
  }
}

function estudianteEstadoTexto(estudiante: EstudianteParte): string {
  const partes = [estudiante.estado === 'SinRegistro' ? 'Sin reg.' : estudiante.estado];

  if (estudiante.estado === 'Presente' && estudiante.codigoAsistencia?.toUpperCase().startsWith('LLT')) {
    partes.push(estudiante.codigoAsistencia.toUpperCase());
  }

  if (estudiante.estado === 'Retirado') {
    if (estudiante.codigoLlegadaManiana?.toUpperCase().startsWith('LLT')) {
      partes.push(estudiante.codigoLlegadaManiana.toUpperCase());
    }
    if (estudiante.retiroActivo?.tipoRetiro) {
      partes.push(estudiante.retiroActivo.tipoRetiro.toUpperCase());
    }
    if (estudiante.retiroActivo?.etiquetaEstado) {
      partes.push(retiroEtiquetaTexto(estudiante.retiroActivo.etiquetaEstado));
    }
  }

  return partes.filter(Boolean).join(' | ');
}

function estudianteEstadoColor(estado: EstudianteParte['estado']): [number, number, number] {
  switch (estado) {
    case 'Presente':
      return VERDE;
    case 'Ausente':
      return ROJO;
    case 'Retirado':
      return NARANJA;
    default:
      return GRIS;
  }
}

function claseEstadoTexto(clase: HorarioClase): string {
  if (clase.dictada === false) return 'No dictada';
  if (clase.dictada === true) return 'Dictada';
  return 'Sin reg.';
}

function claseEstadoColor(dictada: boolean | null): [number, number, number] {
  if (dictada === false) return ROJO;
  if (dictada === true) return VERDE;
  return GRIS;
}

function comentarioTipoTexto(comentario: ComentarioParte): string {
  return comentario.subTipo === 'RETIRO'
    ? 'ASISTENCIA / RETIRO'
    : comentario.subTipo;
}

function comentarioEventoTexto(comentario: ComentarioParte): string {
  return comentario.subTipo === 'NOTA'
    ? comentario.contenido
    : (comentario.titulo ?? '—');
}

function comentarioDetalleTexto(comentario: ComentarioParte): string {
  return comentario.subTipo === 'NOTA'
    ? '—'
    : (comentario.detalle ?? '—');
}

// ─── Interfaces públicas ──────────────────────────────────────────────────────

export interface ReporteCursoData {
  cursoCodigo: string;
  totalDiasDictados: number;
  fechaDesde: string | null;
  fechaHasta: string | null;
  estudiantes: ReporteAsistenciaItem[];
}

export interface ReporteDocenteData {
  cursoCodigo: string;
  nombreEspacio: string;
  totalClasesDictadas: number;
  fechaDesde: string | null;
  fechaHasta: string | null;
  estudiantes: ReporteDocenteItem[];
}

export interface DetalleDocenteData {
  nombre: string;
  apellido: string;
  documento: string;
  teaGeneral: boolean;
  presencias: number;
  inasistencias: number;
  llegadasTarde: number;
  retirosAnticipados: number;
  porcentajeAsistencia: number;
  nombreEspacio: string;
  cursoCodigo: string;
  fechaDesde: string | null;
  fechaHasta: string | null;
  registros: DetalleDocenteRegistro[];
}

export interface DetalleEstudianteData {
  nombre: string;
  apellido: string;
  documento: string;
  teaGeneral: boolean;
  presencias: number;
  inasistencias: number;
  ausenciasPuras: number;
  ancCount: number;
  llegadasTarde: number;
  llegadasTardeExtendidas: number;
  llegadasTardeCompletas: number;
  ausentePorLLT: number;
  retirosAnticipados: number;
  retirosExpress: number;
  retirosAnticipadosExtendidos: number;
  ausentePorRA: number;
  porcentajeAsistencia: number;
  fechaDesde: string | null;
  fechaHasta: string | null;
  registros: DetalleAsistencia[];
}

export interface ParteDiarioData {
  cursoLabel: string;
  fechaParteLarga: string;
  fechaImpresion: string;
  usuarioResponsable: string;
  resumen: ParteDiarioResumen;
  comentarios: ComentarioParte[];
}

export interface ProgramaEstructuradoData {
  nombreMateria: string;
  cursoLabel: string;
  anioLectivo: number;
  nombreDocente: string;
  fechaCreacion: string;
  fechaUltimaModificacion: string;
  fechaVencimiento: string;
  descripcion?: string;
  objetivos: { nro: number; descripcion: string }[];
  unidades: {
    nro: number;
    titulo: string;
    descripcion?: string;
    temas: { nro: number; titulo: string; descripcion?: string }[];
  }[];
}

export interface ReporteRetirosData {
  cursoLabel: string;
  fechaDesde: string | null;
  fechaHasta: string | null;
  retiros: RetiroReporteItem[];
}

export interface DashboardPdfData {
  titulo: string;
  subtitulo: string;
  nombreArchivo: string;
  filtrosAplicados: string;
  kpis: { label: string; valor: string }[];
  charts: { titulo: string; dataUrl: string; /** source width/height ratio */ aspectRatio?: number }[];
  /** 'general' = cards top + 2x2 charts | 'ec' = cards top + centered charts */
  layout?: 'general' | 'ec';
}

// ─── Servicio ─────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class PdfReporteService {

  private logoPromise: Promise<string | null>;

  constructor() {
    this.logoPromise = this.loadLogoAsync();
  }

  private loadLogoAsync(): Promise<string | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width  = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg'));
      };
      img.onerror = () => resolve(null);
      img.src = 'logo.jpg';
    });
  }

  // ── Reporte general de curso ──────────────────────────────────────────────

  async exportarReporteCurso(data: ReporteCursoData): Promise<void> {
    const logo = await this.logoPromise;
    const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    const titulo    = 'Reporte de Asistencia General';
    const subtitulo = `Curso: ${data.cursoCodigo}`;

    let y = drawPageHeader(doc, titulo, subtitulo, logo);

    // Metadata
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(`Período: ${periodoTexto(data.fechaDesde, data.fechaHasta)}`, 14, y + 4);
    doc.text(`Total días dictados: ${data.totalDiasDictados}`, 14, y + 9);
    doc.text(`Emitido: ${hoy()}`, pageW - 14, y + 4, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    y += 16;

    // Columnas: Estudiante, DNI, Inasistencias (total), P, A (puras), A. LLT, A. RA
    autoTable(doc, {
      startY: y,
      margin: { top: HEADER_H + 2 },
      head: [['Estudiante', 'DNI', 'Inasistencias', 'P', 'A', 'A. LLT', 'A. RA']],
      body: data.estudiantes.map(est => [
        `${est.apellido}, ${est.nombre}`,
        est.documento,
        est.teaGeneral ? 'TEA' : est.inasistencias,
        est.presencias,
        est.ausenciasPuras ?? 0,
        est.ausentePorLLT,
        est.ausentePorRA ?? 0,
      ]),
      headStyles: {
        fillColor: HEADER_BG,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize:  8,
        halign:    'center',
      },
      bodyStyles:          { fontSize: 8 },
      alternateRowStyles:  { fillColor: [245, 248, 255] },
      columnStyles: {
        0: { cellWidth: 68 },
        1: { cellWidth: 24, halign: 'center' },
        2: { cellWidth: 24, halign: 'center' },
        3: { cellWidth: 14, halign: 'center' },
        4: { cellWidth: 14, halign: 'center' },
        5: { cellWidth: 17, halign: 'center' },
        6: { cellWidth: 17, halign: 'center' },
      },
      didDrawPage: (hookData) => {
        if (hookData.pageNumber > 1) {
          drawPageHeader(doc, titulo, subtitulo, logo);
          doc.setFontSize(7);
          doc.setTextColor(80, 80, 80);
          doc.text(`Período: ${periodoTexto(data.fechaDesde, data.fechaHasta)}`, 14, HEADER_H + 2);
          doc.text(`Emitido: ${hoy()}`, pageW - 14, HEADER_H + 2, { align: 'right' });
          doc.setTextColor(0, 0, 0);
        }
      },
      didParseCell: (hookData) => {
        // Colorear celda Inasistencias (índice 2) con el color por nivel
        if (hookData.section === 'body' && hookData.column.index === 2) {
          const est = data.estudiantes[hookData.row.index];
          if (est) {
            const [r, g, b] = badgeColor(est.inasistencias, est.teaGeneral);
            hookData.cell.styles.textColor = [r, g, b];
            hookData.cell.styles.fontStyle = 'bold';
          }
        }
        // Fila TEA: fondo gris claro
        if (hookData.section === 'body') {
          const est = data.estudiantes[hookData.row.index];
          if (est?.teaGeneral) {
            hookData.cell.styles.fillColor = [240, 240, 240];
          }
        }
      },
    });

    this.dibujarLeyenda(doc);
    doc.save(`reporte-asistencia-${data.cursoCodigo}-${hoy().replace(/\//g, '-')}.pdf`);
  }

  // ── Reporte por espacio curricular (docente) ──────────────────────────────

  async exportarReporteDocente(data: ReporteDocenteData): Promise<void> {
    const logo  = await this.logoPromise;
    const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    const titulo    = 'Reporte de Asistencia por Espacio Curricular';
    const subtitulo = `Curso: ${data.cursoCodigo}  |  Espacio: ${data.nombreEspacio}`;

    let y = drawPageHeader(doc, titulo, subtitulo, logo);

    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(`Período: ${periodoTexto(data.fechaDesde, data.fechaHasta)}`, 14, y + 4);
    doc.text(`Total clases dictadas: ${data.totalClasesDictadas}`, 14, y + 9);
    doc.text(`Emitido: ${hoy()}`, pageW - 14, y + 4, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    y += 16;

    autoTable(doc, {
      startY: y,
      margin: { top: HEADER_H + 2 },
      head: [['Estudiante', 'DNI', 'Presencias', 'Ausencias', '% Asistencia', 'Condición']],
      body: data.estudiantes.map(est => [
        `${est.apellido}, ${est.nombre}`,
        est.documento,
        est.presencias,
        est.inasistencias,
        `${est.porcentajeAsistencia}%`,
        condicionTexto(est.porcentajeAsistencia, est.teaGeneral),
      ]),
      headStyles: { fillColor: HEADER_BG, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 248, 255] },
      columnStyles: {
        0: { cellWidth: 56 },
        1: { cellWidth: 22, halign: 'center' },
        2: { cellWidth: 28, halign: 'center' },
        3: { cellWidth: 26, halign: 'center' },
        4: { cellWidth: 28, halign: 'center' },
        5: { cellWidth: 22, halign: 'center' },
      },
      didDrawPage: (hookData) => {
        if (hookData.pageNumber > 1) {
          drawPageHeader(doc, titulo, subtitulo, logo);
          doc.setFontSize(7);
          doc.setTextColor(80, 80, 80);
          doc.text(`Período: ${periodoTexto(data.fechaDesde, data.fechaHasta)}`, 14, HEADER_H + 2);
          doc.text(`Emitido: ${hoy()}`, pageW - 14, HEADER_H + 2, { align: 'right' });
          doc.setTextColor(0, 0, 0);
        }
      },
      didParseCell: (hookData) => {
        if (hookData.section === 'head') {
          hookData.cell.styles.halign = hookData.column.index === 0 ? 'left' : 'center';
          return;
        }
        if (hookData.section === 'body') {
          const est = data.estudiantes[hookData.row.index];
          if (!est) return;
          if (hookData.column.index === 4) {
            const [r, g, b] = porcentajeColor(est.porcentajeAsistencia, est.teaGeneral);
            hookData.cell.styles.textColor = [r, g, b];
            hookData.cell.styles.fontStyle = 'bold';
          }
          if (hookData.column.index === 5) {
            const [r, g, b] = porcentajeColor(est.porcentajeAsistencia, est.teaGeneral);
            hookData.cell.styles.textColor = [r, g, b];
            hookData.cell.styles.fontStyle = 'bold';
          }
          if (est.teaGeneral) {
            hookData.cell.styles.fillColor = [240, 240, 240];
          }
        }
      },
    });

    this.dibujarLeyendaDocente(doc);
    doc.save(`reporte-espacio-${data.cursoCodigo}-${data.nombreEspacio.replace(/\s+/g, '-')}-${hoy().replace(/\//g, '-')}.pdf`);
  }

  // ── Detalle espacio curricular (docente) ──────────────────────────────────

  async exportarDetalleDocente(data: DetalleDocenteData): Promise<void> {
    const logo  = await this.logoPromise;
    const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    const titulo    = 'Detalle de Asistencia — Espacio Curricular';
    const subtitulo = `${data.apellido}, ${data.nombre}  |  DNI: ${data.documento}${data.teaGeneral ? '  |  TEA' : ''}`;
    let y = drawPageHeader(doc, titulo, subtitulo, logo);

    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(`Espacio: ${data.nombreEspacio}  |  Curso: ${data.cursoCodigo}`, 14, y + 4);
    doc.text(`Período: ${periodoTexto(data.fechaDesde, data.fechaHasta)}`, 14, y + 9);
    doc.text(`Emitido: ${hoy()}`, pageW - 14, y + 4, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    y += 18;

    const tarjetas: { label: string; valor: string | number; color: [number,number,number] }[] = [
      { label: 'Presencias',     valor: data.presencias,         color: [0,0,0] },
      { label: 'Inasistencias',  valor: data.inasistencias,      color: [0,0,0] },
      { label: 'LLT',            valor: data.llegadasTarde,      color: [0,0,0] },
      { label: 'RA',             valor: data.retirosAnticipados, color: [0,0,0] },
      { label: '% Asistencia',   valor: `${data.porcentajeAsistencia}%`,
        color: porcentajeColor(data.porcentajeAsistencia, data.teaGeneral) },
    ];

    const cardW = (pageW - 28) / tarjetas.length;
    tarjetas.forEach((t, i) => {
      const x = 14 + i * cardW;
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(248, 249, 252);
      doc.roundedRect(x, y, cardW - 2, 14, 2, 2, 'FD');
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text(t.label, x + (cardW - 2) / 2, y + 5, { align: 'center' });
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...t.color);
      doc.text(String(t.valor), x + (cardW - 2) / 2, y + 11, { align: 'center' });
      doc.setFont('helvetica', 'normal');
    });
    doc.setTextColor(0, 0, 0);
    y += 20;

    if (data.registros.length === 0) {
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text('Sin registros de clases para el período indicado.', 14, y + 6);
    } else {
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text(`${data.registros.length} clases registradas`, 14, y);
      doc.setTextColor(0, 0, 0);
      y += 4;

      type Part = { text: string; color: [number,number,number]; bold: boolean };
      const GRAY_PDF: [number,number,number] = [120, 120, 120];

      const buildDetalleParts = (r: DetalleDocenteRegistro): Part[] => {
        const parts: Part[] = [];
        if (!r.dictada) {
          parts.push({ text: '—', color: GRAY_PDF, bold: false });
          return parts;
        }
        const codigo = (r.codigo ?? '').toUpperCase();
        const codigoLlegada = (r.codigoLlegada ?? '').toUpperCase();
        const llegadas = ['LLT', 'LLTE', 'LLTC'];

        if (codigo === 'RE') {
          parts.push({ text: 'P', color: VERDE, bold: true });
          parts.push({ text: 'RE', color: [21, 101, 192], bold: false });
          if (r.horaSalida) parts.push({ text: r.horaSalida, color: GRAY_PDF, bold: false });
          return parts;
        }

        if (r.presente === true || r.presente === null) {
          parts.push({ text: r.presente === true ? 'P' : '—', color: r.presente === true ? VERDE : GRAY_PDF, bold: r.presente === true });
          return parts;
        }

        // Ausente
        parts.push({ text: 'A', color: ROJO, bold: true });

        if (llegadas.includes(codigo)) {
          parts.push({ text: codigo, color: codigoColor(codigo), bold: false });
          if (r.horaEntrada) parts.push({ text: r.horaEntrada, color: GRAY_PDF, bold: false });
        } else if (['RA', 'RAE'].includes(codigo)) {
          if (llegadas.includes(codigoLlegada)) {
            parts.push({ text: codigoLlegada, color: codigoColor(codigoLlegada), bold: false });
            if (r.horaEntrada) parts.push({ text: r.horaEntrada, color: GRAY_PDF, bold: false });
          }
          parts.push({ text: codigo, color: codigoColor(codigo), bold: false });
          if (r.horaSalida) parts.push({ text: `Salida: ${r.horaSalida}`, color: GRAY_PDF, bold: false });
          if (r.horaReingreso) parts.push({ text: `Reingreso: ${r.horaReingreso}`, color: GRAY_PDF, bold: false });
        } else if (codigo === 'ANC') {
          parts.push({ text: 'ANC', color: [40, 53, 147], bold: false });
        }

        return parts;
      };

      const detallePartsData = data.registros.map(buildDetalleParts);

      const rows = data.registros.map(r => [
        formatFecha(r.fecha),
        r.dictada ? 'Dictada' : 'No dictada',
        !r.dictada ? '-' : (r.presente === null ? '-' : r.presente ? 'Presente' : 'Ausente'),
        '',
      ]);

      autoTable(doc, {
        startY: y,
        margin: { top: HEADER_H + 2 },
        head: [['Fecha', 'Clase', 'Asistencia', 'Detalle']],
        body: rows,
        headStyles: { fillColor: HEADER_BG, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8,
          cellPadding: { top: 3, right: 6, bottom: 3, left: 6 } },
        bodyStyles: { fontSize: 8, minCellHeight: 12,
          cellPadding: { top: 3, right: 6, bottom: 3, left: 6 } },
        alternateRowStyles: { fillColor: [245, 248, 255] },
        columnStyles: {
          0: { cellWidth: 36, halign: 'center' },
          1: { cellWidth: 44, halign: 'center' },
          2: { cellWidth: 44, halign: 'center' },
          3: { cellWidth: 58 },
        },
        didDrawPage: (hookData) => {
          if (hookData.pageNumber > 1) {
            drawPageHeader(doc, titulo, subtitulo, logo);
          }
        },
        didParseCell: (hookData) => {
          if (hookData.section === 'head') {
            hookData.cell.styles.halign = hookData.column.index <= 2 ? 'center' : 'left';
            return;
          }
          const r = data.registros[hookData.row.index];
          if (!r) return;
          if (r.dictada && r.presente === false && (r.codigo ?? '').toUpperCase() !== 'RE') {
            hookData.cell.styles.fillColor = [255, 245, 245];
          }
          if (hookData.column.index === 2 && r.dictada) {
            if (r.presente === false && (r.codigo ?? '').toUpperCase() !== 'RE') {
              hookData.cell.styles.textColor = ROJO;
              hookData.cell.styles.fontStyle = 'bold';
            } else if (r.presente === true || (r.codigo ?? '').toUpperCase() === 'RE') {
              hookData.cell.styles.textColor = VERDE;
              hookData.cell.styles.fontStyle = 'bold';
            }
          }
          if (hookData.column.index === 3) {
            const parts = detallePartsData[hookData.row.index];
            hookData.cell.styles.minCellHeight = Math.max(12, parts.length * 4.5 + 4);
          }
        },
        didDrawCell: (hookData) => {
          if (hookData.section !== 'body' || hookData.column.index !== 3) return;
          const r = data.registros[hookData.row.index];
          if (!r) return;
          const parts = detallePartsData[hookData.row.index];
          const cell = hookData.cell;
          let textY = cell.y + 5;
          parts.forEach(part => {
            doc.setFontSize(8);
            doc.setFont('helvetica', part.bold ? 'bold' : 'normal');
            doc.setTextColor(...part.color);
            doc.text(part.text, cell.x + 6, textY);
            textY += 4.5;
          });
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
        },
      });
    }

    const nombreArchivo = `detalle-espacio-${data.apellido}-${data.nombre}-${data.nombreEspacio.replace(/\s+/g, '-')}-${hoy().replace(/\//g, '-')}.pdf`;
    doc.save(nombreArchivo);
  }

  // ── Detalle de estudiante (asistencia general) ────────────────────────────

  async exportarDetalleEstudiante(data: DetalleEstudianteData): Promise<void> {
    const logo  = await this.logoPromise;
    const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    const titulo    = 'Detalle de Asistencia';
    const subtitulo = `${data.apellido}, ${data.nombre}  |  DNI: ${data.documento}${data.teaGeneral ? '  |  TEA' : ''}`;
    let y = drawPageHeader(doc, titulo, subtitulo, logo);

    // Metadata período + emisión
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(`Período: ${periodoTexto(data.fechaDesde, data.fechaHasta)}`, 14, y + 4);
    doc.text(`Emitido: ${hoy()}`, pageW - 14, y + 4, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    y += 12;

    // ── Fila 1: 4 cards grandes (Presencias | Ausencias | ANC | Inasistencias) ─
    const card4W = (pageW - 28) / 4;
    type CardGrande = { label: string | string[]; valor: string | number; color: [number,number,number] };
    const row1: CardGrande[] = [
      { label: 'Presencias',                     valor: data.presencias,             color: [0,0,0] },
      { label: 'Ausencias',                       valor: data.ausenciasPuras,         color: [0,0,0] },
      { label: ['Ausencia no', 'computable'],     valor: data.ancCount,               color: [0,0,0] },
      { label: 'Inasistencias',                   valor: data.teaGeneral ? 'TEA' : data.inasistencias,
        color: badgeColor(data.inasistencias, data.teaGeneral) },
    ];
    row1.forEach((t, i) => {
      const x = 14 + i * card4W;
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(248, 249, 252);
      doc.roundedRect(x, y, card4W - 2, 18, 2, 2, 'FD');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 100, 100);
      if (Array.isArray(t.label)) {
        doc.text(t.label[0], x + (card4W - 2) / 2, y + 5,   { align: 'center' });
        doc.text(t.label[1], x + (card4W - 2) / 2, y + 8.5, { align: 'center' });
      } else {
        doc.text(t.label, x + (card4W - 2) / 2, y + 6.5, { align: 'center' });
      }
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...t.color);
      doc.text(String(t.valor), x + (card4W - 2) / 2, y + 15, { align: 'center' });
      doc.setFont('helvetica', 'normal');
    });
    doc.setTextColor(0, 0, 0);
    y += 22;

    // ── Fila 2: 4 cards chicas — Llegadas tarde ───────────────────────────────
    const cardChW = (pageW - 28) / 4;
    type CardChica = { label: string | string[]; valor: string | number };
    const row2: CardChica[] = [
      { label: ['Ausencia por', 'llegada tarde'], valor: data.ausentePorLLT },
      { label: 'LLT',  valor: data.llegadasTarde },
      { label: 'LLTE', valor: data.llegadasTardeExtendidas },
      { label: 'LLTC', valor: data.llegadasTardeCompletas },
    ];
    const drawCardChica = (t: CardChica, i: number, yBase: number) => {
      const x = 14 + i * cardChW;
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(248, 249, 252);
      doc.roundedRect(x, yBase, cardChW - 1, 16, 2, 2, 'FD');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 100, 100);
      if (Array.isArray(t.label)) {
        doc.text(t.label[0], x + (cardChW - 1) / 2, yBase + 4.5, { align: 'center' });
        doc.text(t.label[1], x + (cardChW - 1) / 2, yBase + 8,   { align: 'center' });
      } else {
        doc.text(t.label, x + (cardChW - 1) / 2, yBase + 6, { align: 'center' });
      }
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(String(t.valor), x + (cardChW - 1) / 2, yBase + 13.5, { align: 'center' });
      doc.setFont('helvetica', 'normal');
    };
    row2.forEach((t, i) => drawCardChica(t, i, y));
    y += 20;

    // ── Fila 3: 4 cards chicas — Retiros ─────────────────────────────────────
    const row3: CardChica[] = [
      { label: ['Ausencia por', 'retiro anticipado'], valor: data.ausentePorRA },
      { label: 'RE',  valor: data.retirosExpress },
      { label: 'RA',  valor: data.retirosAnticipados },
      { label: 'RAE', valor: data.retirosAnticipadosExtendidos },
    ];
    row3.forEach((t, i) => drawCardChica(t, i, y));
    y += 20;

    // ── Tabla de registros ────────────────────────────────────────────────────
    const registrosFiltrados = data.registros.filter(r => {
      const man = (r.codigoManana ?? '').toUpperCase();
      const tar = (r.codigoTarde ?? '').toUpperCase();
      const tieneRetiro = !!(r.codigoRetiroManana || r.codigoRetiroTarde);
      return tieneRetiro || !((man === 'P' || man === '-') && (tar === 'P' || tar === '-') && r.valorTotal === 0);
    });

    if (registrosFiltrados.length === 0) {
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text('Sin inasistencias o movimientos en el período indicado.', 14, y + 6);
    } else {
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text(`${registrosFiltrados.length} registros encontrados`, 14, y);
      doc.setTextColor(0, 0, 0);
      y += 4;

      // Partes con color individual por código (un Part por línea dentro de la celda)
      type Part = { text: string; color: [number,number,number]; bold: boolean };
      const GRAY_LABEL: [number,number,number] = [120, 120, 120];

      const buildManParts = (r: DetalleAsistencia): Part[] => {
        const parts: Part[] = [];
        const cod = r.codigoManana ?? '-';
        const isDash = cod === '-' || cod === '';
        parts.push({ text: cod, color: isDash ? GRAY_LABEL : codigoColor(cod), bold: !isDash });
        if (r.horaEntradaManana)
          parts.push({ text: `Entrada: ${r.horaEntradaManana}`, color: GRAY_LABEL, bold: false });
        if (r.codigoRetiroManana) {
          parts.push({ text: r.codigoRetiroManana, color: codigoColor(r.codigoRetiroManana), bold: true });
          if (r.horaSalidaManana)    parts.push({ text: `Salida: ${r.horaSalidaManana}`,       color: GRAY_LABEL, bold: false });
          if (r.horaReingresoManana) parts.push({ text: `Reingreso: ${r.horaReingresoManana}`, color: GRAY_LABEL, bold: false });
        }
        return parts;
      };

      const buildTarParts = (r: DetalleAsistencia): Part[] => {
        const parts: Part[] = [];
        const cod = r.codigoTarde ?? '-';
        const isDash = cod === '-' || cod === '';
        parts.push({ text: cod, color: isDash ? GRAY_LABEL : codigoColor(cod), bold: !isDash });
        if (r.codigoRetiroTarde) {
          parts.push({ text: r.codigoRetiroTarde, color: codigoColor(r.codigoRetiroTarde), bold: true });
          if (r.horaSalidaTarde)    parts.push({ text: `Salida: ${r.horaSalidaTarde}`,       color: GRAY_LABEL, bold: false });
          if (r.horaReingresoTarde) parts.push({ text: `Reingreso: ${r.horaReingresoTarde}`, color: GRAY_LABEL, bold: false });
        }
        return parts;
      };

      const manPartsData = registrosFiltrados.map(buildManParts);
      const tarPartsData = registrosFiltrados.map(buildTarParts);

      // Cols Mañana/Tarde van vacías: el contenido se dibuja en didDrawCell
      // La altura de fila se controla con minCellHeight en didParseCell
      const rows = registrosFiltrados.map(r => [
        formatFecha(r.fecha),
        '',
        '',
        r.valorTotal,
      ]);

      autoTable(doc, {
        startY: y,
        margin: { top: HEADER_H + 4 },
        head: [['Fecha', 'Mañana', 'Tarde', 'Valor Inasistencia']],
        body: rows,
        headStyles: {
          fillColor: HEADER_BG,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize:  8,
        },
        bodyStyles: { fontSize: 8, minCellHeight: 14 },
        alternateRowStyles: { fillColor: [245, 248, 255] },
        columnStyles: {
          0: { cellWidth: 28, halign: 'center' },
          1: { cellWidth: 62 },
          2: { cellWidth: 62 },
          3: { cellWidth: 30, halign: 'center', valign: 'middle' },
        },
        didDrawPage: (hookData) => {
          if (hookData.pageNumber > 1) {
            drawPageHeader(doc, titulo, subtitulo, logo);
          }
        },
        didParseCell: (hookData) => {
          if (hookData.section !== 'body') return;
          const r = registrosFiltrados[hookData.row.index];
          if (!r) return;
          // Fila con ausencia: fondo rojo muy suave
          if (r.valorTotal >= 1) hookData.cell.styles.fillColor = [255, 245, 245];
          // Cols Mañana/Tarde: fijar altura de fila según cantidad de líneas a dibujar
          if (hookData.column.index === 1 || hookData.column.index === 2) {
            const parts = hookData.column.index === 1
              ? manPartsData[hookData.row.index]
              : tarPartsData[hookData.row.index];
            hookData.cell.styles.minCellHeight = Math.max(14, parts.length * 4.5 + 5);
          }
          // Valor inasistencia: rojo si > 0
          if (hookData.column.index === 3 && r.valorTotal > 0) {
            hookData.cell.styles.textColor = ROJO;
            hookData.cell.styles.fontStyle = 'bold';
          }
        },
        didDrawCell: (hookData) => {
          if (hookData.section !== 'body') return;
          if (hookData.column.index !== 1 && hookData.column.index !== 2) return;
          const r = registrosFiltrados[hookData.row.index];
          if (!r) return;
          const parts = hookData.column.index === 1
            ? manPartsData[hookData.row.index]
            : tarPartsData[hookData.row.index];
          const cell = hookData.cell;
          const lineH = 4.5;
          let textY = cell.y + 5;
          parts.forEach(part => {
            doc.setFontSize(8);
            doc.setFont('helvetica', part.bold ? 'bold' : 'normal');
            doc.setTextColor(...part.color);
            doc.text(part.text, cell.x + 2, textY);
            textY += lineH;
          });
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
        },
      });
    }

    const nombreArchivo = `detalle-asistencia-${data.apellido}-${data.nombre}-${hoy().replace(/\//g, '-')}.pdf`;
    doc.save(nombreArchivo);
  }

  async exportarParteDiario(data: ParteDiarioData): Promise<void> {
    const logo = await this.logoPromise;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfDoc = doc as PdfWithAutoTable;
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const bottomMargin = 14;
    const tableTopMargin = HEADER_H + 16;
    const titleTopGap = 3;

    const titulo = 'Parte Diario Digital';
    const subtitulo = `Curso: ${data.cursoLabel}`;

    const renderPageChrome = (): number => {
      const y = drawPageHeader(doc, titulo, subtitulo, logo);
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text(`Fecha del parte: ${data.fechaParteLarga}`, 14, y + 4);
      doc.text(`Emitido: ${data.fechaImpresion}`, pageW - 14, y + 4, { align: 'right' });
      doc.text(`Usuario responsable: ${data.usuarioResponsable}`, 14, y + 9);
      doc.setTextColor(0, 0, 0);
      return y + 18;
    };

    let cursorY = renderPageChrome();

    const addPage = (): void => {
      doc.addPage();
      cursorY = renderPageChrome();
    };

    const ensureSpace = (requiredHeight: number): void => {
      if (cursorY + requiredHeight > pageH - bottomMargin) {
        addPage();
      }
    };

    const drawSectionTitle = (label: string): void => {
      ensureSpace(12 + titleTopGap);
      cursorY += titleTopGap;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...HEADER_BG);
      doc.text(label, 14, cursorY);
      doc.setDrawColor(...HEADER_BG);
      doc.setLineWidth(0.3);
      doc.line(14, cursorY + 2, pageW - 14, cursorY + 2);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      cursorY += 8;
    };

    const drawEmptyMessage = (text: string): void => {
      ensureSpace(10);
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text(text, 14, cursorY + 4);
      doc.setTextColor(0, 0, 0);
      cursorY += 10;
    };

    const drawStats = (turno: TurnoParte): void => {
      ensureSpace(20);
      const cards = [
        { label: 'Presentes', value: turno.presentes, color: VERDE },
        { label: 'Ausentes', value: turno.ausentes, color: ROJO },
        { label: 'Sin registro', value: turno.sinRegistro, color: GRIS },
        { label: 'Asistencia', value: `${turno.porcentajeAsistencia}%`, color: HEADER_BG },
      ];
      const gap = 3;
      const cardW = (pageW - 28 - gap * (cards.length - 1)) / cards.length;

      cards.forEach((card, index) => {
        const x = 14 + index * (cardW + gap);
        doc.setDrawColor(200, 200, 200);
        doc.setFillColor(248, 249, 252);
        doc.roundedRect(x, cursorY, cardW, 14, 2, 2, 'FD');
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text(card.label, x + cardW / 2, cursorY + 5, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...card.color);
        doc.text(String(card.value), x + cardW / 2, cursorY + 10.5, { align: 'center' });
        doc.setFont('helvetica', 'normal');
      });

      doc.setTextColor(0, 0, 0);
      cursorY += 18;
    };

    const runTable = (options: {
      title: string;
      head: string[][];
      body: Array<Array<string | number>>;
      columnStyles?: Record<number, any>;
      headStyles?: Record<string, any>;
      bodyStyles?: Record<string, any>;
      alternateRowStyles?: Record<string, any>;
      styles?: Record<string, any>;
      didParseCell?: (hookData: any) => void;
      didDrawCell?: (hookData: any) => void;
    }): void => {
      if (options.body.length === 0) {
        drawEmptyMessage(`Sin datos para ${options.title.toLowerCase()}.`);
        return;
      }

      ensureSpace(12 + titleTopGap);
      cursorY += titleTopGap;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(options.title, 14, cursorY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      cursorY += 3;

      autoTable(doc, {
        startY: cursorY + 1,
        margin: { top: tableTopMargin, left: 14, right: 14, bottom: bottomMargin },
        theme: 'grid',
        head: options.head,
        body: options.body,
        headStyles: {
          fillColor: HEADER_BG,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          ...options.headStyles,
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 2,
          valign: 'middle',
          ...options.bodyStyles,
        },
        styles: {
          overflow: 'linebreak',
          lineColor: [226, 232, 240],
          lineWidth: 0.2,
          ...options.styles,
        },
        alternateRowStyles: {
          fillColor: [245, 248, 255],
          ...options.alternateRowStyles,
        },
        columnStyles: options.columnStyles,
        didDrawPage: (hookData) => {
          if (hookData.pageNumber > 1) {
            renderPageChrome();
          }
        },
        didParseCell: options.didParseCell,
        didDrawCell: options.didDrawCell,
      });

      cursorY = (pdfDoc.lastAutoTable?.finalY ?? cursorY) + 6;
    };

    const buildResumenEstudiantesRows = (turno: TurnoParte) => {
      const estudiantes = turno.estudiantes;
      const grupos = [
        {
          label: 'Sin registro',
          color: GRIS,
          estudiantes: estudiantes.filter(e => e.estado === 'SinRegistro'),
        },
        {
          label: 'Presentes',
          color: VERDE,
          estudiantes: estudiantes.filter(
            e => e.estado === 'Presente'
              || (e.estado === 'Retirado' && e.retiroActivo?.etiquetaEstado === 'Reingresado')
          ),
        },
        {
          label: 'Retiros anticipados',
          color: NARANJA,
          estudiantes: estudiantes.filter(
            e => e.estado === 'Retirado' && e.retiroActivo?.etiquetaEstado !== 'Reingresado'
          ),
        },
        {
          label: 'Ausentes',
          color: ROJO,
          estudiantes: estudiantes.filter(e => e.estado === 'Ausente'),
        },
      ].filter(grupo => grupo.estudiantes.length > 0);

      return {
        grupos,
        rows: grupos.map(grupo => [
          grupo.label,
          grupo.estudiantes.length,
          grupo.estudiantes.map(shortStudentName).join(', '),
        ]),
      };
    };

    const renderTurnoSection = (turno: TurnoParte, label: string): void => {
      drawSectionTitle(label);
      drawStats(turno);

      const resumenEstudiantes = buildResumenEstudiantesRows(turno);
      runTable({
        title: 'Resumen de estudiantes',
        head: [['Grupo', 'Cantidad', 'Alumnos']],
        body: resumenEstudiantes.rows,
        columnStyles: {
          0: { cellWidth: 36 },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 126 },
        },
        didParseCell: (hookData) => {
          if (hookData.section !== 'body') return;
          const grupo = resumenEstudiantes.grupos[hookData.row.index];
          if (!grupo) return;
          if (hookData.column.index === 0) {
            hookData.cell.styles.textColor = grupo.color;
            hookData.cell.styles.fontStyle = 'bold';
          }
        },
      });

      const horarioRows = turno.horarioClases.map(clase => [
        `${clase.horaEntrada} – ${clase.horaSalida}${clase.horaEntradaOriginal ? `\nEra ${clase.horaEntradaOriginal} – ${clase.horaSalidaOriginal}` : ''}`,
        clase.materia,
        clase.docente,
        claseEstadoTexto(clase),
      ]);

      runTable({
        title: 'Horario del día',
        head: [['Horario', 'Materia', 'Docente', 'Estado']],
        body: horarioRows,
        columnStyles: {
          0: { cellWidth: 42 },
          1: { cellWidth: 62 },
          2: { cellWidth: 50 },
          3: { cellWidth: 28, halign: 'center' },
        },
        didParseCell: (hookData) => {
          if (hookData.section !== 'body') return;
          const clase = turno.horarioClases[hookData.row.index];
          if (!clase) return;
          if (hookData.column.index === 3) {
            hookData.cell.styles.textColor = claseEstadoColor(clase.dictada);
            hookData.cell.styles.fontStyle = 'bold';
          }
        },
      });

      const estudiantesOrdenados = sortEstudiantesParte(turno.estudiantes);
      runTable({
        title: `Lista completa — ${label}`,
        head: [['Apellido y Nombre', 'Documento', 'Estado', 'Entrada', 'Salida']],
        body: estudiantesOrdenados.map(estudiante => [
          `${estudiante.apellido}, ${estudiante.nombre}${estudiante.teaGeneral ? ' (TEA)' : ''}`,
          estudiante.documento,
          estudianteEstadoTexto(estudiante),
          estudiante.horaEntrada ?? '—',
          estudiante.horaSalida ?? '—',
        ]),
        columnStyles: {
          0: { cellWidth: 64 },
          1: { cellWidth: 24, halign: 'center' },
          2: { cellWidth: 52 },
          3: { cellWidth: 21, halign: 'center' },
          4: { cellWidth: 21, halign: 'center' },
        },
        didParseCell: (hookData) => {
          if (hookData.section !== 'body') return;
          const estudiante = estudiantesOrdenados[hookData.row.index];
          if (!estudiante) return;

          if (hookData.column.index === 2) {
            hookData.cell.styles.textColor = estudianteEstadoColor(estudiante.estado);
            hookData.cell.styles.fontStyle = 'bold';
          }

          if (estudiante.teaGeneral) {
            hookData.cell.styles.fillColor = [240, 240, 240];
          } else if (estudiante.estado === 'Ausente') {
            hookData.cell.styles.fillColor = [255, 245, 245];
          } else if (estudiante.estado === 'Retirado') {
            hookData.cell.styles.fillColor = [255, 247, 237];
          } else if (estudiante.estado === 'Presente') {
            hookData.cell.styles.fillColor = [240, 253, 244];
          }
        },
      });
    };

    let renderedBlock = false;

    if (data.resumen.manana.disponible) {
      renderTurnoSection(data.resumen.manana, 'Turno Mañana');
      renderedBlock = true;
    }

    if (data.resumen.tarde.disponible) {
      if (renderedBlock) {
        addPage();
      }
      renderTurnoSection(data.resumen.tarde, 'Turno Tarde');
      renderedBlock = true;
    }

    if (renderedBlock) {
      addPage();
    }

    drawSectionTitle('Actividad del día');

    if (data.comentarios.length === 0) {
      drawEmptyMessage('Sin actividad registrada para este día.');
    } else {
      runTable({
        title: 'Eventos y comentarios',
        head: [['Hora', 'Tipo', 'Evento / Nota', 'Detalle', 'Autor']],
        body: data.comentarios.map(comentario => [
          formatTimestamp(comentario.timestamp),
          comentarioTipoTexto(comentario),
          comentarioEventoTexto(comentario),
          comentarioDetalleTexto(comentario),
          comentario.autor,
        ]),
        columnStyles: {
          0: { cellWidth: 24 },
          1: { cellWidth: 30 },
          2: { cellWidth: 36 },
          3: { cellWidth: 72 },
          4: { cellWidth: 20 },
        },
        bodyStyles: { fontSize: 7.5 },
        didParseCell: (hookData) => {
          if (hookData.section !== 'body' || hookData.column.index !== 1) return;
          const comentario = data.comentarios[hookData.row.index];
          if (!comentario) return;
          hookData.cell.styles.fontStyle = 'bold';
          switch (comentario.subTipo) {
            case 'NOTA':
              hookData.cell.styles.textColor = VERDE;
              break;
            case 'ASISTENCIA':
              hookData.cell.styles.textColor = NARANJA;
              break;
            case 'HORARIO':
              hookData.cell.styles.textColor = HEADER_BG;
              break;
            case 'RETIRO':
              hookData.cell.styles.textColor = [109, 40, 217];
              break;
          }
        },
      });
    }

    doc.save(`parte-diario-${data.cursoLabel}-${hoy().replace(/\//g, '-')}.pdf`);
  }

  // ── Leyendas ──────────────────────────────────────────────────────────────

  // ── Exportar programa estructurado ────────────────────────────────────────

  async exportarProgramaEstructurado(data: ProgramaEstructuradoData): Promise<void> {
    const logo  = await this.logoPromise;
    const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const LEFT  = 18;
    const W     = pageW - LEFT * 2;
    const BOTTOM = pageH - 18;
    const HDR_H  = 22;
    const Y0     = HDR_H + 5;

    let contentPage = 0;
    let curY = Y0;

    // ── helpers internos ─────────────────────────────────────────────────────

    const drawHdr = (): void => {
      if (logo) {
        try { doc.addImage(logo, 'JPEG', 5, 3, 14, 14); } catch { /* sin logo */ }
      }
      doc.setFont('times', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(60, 60, 60);
      doc.text('Colegio Luis Manuel Robles \u2014 Padre Luis Monti 1859, Ciudad de C\u00f3rdoba.', 22, 9);
      doc.text(
        `Programa del Espacio Curricular \u2014 ${data.nombreMateria} ${data.cursoLabel} ${data.anioLectivo}`,
        22, 15
      );
      doc.setDrawColor(...HEADER_BG);
      doc.setLineWidth(0.5);
      doc.line(0, HDR_H, pageW, HDR_H);
      doc.setTextColor(0, 0, 0);
    };

    const drawPgNum = (n: number): void => {
      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(String(n), pageW / 2, pageH - 8, { align: 'center' });
      doc.setTextColor(0, 0, 0);
    };

    const nextPage = (): void => {
      doc.addPage();
      contentPage++;
      drawHdr();
      drawPgNum(contentPage);
      curY = Y0;
    };

    const need = (h: number): void => {
      if (curY + h > BOTTOM) nextPage();
    };

    const wrapText = (
      text: string,
      indent: number,
      font: string,
      size: number,
      lh = 5.5
    ): void => {
      doc.setFont('times', font);
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(text, W - (indent - LEFT)) as string[];
      for (const ln of lines) {
        need(lh + 1);
        doc.text(ln, indent, curY);
        curY += lh;
      }
    };

    const sectionTitle = (title: string): void => {
      need(16);
      curY += 3;
      doc.setFont('times', 'bolditalic');
      doc.setFontSize(15);
      doc.setTextColor(0, 0, 0);
      doc.text(title, LEFT, curY);
      const tw = doc.getTextWidth(title);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.35);
      doc.line(LEFT, curY + 1.5, LEFT + tw, curY + 1.5);
      curY += 9;
    };

    // ── Portada ──────────────────────────────────────────────────────────────

    const cx = pageW / 2;

    if (logo) {
      try { doc.addImage(logo, 'JPEG', (pageW - 55) / 2, 38, 55, 55); } catch { /* */ }
    }

    doc.setFont('times', 'bolditalic');
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text('Colegio Luis Manuel Robles', cx, 108, { align: 'center' });

    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text('Padre Luis Monti 1859 - Ciudad de C\u00f3rdoba', cx, 116, { align: 'center' });

    doc.setFont('times', 'italic');
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text(`${data.nombreMateria} - ${data.cursoLabel}`, cx, 150, { align: 'center' });

    doc.setFontSize(12);
    doc.text(`Autor - ${data.nombreDocente}`,                 cx, 185, { align: 'center' });
    doc.text(`Fecha de Creaci\u00f3n - ${data.fechaCreacion}`, cx, 200, { align: 'center' });
    doc.text(`A\u00f1o lectivo - ${data.anioLectivo}`,        cx, 215, { align: 'center' });

    // ── Primera página de contenido ──────────────────────────────────────────

    doc.addPage();
    contentPage = 1;
    drawHdr();
    drawPgNum(contentPage);
    curY = Y0;

    // Metadatos
    const now = new Date();
    const p2 = (n: number) => String(n).padStart(2, '0');
    const fechaImpresion = `${p2(now.getDate())}/${p2(now.getMonth() + 1)}/${now.getFullYear()}`;

    const metaLine = (label: string, value: string): void => {
      need(7);
      doc.setFont('times', 'bolditalic');
      doc.setFontSize(11);
      const lw = doc.getTextWidth(`${label}: `);
      doc.text(`${label}: `, LEFT, curY);
      doc.setFont('times', 'italic');
      doc.text(value, LEFT + lw, curY);
      curY += 6;
    };

    metaLine('Fecha de impresi\u00f3n', fechaImpresion);
    metaLine('\u00daltima modificaci\u00f3n', data.fechaUltimaModificacion);
    metaLine('Vencimiento', data.fechaVencimiento);
    curY += 5;

    // ── Descripción ──────────────────────────────────────────────────────────

    if (data.descripcion) {
      sectionTitle('Descripci\u00f3n');
      wrapText(data.descripcion, LEFT, 'normal', 11);
      curY += 4;
    }

    // ── Objetivos ────────────────────────────────────────────────────────────

    if (data.objetivos.length > 0) {
      sectionTitle('Objetivos');
      doc.setFont('times', 'italic');
      doc.setFontSize(11);
      for (const obj of data.objetivos) {
        const lines = doc.splitTextToSize(`\u2022  ${obj.descripcion}`, W - 4) as string[];
        for (const ln of lines) {
          need(6);
          doc.text(ln, LEFT + 4, curY);
          curY += 5.5;
        }
      }
      curY += 4;
    }

    // ── Unidades ─────────────────────────────────────────────────────────────

    if (data.unidades.length > 0) {
      sectionTitle('Unidades');

      for (const unidad of data.unidades) {
        // Encabezado de unidad
        need(14);
        const uLabel = `Unidad ${unidad.nro} \u2014 ${unidad.titulo}`;
        doc.setFont('times', 'italic');
        doc.setFontSize(13);
        doc.setTextColor(0, 0, 0);
        const uLines = doc.splitTextToSize(uLabel, W) as string[];
        doc.text(uLines[0], LEFT, curY);
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.3);
        doc.line(LEFT, curY + 1.5, LEFT + Math.min(doc.getTextWidth(uLines[0]), W), curY + 1.5);
        curY += 7;
        for (let i = 1; i < uLines.length; i++) {
          need(6); doc.text(uLines[i], LEFT, curY); curY += 5.5;
        }

        // Descripción de unidad
        if (unidad.descripcion) {
          wrapText(unidad.descripcion, LEFT + 4, 'normal', 11);
          curY += 2;
        }

        // Sub-encabezado "Temas"
        need(9);
        doc.setFont('times', 'bold');
        doc.setFontSize(11);
        doc.text('Temas', LEFT + 4, curY);
        const temasW = doc.getTextWidth('Temas');
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.3);
        doc.line(LEFT + 4, curY + 1, LEFT + 4 + temasW, curY + 1);
        curY += 6.5;

        // Lista de temas
        for (const tema of unidad.temas) {
          const numTitle = `\u2022  ${unidad.nro}.${tema.nro}  ${tema.titulo}`;
          doc.setFont('times', 'bold');
          doc.setFontSize(11);
          const ntLines = doc.splitTextToSize(numTitle, W - 6) as string[];
          for (const ln of ntLines) {
            need(6); doc.text(ln, LEFT + 6, curY); curY += 5.5;
          }
          if (tema.descripcion) {
            doc.setFont('times', 'normal');
            const dLines = doc.splitTextToSize(`\u2014 ${tema.descripcion}`, W - 12) as string[];
            for (const ln of dLines) {
              need(6); doc.text(ln, LEFT + 12, curY); curY += 5.5;
            }
          }
          curY += 1;
        }
        curY += 5;
      }
    }

    // ── Guardar ──────────────────────────────────────────────────────────────

    const safe = data.nombreMateria.replace(/[^\w\s\-]/g, '').trim().replace(/\s+/g, '-');
    doc.save(`programa-${safe}-${data.cursoLabel}-${data.anioLectivo}.pdf`);
  }

  private dibujarLeyenda(doc: jsPDF): void {
    const pageH = doc.internal.pageSize.getHeight();
    const y = pageH - 8;
    doc.setFontSize(6.5);
    const items: [string, [number,number,number]][] = [
      ['Verde: 0–9 faltas',     VERDE],
      ['Amarillo: 10–14 faltas', AMARILLO],
      ['Naranja: 15–20 faltas',  NARANJA],
      ['Rojo: 21+ faltas',       ROJO],
      ['Gris: TEA (+25 Faltas)', GRIS],
    ];
    let x = 14;
    items.forEach(([label, color]) => {
      doc.setFillColor(...color);
      doc.circle(x + 1.5, y - 0.5, 1.5, 'F');
      doc.setTextColor(80, 80, 80);
      doc.text(label, x + 4.5, y);
      x += 38;
    });
  }

  private dibujarLeyendaDocente(doc: jsPDF): void {
    const pageH = doc.internal.pageSize.getHeight();
    const y = pageH - 8;
    doc.setFontSize(6.5);
    const items: [string, [number,number,number]][] = [
      ['Verde: 85–100% (Regular)',  VERDE],
      ['Amarillo: 80–84% (Riesgo)', AMARILLO],
      ['Naranja: 75–79% (Riesgo)',  NARANJA],
      ['Rojo: 0–74% (TEA)',         ROJO],
    ];
    let x = 14;
    items.forEach(([label, color]) => {
      doc.setFillColor(...color);
      doc.circle(x + 1.5, y - 0.5, 1.5, 'F');
      doc.setTextColor(80, 80, 80);
      doc.text(label, x + 4.5, y);
      x += 48;
    });
  }

  // ── Exportar sección del dashboard como imagen en PDF ────────────────────

  async exportarDashboardGeneralPdf(data: DashboardPdfData): Promise<void> {
    const logo = await this.logoPromise;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth(); // 297
    const pageH = doc.internal.pageSize.getHeight(); // 210

    const contentY = drawPageHeader(doc, data.titulo, data.subtitulo, logo);

    // Filtros + fecha emisión
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(data.filtrosAplicados, 14, contentY + 4);
    doc.text(`Emitido: ${hoy()}`, pageW - 14, contentY + 4, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    const bodyY = contentY + 10;
    const bodyH = pageH - bodyY - 6;
    const layout = data.layout ?? 'general';

    if (layout === 'ec') {
      this.drawDashboardEC(doc, data, bodyY, bodyH, pageW, pageH);
    } else {
      this.drawDashboardGeneral(doc, data, bodyY, bodyH, pageW, pageH);
    }

    doc.save(data.nombreArchivo);
  }

  // ── Layout General: fila de cards arriba + charts 2×2 abajo ──────────────
  private drawDashboardGeneral(
    doc: jsPDF, data: DashboardPdfData,
    bodyY: number, bodyH: number, pageW: number, _pageH: number,
  ): void {
    const margin = 14;
    const contentW = pageW - margin * 2; // ≈ 269

    // ── KPI cards en una fila horizontal arriba ──
    const cardRowH = 22;
    const cardCount = data.kpis.length || 1;
    const cardGap = 4;
    const totalGaps = (cardCount - 1) * cardGap;
    const cardW = (contentW - totalGaps) / cardCount;

    data.kpis.forEach((kpi, i) => {
      const cx = margin + i * (cardW + cardGap);
      const cy = bodyY;

      doc.setFillColor(240, 245, 250);
      doc.roundedRect(cx, cy, cardW, cardRowH, 2, 2, 'F');
      doc.setDrawColor(200, 215, 235);
      doc.setLineWidth(0.3);
      doc.roundedRect(cx, cy, cardW, cardRowH, 2, 2, 'S');

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...HEADER_BG);
      doc.text(kpi.valor, cx + cardW / 2, cy + 9, { align: 'center' });

      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      const labelLines = doc.splitTextToSize(kpi.label, cardW - 4) as string[];
      doc.text(labelLines, cx + cardW / 2, cy + 15, { align: 'center' });
    });
    doc.setTextColor(0, 0, 0);

    // ── Charts 2×2 debajo de las cards ──
    const chartsY = bodyY + cardRowH + 5;
    const chartsH = bodyH - cardRowH - 5;

    const chartCols = 2;
    const chartRows = Math.ceil(data.charts.length / chartCols);
    const chartGapH = 5;
    const chartGapW = 5;
    const chartTitleH = 6;
    const chartW = (contentW - (chartCols - 1) * chartGapW) / chartCols;
    const chartH = (chartsH - chartRows * chartTitleH - (chartRows - 1) * chartGapH) / chartRows;

    data.charts.forEach((ch, i) => {
      const col = i % chartCols;
      const row = Math.floor(i / chartCols);
      const cx = margin + col * (chartW + chartGapW);
      const cy = chartsY + row * (chartH + chartTitleH + chartGapH);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(ch.titulo, cx + chartW / 2, cy + 4, { align: 'center' });
      doc.setFont('helvetica', 'normal');

      doc.setDrawColor(220, 230, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(cx, cy + chartTitleH, chartW, chartH, 2, 2, 'S');

      // Fit image preserving aspect ratio within cell
      const cellW = chartW - 1;
      const cellH = chartH - 1;
      const ar = ch.aspectRatio ?? (cellW / cellH);
      let imgW = cellW;
      let imgH = imgW / ar;
      if (imgH > cellH) {
        imgH = cellH;
        imgW = imgH * ar;
      }
      const imgX = cx + 0.5 + (cellW - imgW) / 2;
      const imgY = cy + chartTitleH + 0.5 + (cellH - imgH) / 2;

      try {
        doc.addImage(ch.dataUrl, 'PNG', imgX, imgY, imgW, imgH);
      } catch { /* skip if dataUrl empty */ }
    });
  }

  // ── Layout EC: cards en fila arriba + charts centrados abajo ──────────────
  private drawDashboardEC(
    doc: jsPDF, data: DashboardPdfData,
    bodyY: number, bodyH: number, pageW: number, _pageH: number,
  ): void {
    const margin = 14;
    const contentW = pageW - margin * 2;

    // ── KPI cards centradas en fila ──
    const cardRowH = 22;
    const cardCount = data.kpis.length || 1;
    const cardGap = 6;
    const cardW = 55;
    const totalCardsW = cardCount * cardW + (cardCount - 1) * cardGap;
    const cardsStartX = margin + (contentW - totalCardsW) / 2;

    data.kpis.forEach((kpi, i) => {
      const cx = cardsStartX + i * (cardW + cardGap);
      const cy = bodyY;

      doc.setFillColor(240, 245, 250);
      doc.roundedRect(cx, cy, cardW, cardRowH, 2, 2, 'F');
      doc.setDrawColor(200, 215, 235);
      doc.setLineWidth(0.3);
      doc.roundedRect(cx, cy, cardW, cardRowH, 2, 2, 'S');

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...HEADER_BG);
      doc.text(kpi.valor, cx + cardW / 2, cy + 9, { align: 'center' });

      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      const labelLines = doc.splitTextToSize(kpi.label, cardW - 4) as string[];
      doc.text(labelLines, cx + cardW / 2, cy + 15, { align: 'center' });
    });
    doc.setTextColor(0, 0, 0);

    // ── Charts centrados en la página ──
    const chartsY = bodyY + cardRowH + 6;
    const chartsH = bodyH - cardRowH - 6;

    const chartCount = data.charts.length;
    const chartGapW = 8;
    // Limitar el tamaño de cada chart para que no se estire
    const maxChartW = 120;
    const maxChartH = chartsH - 6;
    const chartW = Math.min(maxChartW, (contentW - (chartCount - 1) * chartGapW) / chartCount);
    const chartH = Math.min(maxChartH, chartW * 0.85); // mantener proporciones
    const chartTitleH = 6;

    const totalW = chartCount * chartW + (chartCount - 1) * chartGapW;
    const startX = margin + (contentW - totalW) / 2;
    // Centrar verticalmente en el espacio disponible
    const startY = chartsY + (chartsH - chartH - chartTitleH) / 2;

    data.charts.forEach((ch, i) => {
      const cx = startX + i * (chartW + chartGapW);
      const cy = startY;

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(ch.titulo, cx + chartW / 2, cy + 4, { align: 'center' });
      doc.setFont('helvetica', 'normal');

      doc.setDrawColor(220, 230, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(cx, cy + chartTitleH, chartW, chartH, 2, 2, 'S');

      // Fit image preserving aspect ratio
      const cellW = chartW - 1;
      const cellH = chartH - 1;
      const ar = ch.aspectRatio ?? (cellW / cellH);
      let imgW = cellW;
      let imgH = imgW / ar;
      if (imgH > cellH) {
        imgH = cellH;
        imgW = imgH * ar;
      }
      const imgX = cx + 0.5 + (cellW - imgW) / 2;
      const imgY = cy + chartTitleH + 0.5 + (cellH - imgH) / 2;

      try {
        doc.addImage(ch.dataUrl, 'PNG', imgX, imgY, imgW, imgH);
      } catch { /* skip if dataUrl empty */ }
    });
  }

  async exportarDashboardSeccion(data: {
    titulo: string;
    subtitulo: string;
    elementRef: HTMLElement;
    nombreArchivo: string;
  }): Promise<void> {
    const logo = await this.logoPromise;

    const canvas = await html2canvas(data.elementRef, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#f0f5fa',
      logging: false,
      onclone: (clonedDoc: Document, clonedEl: HTMLElement) => {
        // ECharts renders to <canvas> elements which html2canvas cannot read directly.
        // Copy each echarts canvas as a data URL image into the cloned DOM.
        const origCanvases = data.elementRef.querySelectorAll('canvas');
        const clonedCanvases = clonedEl.querySelectorAll('canvas');
        origCanvases.forEach((origCanvas, i) => {
          const clonedCanvas = clonedCanvases[i];
          if (!clonedCanvas) return;
          try {
            const img = clonedDoc.createElement('img');
            img.src = origCanvas.toDataURL('image/png');
            img.style.width = origCanvas.style.width || origCanvas.getAttribute('width') + 'px';
            img.style.height = origCanvas.style.height || origCanvas.getAttribute('height') + 'px';
            clonedCanvas.parentNode?.replaceChild(img, clonedCanvas);
          } catch { /* tainted canvas — skip */ }
        });
      },
    });

    const imgData = canvas.toDataURL('image/png');
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    const headerY = drawPageHeader(doc, data.titulo, data.subtitulo, logo);
    const contentY = headerY + 4;
    const availableH = pageH - contentY - 8;
    const availableW = pageW - 20;

    const imgAspect = canvas.width / canvas.height;
    let imgW = availableW;
    let imgH = imgW / imgAspect;

    if (imgH <= availableH) {
      // Fits on one page
      doc.addImage(imgData, 'PNG', 10, contentY, imgW, imgH);
    } else {
      // Multi-page: slice the canvas image
      const totalImgH = imgW / imgAspect;
      const pxPerMm = canvas.height / totalImgH;
      let remainingH = totalImgH;
      let srcY = 0;
      let isFirstPage = true;

      while (remainingH > 0) {
        const sliceAvailH = isFirstPage ? availableH : (pageH - 16);
        const sliceH = Math.min(remainingH, sliceAvailH);
        const slicePxH = Math.round(sliceH * pxPerMm);

        // Create a sub-canvas for this slice
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = slicePxH;
        const ctx = sliceCanvas.getContext('2d')!;
        ctx.drawImage(canvas, 0, srcY, canvas.width, slicePxH, 0, 0, canvas.width, slicePxH);

        const sliceData = sliceCanvas.toDataURL('image/png');
        const startY = isFirstPage ? contentY : 8;
        doc.addImage(sliceData, 'PNG', 10, startY, imgW, sliceH);

        srcY += slicePxH;
        remainingH -= sliceH;

        if (remainingH > 0) {
          doc.addPage();
          drawPageHeader(doc, data.titulo, data.subtitulo, logo);
          isFirstPage = false;
        }
      }
    }

    doc.save(data.nombreArchivo);
  }

  // ── Reporte de retiros anticipados ─────────────────────────────────────────

  async exportarReporteRetiros(data: ReporteRetirosData): Promise<void> {
    const logo  = await this.logoPromise;
    const doc   = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }) as PdfWithAutoTable;
    const pageW = doc.internal.pageSize.getWidth();

    const titulo    = 'Listado de Retiros Anticipados';
    const subtitulo = data.cursoLabel === 'Todos los cursos'
      ? 'Todos los cursos'
      : `Curso: ${data.cursoLabel}`;

    let y = drawPageHeader(doc, titulo, subtitulo, logo);

    // Metadata
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(`Período: ${periodoTexto(data.fechaDesde, data.fechaHasta)}`, 14, y + 4);
    doc.text(`Total retiros: ${data.retiros.length}`, 14, y + 9);
    doc.text(`Emitido: ${hoy()}`, pageW - 14, y + 4, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    y += 16;

    const estadoLabel = (etiqueta: string | null): string => {
      switch (etiqueta) {
        case 'ConReingreso':     return 'Con Reingreso';
        case 'Reingresado':      return 'Reingresado';
        case 'ReingresoVencido': return 'Reingreso Vencido';
        default:                 return 'Sin Reingreso';
      }
    };

    const estadoColor = (etiqueta: string | null): [number, number, number] => {
      switch (etiqueta) {
        case 'Reingresado':      return VERDE;
        case 'ReingresoVencido': return ROJO;
        case 'ConReingreso':     return AMARILLO;
        default:                 return GRIS;
      }
    };

    const responsableDetalle = (item: RetiroReporteItem): string => {
      const partes: string[] = [];
      if (item.apellidoResponsable && item.nombreResponsable) {
        let nombre = `${item.apellidoResponsable}, ${item.nombreResponsable}`;
        if (item.idTutor) nombre += ' (Tutor)';
        partes.push(nombre);
      }
      if (item.dniResponsable)      partes.push(`DNI: ${item.dniResponsable}`);
      if (item.relacionResponsable) partes.push(`Relación: ${item.relacionResponsable}`);
      if (item.telefonoResponsable) partes.push(`Tel: ${item.telefonoResponsable}`);
      if (item.correoResponsable)   partes.push(`Email: ${item.correoResponsable}`);
      return partes.length > 0 ? partes.join('\n') : '—';
    };

    autoTable(doc, {
      startY: y,
      margin: { top: HEADER_H + 2, left: 8, right: 8 },
      head: [['Estudiante', 'DNI', 'Curso', 'Fecha', 'Turno', 'Tipo', 'Estado', 'Salida', 'Reingr. Est.', 'Reingr. Eft.', 'Responsable', 'Preceptor', 'Motivo']],
      body: data.retiros.map(item => [
        `${item.apellido}, ${item.nombre}`,
        item.documento,
        item.curso,
        formatFecha(item.fecha),
        item.turno === 'MANANA' ? 'Mañana' : 'Tarde',
        item.tipoRetiro ?? '—',
        estadoLabel(item.etiquetaEstado),
        item.horarioRetiro,
        item.horarioLimiteReingreso ?? '—',
        item.horarioReingreso ?? '—',
        responsableDetalle(item),
        item.nombrePreceptor ?? '—',
        item.motivo ?? '—',
      ]),
      headStyles: {
        fillColor: HEADER_BG,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize:  7,
        halign:    'center',
      },
      bodyStyles:          { fontSize: 7 },
      alternateRowStyles:  { fillColor: [245, 248, 255] },
      columnStyles: {
        0:  { cellWidth: 34 },                          // Estudiante
        1:  { cellWidth: 18, halign: 'center' },        // DNI
        2:  { cellWidth: 12, halign: 'center' },        // Curso
        3:  { cellWidth: 18, halign: 'center' },        // Fecha
        4:  { cellWidth: 14, halign: 'center' },        // Turno
        5:  { cellWidth: 12, halign: 'center' },        // Tipo
        6:  { cellWidth: 24, halign: 'center' },        // Estado
        7:  { cellWidth: 14, halign: 'center' },        // Salida
        8:  { cellWidth: 18, halign: 'center' },        // Reingr Est
        9:  { cellWidth: 18, halign: 'center' },        // Reingr Eft
        10: { cellWidth: 40 },                          // Responsable
        11: { cellWidth: 20 },                          // Preceptor
        12: { cellWidth: 'auto' },                      // Motivo (ocupa todo el espacio restante)
      },
      didDrawPage: (hookData) => {
        if (hookData.pageNumber > 1) {
          drawPageHeader(doc, titulo, subtitulo, logo);
          doc.setFontSize(7);
          doc.setTextColor(80, 80, 80);
          doc.text(`Período: ${periodoTexto(data.fechaDesde, data.fechaHasta)}`, 14, HEADER_H + 2);
          doc.text(`Emitido: ${hoy()}`, pageW - 14, HEADER_H + 2, { align: 'right' });
          doc.setTextColor(0, 0, 0);
        }
      },
      didParseCell: (hookData) => {
        // Colorear celda Estado (índice 6)
        if (hookData.section === 'body' && hookData.column.index === 6) {
          const item = data.retiros[hookData.row.index];
          if (item) {
            const [r, g, b] = estadoColor(item.etiquetaEstado);
            hookData.cell.styles.textColor = [r, g, b];
            hookData.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });

    doc.save(`reporte-retiros-${data.cursoLabel.replace(/\s+/g, '-')}-${hoy().replace(/\//g, '-')}.pdf`);
  }
}
