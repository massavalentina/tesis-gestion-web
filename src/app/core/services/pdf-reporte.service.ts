import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { LibretaEspacio } from '../../features/ficha-alumno/models/libreta-calificaciones.model';
import { ReporteAsistenciaItem } from '../../features/reporte-asistencia/models/reporte-asistencia.model';
import { DetalleAsistencia } from '../../features/reporte-asistencia/models/detalle-asistencia.model';
import { ReporteDocenteItem } from '../../features/reporte-asistencia-docente/models/reporte-asistencia-docente.model';
import { DetalleDocenteRegistro } from '../../features/reporte-asistencia-docente/models/detalle-docente.model';
import { ParteDiarioResumen } from '../../features/parte-diario-digital/models/parte-diario-resumen.model';
import { ComentarioParte } from '../../features/parte-diario-digital/models/comentario-parte.model';
import { TurnoParte } from '../../features/parte-diario-digital/models/turno-parte.model';
import { HorarioClase } from '../../features/parte-diario-digital/models/horario-clase.model';
import { EstudianteParte } from '../../features/parte-diario-digital/models/estudiante-parte.model';

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


export interface LibretaCalificacionesData {
  apellido: string;
  nombre: string;
  codigoCurso: string;
  anioLectivo: number;
  espacios: LibretaEspacio[];
  asistencia?: {
    presencias: number;
    inasistencias: number;
    ausenciasPuras: number;
    ancCount: number;
    llegadasTarde: number;
    ausentePorLLT: number;
    retirosAnticipados: number;
    retirosExpress: number;
    retirosAnticipadosExtendidos: number;
    ausentePorRA: number;
    porcentajeAsistencia: number;
    teaGeneral: boolean;
  };
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

  // ── Libreta de calificaciones ─────────────────────────────────────────────

  async exportarLibretaCalificaciones(data: LibretaCalificacionesData): Promise<void> {
    const logo  = await this.logoPromise;
    const doc   = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();  // 297mm
    const pageH = doc.internal.pageSize.getHeight(); // 210mm
    const LEFT  = 10;
    const RIGHT = 10;
    const CW    = pageW - LEFT - RIGHT; // 277mm

    const PLACEHOLDER: LibretaEspacio[] = [
      { idEC: '', nombreMateria: 'Lengua y Literatura',        instancias: [] },
      { idEC: '', nombreMateria: 'Matemática',                 instancias: [] },
      { idEC: '', nombreMateria: 'Historia',                   instancias: [] },
      { idEC: '', nombreMateria: 'Geografía',                  instancias: [] },
      { idEC: '', nombreMateria: 'Biología',                   instancias: [] },
      { idEC: '', nombreMateria: 'Inglés',                     instancias: [] },
      { idEC: '', nombreMateria: 'Educación Física',           instancias: [] },
      { idEC: '', nombreMateria: 'Educación Tecnológica',      instancias: [] },
      { idEC: '', nombreMateria: 'Educación Artística',        instancias: [] },
      { idEC: '', nombreMateria: 'Ciudadanía y Participación', instancias: [] },
    ];
    const fuente = data.espacios.length > 0 ? data.espacios : PLACEHOLDER;

    // ── Pre-computar filas ────────────────────────────────────────────────────
    interface EvalPdf { n: number|null; r1: number|null; r2: number|null; ef: number|null }
    interface FilaPdf {
      nombre: string;
      evals: EvalPdf[];   // 8 entradas
      nf: number|null;
      estado: string;
    }

    const filasPdf: FilaPdf[] = fuente.map(esp => {
      const evals: EvalPdf[] = Array.from({ length: 8 }, (_, i) => {
        const inst = esp.instancias.find(x => x.nro === i + 1);
        if (!inst) return { n: null, r1: null, r2: null, ef: null };
        const cands = [inst.n, inst.r1, inst.r2].filter((v): v is number => v !== null);
        return { n: inst.n, r1: inst.r1, r2: inst.r2, ef: cands.length > 0 ? Math.max(...cands) : null };
      });
      const efs = evals.map(e => e.ef).filter((v): v is number => v !== null);
      const nf  = efs.length > 0 ? efs.reduce((a, b) => a + b, 0) / efs.length : null;
      const alg = efs.some(v => v < 7);
      let estado: string;
      if (nf === null)          estado = '-';
      else if (nf >= 7 && !alg) estado = 'Aprobado';
      else if (nf >= 7)         estado = 'Desap. por Tema';
      else                      estado = 'Desaprobado';
      return { nombre: esp.nombreMateria, evals, nf, estado };
    });

    const nTxt  = (v: number|null) => v !== null ? String(v) : '-';
    const nfTxt = (v: number|null) => v !== null ? v.toFixed(2) : '-';
    const estColor = (e: string): [number,number,number] =>
      e === 'Aprobado' ? VERDE : e === 'Desaprobado' ? ROJO : e === 'Desap. por Tema' ? NARANJA : GRIS;

    // ── Anchos de columnas ────────────────────────────────────────────────────
    // materia(55) + 24×sub(6) + NF(16) + Estado(37) = 252... agrando materia
    // materia(67) + 24×6(144) + NF(18) + Estado(48) = 277 ✓
    const W_MAT = 67;
    const W_SUB = 6;    // N / R1 / R2  (24 cols × 6mm = 144mm)
    const W_NF  = 18;
    const W_EST = CW - W_MAT - 24 * W_SUB - W_NF; // 48mm

    const titulo    = 'Calificaciones';
    const subtitulo = `${data.apellido}, ${data.nombre}  |  Curso: ${data.codigoCurso}  |  Ciclo ${data.anioLectivo}`;

    // ── Encabezado ────────────────────────────────────────────────────────────
    let y = drawPageHeader(doc, titulo, subtitulo, logo);
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(`Alumno: ${data.apellido}, ${data.nombre}`, LEFT, y + 4);
    doc.text(`Curso: ${data.codigoCurso}  |  Ciclo lectivo: ${data.anioLectivo}`, LEFT, y + 9);
    doc.text(`Emitido: ${hoy()}`, pageW - RIGHT, y + 4, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    y += 14;

    // ── Cabecera de grupo (fila 1 del header) dibujada a mano ────────────────
    // jsPDF-autotable no soporta colspan, así que dibujo la fila de agrupación
    // manualmente antes de la tabla principal.
    const GRP_H = 6; // altura de la fila de grupo
    const GRP_Y = y;

    // Fondo azul para toda la franja
    doc.setFillColor(...HEADER_BG);
    doc.rect(LEFT, GRP_Y, CW, GRP_H, 'F');

    // "Espacio curricular" centrado en su columna
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(255, 255, 255);
    doc.text('Espacio curricular', LEFT + W_MAT / 2, GRP_Y + 4.2, { align: 'center' });

    // Grupos de evaluaciones (Eval 1 ... Eval 8), cada uno abarca 3 subcols
    const EVAL_LABELS = ['Evaluaciones 1 a 4', 'Evaluaciones 5 a 8'];
    // Línea divisoria entre cuatrimestres
    const q1X = LEFT + W_MAT + 12 * W_SUB;
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.6);
    doc.line(q1X, GRP_Y, q1X, GRP_Y + GRP_H);

    doc.setFontSize(6.5);
    doc.text(EVAL_LABELS[0], LEFT + W_MAT + (12 * W_SUB) / 2, GRP_Y + 4.2, { align: 'center' });
    doc.text(EVAL_LABELS[1], q1X + (12 * W_SUB) / 2, GRP_Y + 4.2, { align: 'center' });

    // "NF" y "Estado" en el resto
    const nfX  = LEFT + W_MAT + 24 * W_SUB;
    const estX = nfX + W_NF;
    doc.setFontSize(6);
    doc.text('Nota', nfX + W_NF / 2,GRP_Y + 4.2, { align: 'center' });
    doc.text('Estado', estX + W_EST / 2, GRP_Y + 4.2, { align: 'center' });

    y += GRP_H;

    // ── Tabla principal (fila 2: subencabezados + body) ───────────────────────
    // Header: col 0 = espacio, cols 1–24 = subnotas por eval, col 25 = NF, col 26 = Estado
    const headSub: string[] = [''];
    for (let e = 0; e < 8; e++) {
      headSub.push(`E${e + 1}\nN`, `E${e + 1}\nR1`, `E${e + 1}\nR2`);
    }
    headSub.push('', ''); // NF y Estado (ya mostrados arriba)

    const body: string[][] = filasPdf.map(fila => {
      const row: string[] = [fila.nombre];
      for (let e = 0; e < 8; e++) {
        row.push(nTxt(fila.evals[e].n), nTxt(fila.evals[e].r1), nTxt(fila.evals[e].r2));
      }
      row.push(nfTxt(fila.nf), fila.estado);
      return row;
    });

    // columnStyles: col 0 = materia, 1-24 = subcols, 25 = NF, 26 = estado
    const colStyles: Record<number, object> = {
      0:  { cellWidth: W_MAT },
      25: { cellWidth: W_NF,  halign: 'center' },
      26: { cellWidth: W_EST, halign: 'center' },
    };
    for (let i = 1; i <= 24; i++) {
      colStyles[i] = { cellWidth: W_SUB, halign: 'center', cellPadding: { top: 1, bottom: 1, left: 0, right: 0 } };
    }

    autoTable(doc, {
      startY: y,
      head:   [headSub],
      body,
      margin: { left: LEFT, right: RIGHT, top: HEADER_H + 4 },
      headStyles: {
        fillColor:   [235, 241, 251],
        textColor:   HEADER_BG,
        fontStyle:   'bold',
        fontSize:    5.5,
        cellPadding: { top: 2, bottom: 2, left: 1, right: 1 },
        lineColor:   [200, 215, 235],
        lineWidth:   0.2,
      },
      bodyStyles: {
        fontSize:    7,
        cellPadding: { top: 2.5, bottom: 2.5, left: 1, right: 1 },
        lineColor:   [220, 228, 238],
        lineWidth:   0.2,
      },
      alternateRowStyles: { fillColor: [247, 250, 255] },
      columnStyles: colStyles,
      didDrawCell: (hookData) => {
        const col = hookData.column.index;
        const { x, y, height } = hookData.cell;
        // Borde izquierdo en el inicio de cada grupo de eval (columna N)
        // col 1 = E1-N, 4 = E2-N, 7 = E3-N, 10 = E4-N, 13 = E5-N, 16 = E6-N, 19 = E7-N, 22 = E8-N
        if (col >= 1 && col <= 24 && (col - 1) % 3 === 0) {
          const isMid = col === 13; // separador mayor entre bloques 1-4 y 5-8
          doc.setDrawColor(isMid ? 40 : 110, isMid ? 40 : 120, isMid ? 40 : 135);
          doc.setLineWidth(isMid ? 0.8 : 0.45);
          doc.line(x, y, x, y + height);
        }
        // Borde izquierdo de NF
        if (col === 25) {
          doc.setDrawColor(60, 70, 80);
          doc.setLineWidth(0.7);
          doc.line(x, y, x, y + height);
        }
      },
      didDrawPage: (hookData) => {
        if (hookData.pageNumber > 1) {
          drawPageHeader(doc, titulo, subtitulo, logo);
          // Redibujar franja de grupos en páginas siguientes
          const gy = HEADER_H + 2;
          doc.setFillColor(...HEADER_BG);
          doc.rect(LEFT, gy, CW, GRP_H, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6);
          doc.setTextColor(255, 255, 255);
          doc.text('Espacio curricular', LEFT + W_MAT / 2, gy + 4.2, { align: 'center' });
          doc.setFontSize(6.5);
          doc.text(EVAL_LABELS[0], LEFT + W_MAT + (12 * W_SUB) / 2, gy + 4.2, { align: 'center' });
          doc.text(EVAL_LABELS[1], q1X + (12 * W_SUB) / 2, gy + 4.2, { align: 'center' });
          doc.setFontSize(6);
          doc.text('Nota', nfX + W_NF / 2,gy + 4.2, { align: 'center' });
          doc.text('Estado', estX + W_EST / 2, gy + 4.2, { align: 'center' });
          doc.setDrawColor(255, 255, 255);
          doc.setLineWidth(0.6);
          doc.line(q1X, gy, q1X, gy + GRP_H);
          doc.setTextColor(0, 0, 0);
          doc.setFont('helvetica', 'normal');
        }
      },
      didParseCell: (hookData) => {
        if (hookData.section === 'head') {
          // Sub-encabezados N/R1/R2: segundo bloque de 4 evals con tono más oscuro
          const col = hookData.column.index;
          if (col >= 13 && col <= 24) {
            hookData.cell.styles.fillColor = [218, 230, 248];
          }
          return;
        }
        if (hookData.section !== 'body') return;
        const fila = filasPdf[hookData.row.index];
        if (!fila) return;
        const col = hookData.column.index;

        if (col === 25) {
          if (fila.nf !== null) {
            hookData.cell.styles.textColor = fila.nf >= 7 ? VERDE : ROJO;
            hookData.cell.styles.fontStyle = 'bold';
          } else {
            hookData.cell.styles.textColor = [190, 200, 210];
          }
          return;
        }

        if (col === 26) {
          hookData.cell.styles.textColor = estColor(fila.estado);
          hookData.cell.styles.fontStyle = fila.estado !== '–' ? 'bold' : 'normal';
          return;
        }

        if (col >= 1 && col <= 24) {
          const subIdx  = col - 1;
          const evalIdx = Math.floor(subIdx / 3);
          const subKind = subIdx % 3;
          const ev      = fila.evals[evalIdx];
          const valor   = subKind === 0 ? ev.n : subKind === 1 ? ev.r1 : ev.r2;

          if (valor === null) {
            hookData.cell.styles.textColor = [210, 218, 228];
            return;
          }

          if (ev.ef !== null && valor === ev.ef) {
            if (ev.ef >= 7) {
              hookData.cell.styles.fillColor = [220, 235, 255];
              hookData.cell.styles.textColor = [21, 101, 192];
            } else {
              hookData.cell.styles.fillColor = [255, 224, 224];
              hookData.cell.styles.textColor = [198, 40, 40];
            }
            hookData.cell.styles.fontStyle = 'bold';
          } else {
            hookData.cell.styles.textColor = [165, 178, 190];
            hookData.cell.styles.fontStyle = 'normal';
          }
        }
      },
    });

    // ── Cards resumen + leyenda ───────────────────────────────────────────────
    const pdfDoc = doc as PdfWithAutoTable;
    const afterTable = (pdfDoc.lastAutoTable?.finalY ?? y) + 8;

    const aprob = filasPdf.filter(f => f.estado === 'Aprobado').length;
    const desap = filasPdf.filter(f => f.estado === 'Desaprobado').length;
    const tema  = filasPdf.filter(f => f.estado === 'Desap. por Tema').length;

    const needPage = afterTable + 22 > pageH - 14;
    const cy = needPage
      ? (doc.addPage(), drawPageHeader(doc, titulo, subtitulo, logo), HEADER_H + 6)
      : afterTable;

    const cardW = (CW - 4) / 3;
    ([
      { label: 'Espacios curriculares aprobados',         valor: aprob, color: VERDE   },
      { label: 'Espacios curriculares desaprobados',      valor: desap, color: ROJO    },
      { label: 'Espacios curriculares desap. por tema',   valor: tema,  color: NARANJA },
    ] as { label: string; valor: number; color: [number,number,number] }[]).forEach((card, i) => {
      const cx = LEFT + i * (cardW + 2);
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(248, 249, 252);
      doc.roundedRect(cx, cy, cardW, 16, 2, 2, 'FD');
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text(card.label, cx + cardW / 2, cy + 6, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(...card.color);
      doc.text(String(card.valor), cx + cardW / 2, cy + 13, { align: 'center' });
      doc.setFont('helvetica', 'normal');
    });

    // Leyenda al pie
    const lyY = pageH - 8;
    doc.setFontSize(6.5);
    const leyItems: [string, [number,number,number]][] = [
      ['Celda azul: nota efectiva (la que cuenta)',  [21, 101, 192]],
      ['Aprobado (NF >= 7)',                         VERDE],
      ['Desap. por Tema (NF >= 7, alguna ef < 7)',   NARANJA],
      ['Desaprobado (NF < 7)',                       ROJO],
    ];
    let lx = LEFT;
    leyItems.forEach(([label, color]) => {
      doc.setFillColor(...color);
      doc.circle(lx + 1.5, lyY - 0.5, 1.5, 'F');
      doc.setTextColor(80, 80, 80);
      doc.text(label, lx + 4.5, lyY);
      lx += 65;
    });

    // ── Página 2: Asistencias ─────────────────────────────────────────────────
    doc.addPage();
    const p2titulo = 'Asistencia del Alumno';
    let p2y = drawPageHeader(doc, p2titulo, subtitulo, logo);

    const a = data.asistencia;
    const tea = a?.teaGeneral ?? false;

    const inasColor = (f: number, t: boolean): [number,number,number] => {
      if (t || f >= 25) return GRIS;
      if (f >= 21)      return ROJO;
      if (f >= 15)      return NARANJA;
      if (f >= 10)      return AMARILLO;
      return VERDE;
    };
    const condLabel = (f: number, t: boolean): string => {
      if (t || f >= 25) return 'TEA';
      if (f >= 21)      return 'Condicional';
      if (f >= 15)      return 'En riesgo';
      if (f >= 10)      return 'En riesgo leve';
      return 'Regular';
    };

    // ── Fila 1: 4 cards grandes ──────────────────────────────────────────────
    const card4W = (CW - 6) / 4;
    type CardG = { label: string | string[]; valor: string | number; color: [number,number,number] };
    p2y += 4;
    const row1: CardG[] = [
      { label: 'Presencias',           valor: a?.presencias    ?? 0,                                      color: [0,0,0]  },
      { label: 'Ausencias',            valor: a?.ausenciasPuras ?? 0,                                     color: [0,0,0]  },
      { label: ['Ausencia no','computable'], valor: a?.ancCount ?? 0,                                     color: [0,0,0]  },
      { label: 'Inasistencias',        valor: tea ? 'TEA' : (a?.inasistencias ?? 0), color: inasColor(a?.inasistencias ?? 0, tea) },
    ];
    row1.forEach((c, i) => {
      const cx = LEFT + i * (card4W + 2);
      doc.setDrawColor(200, 200, 200); doc.setFillColor(248, 249, 252);
      doc.roundedRect(cx, p2y, card4W, 18, 2, 2, 'FD');
      doc.setFontSize(6.5); doc.setTextColor(100, 100, 100);
      if (Array.isArray(c.label)) {
        doc.text(c.label[0], cx + card4W / 2, p2y + 5,   { align: 'center' });
        doc.text(c.label[1], cx + card4W / 2, p2y + 8.5, { align: 'center' });
      } else {
        doc.text(c.label, cx + card4W / 2, p2y + 6.5, { align: 'center' });
      }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
      doc.setTextColor(...c.color);
      doc.text(String(c.valor), cx + card4W / 2, p2y + 15, { align: 'center' });
      doc.setFont('helvetica', 'normal');
    });
    p2y += 22;

    // ── Fila 2: 4 cards chicas — llegadas tarde ──────────────────────────────
    const card4Cw = (CW - 6) / 4;
    type CardCh = { label: string | string[]; valor: number };
    const drawCardCh = (c: CardCh, i: number, yBase: number) => {
      const cx = LEFT + i * (card4Cw + 2);
      doc.setDrawColor(200, 200, 200); doc.setFillColor(248, 249, 252);
      doc.roundedRect(cx, yBase, card4Cw, 16, 2, 2, 'FD');
      doc.setFontSize(6.5); doc.setTextColor(100, 100, 100);
      if (Array.isArray(c.label)) {
        doc.text(c.label[0], cx + card4Cw / 2, yBase + 4.5, { align: 'center' });
        doc.text(c.label[1], cx + card4Cw / 2, yBase + 8,   { align: 'center' });
      } else {
        doc.text(c.label, cx + card4Cw / 2, yBase + 6, { align: 'center' });
      }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(0, 0, 0);
      doc.text(String(c.valor), cx + card4Cw / 2, yBase + 13.5, { align: 'center' });
      doc.setFont('helvetica', 'normal');
    };
    const row2: CardCh[] = [
      { label: ['Ausencia por','llegada tarde'], valor: a?.ausentePorLLT      ?? 0 },
      { label: 'LLT',                            valor: a?.llegadasTarde       ?? 0 },
      { label: 'LLTE',                           valor: 0 },
      { label: 'LLTC',                           valor: 0 },
    ];
    row2.forEach((c, i) => drawCardCh(c, i, p2y));
    p2y += 20;

    // ── Fila 3: 4 cards chicas — retiros ─────────────────────────────────────
    const row3: CardCh[] = [
      { label: ['Ausencia por','retiro anticipado'], valor: a?.ausentePorRA                 ?? 0 },
      { label: 'RE',                                 valor: a?.retirosExpress               ?? 0 },
      { label: 'RA',                                 valor: a?.retirosAnticipados           ?? 0 },
      { label: 'RAE',                                valor: a?.retirosAnticipadosExtendidos ?? 0 },
    ];
    row3.forEach((c, i) => drawCardCh(c, i, p2y));
    p2y += 20;

    // ── Card Condición ────────────────────────────────────────────────────────
    const faltas = a?.inasistencias ?? 0;
    doc.setDrawColor(200, 200, 200); doc.setFillColor(248, 249, 252);
    doc.roundedRect(LEFT, p2y, CW, 16, 2, 2, 'FD');
    doc.setFontSize(7); doc.setTextColor(100, 100, 100);
    doc.text('Condición', LEFT + CW / 2, p2y + 6, { align: 'center' });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.setTextColor(...inasColor(faltas, tea));
    doc.text(condLabel(faltas, tea), LEFT + CW / 2, p2y + 13, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    p2y += 6;

    // Leyenda condición al pie
    const p2lyY = pageH - 8;
    doc.setFontSize(6.5);
    const p2Ley: [string, [number,number,number]][] = [
      ['Verde: Regular (0–9 faltas)',        VERDE],
      ['Amarillo: En riesgo leve (10–14)',   AMARILLO],
      ['Naranja: En riesgo (15–20)',          NARANJA],
      ['Rojo: Condicional (21–24)',           ROJO],
      ['Gris: TEA (25+ faltas)',              GRIS],
    ];
    let p2lx = LEFT;
    p2Ley.forEach(([label, color]) => {
      doc.setFillColor(...color);
      doc.circle(p2lx + 1.5, p2lyY - 0.5, 1.5, 'F');
      doc.setTextColor(80, 80, 80);
      doc.text(label, p2lx + 4.5, p2lyY);
      p2lx += 52;
    });

    doc.save(
      `libreta-${data.apellido}-${data.nombre}-${data.codigoCurso}-${data.anioLectivo}.pdf`
        .replace(/\s+/g, '-').replace(/,/g, '')
    );
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
}
