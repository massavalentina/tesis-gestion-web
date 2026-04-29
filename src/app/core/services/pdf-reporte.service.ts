import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { ReporteAsistenciaItem } from '../../features/reporte-asistencia/models/reporte-asistencia.model';
import { DetalleAsistencia } from '../../features/reporte-asistencia/models/detalle-asistencia.model';
import { ReporteDocenteItem } from '../../features/reporte-asistencia-docente/models/reporte-asistencia-docente.model';
import { DetalleDocenteRegistro } from '../../features/reporte-asistencia-docente/models/detalle-docente.model';

// ─── Colores ──────────────────────────────────────────────────────────────────
const VERDE    = [46, 125, 50]    as [number, number, number];
const AMARILLO = [183, 130, 0]    as [number, number, number];
const NARANJA  = [200, 95, 0]     as [number, number, number];
const ROJO     = [183, 28, 28]    as [number, number, number];
const GRIS     = [117, 117, 117]  as [number, number, number];
const HEADER_BG = [21, 101, 192]  as [number, number, number];

const HEADER_H = 26; // altura reservada para el encabezado (mm)

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

  // ── Leyendas ──────────────────────────────────────────────────────────────

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
}
