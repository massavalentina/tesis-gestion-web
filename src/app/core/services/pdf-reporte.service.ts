import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { ReporteAsistenciaItem } from '../../features/reporte-asistencia/models/reporte-asistencia.model';
import { DetalleAsistencia } from '../../features/reporte-asistencia/models/detalle-asistencia.model';

// ─── Colores de badge ─────────────────────────────────────────────────────────
const VERDE   = [46, 125, 50]   as [number, number, number];
const AMARILLO= [183, 130, 0]   as [number, number, number];
const NARANJA = [200, 95, 0]    as [number, number, number];
const ROJO    = [183, 28, 28]   as [number, number, number];
const GRIS    = [117, 117, 117] as [number, number, number];
const HEADER_BG = [21, 101, 192] as [number, number, number]; // azul oscuro

function badgeColor(inasistencias: number, teaGeneral: boolean): [number, number, number] {
  if (teaGeneral)        return GRIS;
  if (inasistencias >= 21) return ROJO;
  if (inasistencias >= 15) return NARANJA;
  if (inasistencias >= 10) return AMARILLO;
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

function drawPageHeader(doc: jsPDF, titulo: string, subtitulo: string): number {
  const pageW = doc.internal.pageSize.getWidth();

  // Banda azul superior
  doc.setFillColor(...HEADER_BG);
  doc.rect(0, 0, pageW, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(titulo, 14, 10);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(subtitulo, 14, 17);

  doc.setTextColor(0, 0, 0);
  return 26; // y después del header
}

// ─── Exportar reporte general de curso ───────────────────────────────────────

export interface ReporteCursoData {
  cursoCodigo: string;
  totalDiasDictados: number;
  fechaDesde: string | null;
  fechaHasta: string | null;
  estudiantes: ReporteAsistenciaItem[];
}

// ─── Exportar detalle de estudiante ──────────────────────────────────────────

export interface DetalleEstudianteData {
  nombre: string;
  apellido: string;
  documento: string;
  teaGeneral: boolean;
  presencias: number;
  inasistencias: number;
  llegadasTarde: number;
  ausentePorLLT: number;
  retirosAnticipados: number;
  porcentajeAsistencia: number;
  fechaDesde: string | null;
  fechaHasta: string | null;
  registros: DetalleAsistencia[];
}

@Injectable({ providedIn: 'root' })
export class PdfReporteService {

  exportarReporteCurso(data: ReporteCursoData): void {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    let y = drawPageHeader(doc, 'Reporte de Asistencia General', `Curso: ${data.cursoCodigo}`);

    // Metadata
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(`Período: ${periodoTexto(data.fechaDesde, data.fechaHasta)}`, 14, y + 4);
    doc.text(`Total días dictados: ${data.totalDiasDictados}`, 14, y + 9);
    doc.text(`Emitido: ${hoy()}`, pageW - 14, y + 4, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    y += 16;

    autoTable(doc, {
      startY: y,
      head: [[
        'Estudiante', 'DNI',
        'Presencias', 'Inasistencias', 'Llegadas Tarde', 'Ausente LLT', 'Retiros', '% Asistencia'
      ]],
      body: data.estudiantes.map(est => [
        `${est.apellido}, ${est.nombre}`,
        est.documento,
        est.presencias,
        est.inasistencias,
        est.llegadasTarde,
        est.ausentePorLLT,
        est.retirosAnticipados,
        `${est.porcentajeAsistencia}%`,
      ]),
      headStyles: {
        fillColor: HEADER_BG,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 248, 255] },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 28, halign: 'center' },
        2: { cellWidth: 22, halign: 'center' },
        3: { cellWidth: 26, halign: 'center' },
        4: { cellWidth: 26, halign: 'center' },
        5: { cellWidth: 22, halign: 'center' },
        6: { cellWidth: 18, halign: 'center' },
        7: { cellWidth: 22, halign: 'center' },
      },
      didParseCell: (hookData) => {
        // Colorear celda de inasistencias
        if (hookData.section === 'body' && hookData.column.index === 3) {
          const est = data.estudiantes[hookData.row.index];
          if (est) {
            const [r, g, b] = badgeColor(est.inasistencias, est.teaGeneral);
            hookData.cell.styles.textColor = [r, g, b];
            hookData.cell.styles.fontStyle = 'bold';
          }
        }
        // Colorear % asistencia (verde si >=75, rojo si <50, amarillo si entre)
        if (hookData.section === 'body' && hookData.column.index === 7) {
          const est = data.estudiantes[hookData.row.index];
          if (est) {
            const p = est.porcentajeAsistencia;
            if (p >= 75) hookData.cell.styles.textColor = VERDE;
            else if (p < 50) hookData.cell.styles.textColor = ROJO;
            else hookData.cell.styles.textColor = NARANJA;
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

    // Leyenda al pie
    this.dibujarLeyenda(doc);

    doc.save(`reporte-asistencia-${data.cursoCodigo}-${hoy().replace(/\//g, '-')}.pdf`);
  }

  exportarDetalleEstudiante(data: DetalleEstudianteData): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    const titulo = 'Detalle de Asistencia';
    const subtitulo = `${data.apellido}, ${data.nombre}  |  DNI: ${data.documento}${data.teaGeneral ? '  |  TEA' : ''}`;
    let y = drawPageHeader(doc, titulo, subtitulo);

    // Metadata período + emisión
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(`Período: ${periodoTexto(data.fechaDesde, data.fechaHasta)}`, 14, y + 4);
    doc.text(`Emitido: ${hoy()}`, pageW - 14, y + 4, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    y += 12;

    // Tarjetas de resumen
    const tarjetas = [
      { label: 'Presencias',     valor: data.presencias,          color: [0,0,0] as [number,number,number] },
      { label: 'Inasistencias',  valor: data.inasistencias,       color: badgeColor(data.inasistencias, data.teaGeneral) },
      { label: 'Llegadas Tarde', valor: data.llegadasTarde,       color: [0,0,0] as [number,number,number] },
      { label: 'Ausente LLT',    valor: data.ausentePorLLT,       color: [0,0,0] as [number,number,number] },
      { label: 'Retiros',        valor: data.retirosAnticipados,  color: [0,0,0] as [number,number,number] },
      { label: '% Asistencia',   valor: `${data.porcentajeAsistencia}%`,
        color: data.porcentajeAsistencia >= 75 ? VERDE : data.porcentajeAsistencia < 50 ? ROJO : NARANJA },
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

    // Filtrar registros igual que la vista (ocultar presencias puras)
    const registrosFiltrados = data.registros.filter(r => {
      const man = (r.codigoManana ?? '').toUpperCase();
      const tar = (r.codigoTarde ?? '').toUpperCase();
      return !((man === 'P' || man === '-') && (tar === 'P' || tar === '-') && r.valorTotal === 0);
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

      autoTable(doc, {
        startY: y,
        head: [['Fecha', 'Mañana', 'Hora Entrada', 'Tarde', 'Valor Inasist.']],
        body: registrosFiltrados.map(r => [
          formatFecha(r.fecha),
          r.codigoManana ?? '-',
          r.horaEntradaManana ?? '-',
          r.codigoTarde ?? '-',
          r.valorTotal,
        ]),
        headStyles: {
          fillColor: HEADER_BG,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
        },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 248, 255] },
        columnStyles: {
          0: { cellWidth: 28, halign: 'center' },
          1: { cellWidth: 28, halign: 'center' },
          2: { cellWidth: 28, halign: 'center' },
          3: { cellWidth: 28, halign: 'center' },
          4: { cellWidth: 24, halign: 'center' },
        },
        didParseCell: (hookData) => {
          if (hookData.section === 'body') {
            const r = registrosFiltrados[hookData.row.index];
            if (!r) return;
            // Código mañana coloreado
            if (hookData.column.index === 1) {
              hookData.cell.styles.textColor = codigoColor(r.codigoManana);
              hookData.cell.styles.fontStyle = 'bold';
            }
            // Código tarde coloreado
            if (hookData.column.index === 3) {
              hookData.cell.styles.textColor = codigoColor(r.codigoTarde);
              hookData.cell.styles.fontStyle = 'bold';
            }
            // Valor inasistencia: rojo si > 0
            if (hookData.column.index === 4 && r.valorTotal > 0) {
              hookData.cell.styles.textColor = ROJO;
              hookData.cell.styles.fontStyle = 'bold';
            }
            // Fila con ausencia: fondo rojo muy suave
            if (r.valorTotal >= 1) {
              hookData.cell.styles.fillColor = [255, 245, 245];
            }
          }
        },
      });
    }

    const nombreArchivo = `detalle-asistencia-${data.apellido}-${data.nombre}-${hoy().replace(/\//g, '-')}.pdf`;
    doc.save(nombreArchivo);
  }

  private dibujarLeyenda(doc: jsPDF): void {
    const pageH = doc.internal.pageSize.getHeight();
    const pageW = doc.internal.pageSize.getWidth();
    const y = pageH - 8;

    doc.setFontSize(6.5);
    doc.setTextColor(100, 100, 100);

    const items: [string, [number,number,number]][] = [
      ['Verde: 0–9 faltas', VERDE],
      ['Amarillo: 10–14 faltas', AMARILLO],
      ['Naranja: 15–20 faltas', NARANJA],
      ['Rojo: 21+ faltas', ROJO],
      ['Gris: TEA (≥25 faltas)', GRIS],
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
}

function codigoColor(codigo: string): [number, number, number] {
  switch ((codigo ?? '').toUpperCase()) {
    case 'P':    return [46, 125, 50];    // verde
    case 'A':    return [183, 28, 28];    // rojo
    case 'LLT':
    case 'LLTE': return [183, 130, 0];    // amarillo
    case 'LLTC': return [200, 95, 0];     // naranja
    case 'RA':
    case 'RAE':  return [21, 101, 192];   // azul
    default:     return [100, 100, 100];  // gris
  }
}
