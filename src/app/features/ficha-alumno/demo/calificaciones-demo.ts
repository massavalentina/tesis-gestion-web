// =====================================================================
// Datos de muestreo HARDCODEADOS para la demo de calificaciones.
// No tocan base de datos ni backend: se importan directo en el front.
//
// Reglas de negocio:
//   - Nota efectiva = max(N, R1, R2)
//   - Si ef >= 7 el tema está aprobado (aunque N haya sido < 7)
//   - "Desaprobado por Tema" a nivel EC: notaFinal >= 7 PERO
//     alguna nota efectiva < 7 (falló examen Y todos sus recuperatorios)
//   - null = evaluación todavía no rendida (aparece como "–")
// =====================================================================

export interface NotaEvaluacion {
  n: number;
  r1?: number | null;
  r2?: number | null;
}

export type Evaluacion = NotaEvaluacion | null;

export interface EspacioCalificacion {
  espacio: string;
  evaluaciones: Evaluacion[];
}

export interface ItemAsistencia {
  etiqueta: string;
  valor: number;
}

export interface AlumnoBoletin {
  nombre: string;
  dni: string;
  curso: string;
  division: string;
  calificaciones: EspacioCalificacion[];
  asistencias: ItemAsistencia[];
}

export type EstadoCondicion =
  | 'Aprobado'
  | 'Desaprobado'
  | 'Desaprobado por Tema'
  | 'Sin calificaciones';

export function notaEfectiva(e: NotaEvaluacion): number {
  return Math.max(e.n, e.r1 ?? -1, e.r2 ?? -1);
}

export function calcularCondicion(
  evaluaciones: Evaluacion[],
  hasta: number = evaluaciones.length
): { notaFinal: number | null; estado: EstadoCondicion } {
  const cargadas = evaluaciones.slice(0, hasta).filter((e): e is NotaEvaluacion => e !== null);
  if (cargadas.length === 0) return { notaFinal: null, estado: 'Sin calificaciones' };

  const efectivas = cargadas.map(notaEfectiva);
  const notaFinal = efectivas.reduce((a, b) => a + b, 0) / efectivas.length;
  const algunaFalloTema = efectivas.some(v => v < 7);

  let estado: EstadoCondicion;
  if (notaFinal >= 7 && !algunaFalloTema) estado = 'Aprobado';
  else if (notaFinal >= 7 && algunaFalloTema) estado = 'Desaprobado por Tema';
  else estado = 'Desaprobado';

  return { notaFinal: +notaFinal.toFixed(2), estado };
}

// =====================================================================
// ACOSTA, MIA — DNI 50000012 — las 8 evaluaciones completas
// =====================================================================
const ACOSTA_MIA: AlumnoBoletin = {
  nombre: 'Acosta, Mia',
  dni: '50000012',
  curso: '1° A',
  division: '1A-2026',
  calificaciones: [
    // Aprobada: todas ef >= 7
    { espacio: 'Lengua y Literatura',
      evaluaciones: [{n:8},{n:7},{n:9},{n:7},{n:8},{n:9},{n:7},{n:8}] },

    // Desaprobada por Tema: E3 → N=4, R1=5, R2=6 → ef=6 < 7 (agotó recuperatorios)
    //   NF = (9+8+6+10+9+8+9+8)/8 = 8.38 >= 7
    { espacio: 'Matemática',
      evaluaciones: [{n:9},{n:8},{n:4,r1:5,r2:6},{n:10},{n:9},{n:8},{n:9},{n:8}] },

    // Desaprobada: NF < 7
    { espacio: 'Biología',
      evaluaciones: [{n:5,r1:6},{n:4,r1:5,r2:6},{n:6},{n:7},{n:5,r1:6},{n:6},{n:5},{n:6}] },

    // Aprobada con recuperatorio: E2 N=6→R1=8 (ef=8 ≥ 7, tema aprobado)
    { espacio: 'Geografía',
      evaluaciones: [{n:8},{n:6,r1:8},{n:7},{n:9},{n:7},{n:8},{n:6,r1:7},{n:8}] },

    // Aprobada: todas ef >= 7
    { espacio: 'Historia',
      evaluaciones: [{n:7},{n:8},{n:7},{n:9},{n:7},{n:8},{n:7},{n:9}] },

    // Desaprobada por Tema: E5 → N=4, R1=5, R2=6 → ef=6 < 7
    //   NF = (9+8+9+8+6+9+8+9)/8 = 8.25 >= 7
    { espacio: 'Inglés',
      evaluaciones: [{n:9},{n:8},{n:9},{n:8},{n:4,r1:5,r2:6},{n:9},{n:8},{n:9}] },

    // Aprobada: todas ef >= 7
    { espacio: 'Educación Física',
      evaluaciones: [{n:9},{n:10},{n:9},{n:8},{n:9},{n:10},{n:9},{n:8}] },

    // Desaprobada: NF < 7 (sin recuperatorios que lleguen a 7)
    { espacio: 'Educación Tecnológica',
      evaluaciones: [{n:6},{n:5},{n:6},{n:4,r1:5},{n:6},{n:5},{n:6},{n:5}] },

    // Aprobada: todas ef >= 7
    { espacio: 'Educación Artística',
      evaluaciones: [{n:8},{n:9},{n:7},{n:8},{n:8},{n:7},{n:9},{n:8}] },

    // Desaprobada por Tema: E2 → N=4, R1=5, R2=6 → ef=6 < 7
    //   NF = (8+6+9+8+7+9+8+8)/8 = 7.875 >= 7
    { espacio: 'Ciudadanía y Participación',
      evaluaciones: [{n:8},{n:4,r1:5,r2:6},{n:9},{n:8},{n:7},{n:9},{n:8},{n:8}] },
  ],
  asistencias: [
    { etiqueta: 'Presencias',                     valor: 52 },
    { etiqueta: 'Ausencias',                      valor: 8  },
    { etiqueta: 'Ausencia no computable',          valor: 0  },
    { etiqueta: 'Inasistencias',                  valor: 8  },
    { etiqueta: 'Ausencia por llegada tarde',     valor: 2  },
    { etiqueta: 'LLT',                            valor: 0  },
    { etiqueta: 'LLTE',                           valor: 1  },
    { etiqueta: 'LLTC',                           valor: 0  },
    { etiqueta: 'Ausencia por retiro anticipado', valor: 0  },
    { etiqueta: 'RE',                             valor: 0  },
    { etiqueta: 'RA',                             valor: 0  },
    { etiqueta: 'RAE',                            valor: 0  },
  ],
};

// =====================================================================
// RODRIGUEZ, VALENTINO — DNI 50000005 — 6 instancias tomadas (E7 y E8 null)
// =====================================================================
const RODRIGUEZ_VALENTINO: AlumnoBoletin = {
  nombre: 'Rodriguez, Valentino',
  dni: '50000005',
  curso: '1° A',
  division: '1A-2026',
  calificaciones: [
    // Desaprobada: NF < 7
    { espacio: 'Lengua y Literatura',
      evaluaciones: [{n:6},{n:7},{n:5},{n:6},{n:7},{n:6},null,null] },

    // Desaprobada: todas ef < 7, NF < 7
    { espacio: 'Matemática',
      evaluaciones: [{n:4},{n:5},{n:6},{n:5},{n:4},{n:6},null,null] },

    // Aprobada: todas ef >= 7
    { espacio: 'Biología',
      evaluaciones: [{n:7},{n:8},{n:7},{n:9},{n:7},{n:8},null,null] },

    // Desaprobada: E2 N=4→R1=7 (ef=7 ≥ 7, ese tema pasa) pero NF = 6.17 < 7
    //   Nota: rescató el tema vía R1 pero el promedio general no alcanzó
    { espacio: 'Geografía',
      evaluaciones: [{n:6},{n:4,r1:7},{n:5},{n:6},{n:5,r1:7},{n:6},null,null] },

    // Aprobada: todas ef >= 7
    { espacio: 'Historia',
      evaluaciones: [{n:8},{n:7},{n:9},{n:8},{n:7},{n:8},null,null] },

    // Desaprobada: E3 ef=6 < 7 Y NF < 7
    { espacio: 'Inglés',
      evaluaciones: [{n:5},{n:6},{n:4,r1:5,r2:6},{n:7},{n:5},{n:6},null,null] },

    // Aprobada: todas ef >= 7
    { espacio: 'Educación Física',
      evaluaciones: [{n:9},{n:8},{n:9},{n:10},{n:9},{n:8},null,null] },

    // Desaprobada por Tema: E3 → N=4, R1=5, R2=6 → ef=6 < 7
    //   NF = (8+9+6+8+9+8)/6 = 8 >= 7
    { espacio: 'Educación Tecnológica',
      evaluaciones: [{n:8},{n:9},{n:4,r1:5,r2:6},{n:8},{n:9},{n:8},null,null] },

    // Aprobada: todas ef >= 7
    { espacio: 'Educación Artística',
      evaluaciones: [{n:7},{n:8},{n:7},{n:8},{n:7},{n:8},null,null] },

    // Desaprobada: NF < 7
    { espacio: 'Ciudadanía y Participación',
      evaluaciones: [{n:6},{n:5},{n:6},{n:5},{n:6},{n:5},null,null] },
  ],
  asistencias: [
    { etiqueta: 'Presencias',                     valor: 41 },
    { etiqueta: 'Ausencias',                      valor: 19 },
    { etiqueta: 'Ausencia no computable',          valor: 0  },
    { etiqueta: 'Inasistencias',                  valor: 20 },
    { etiqueta: 'Ausencia por llegada tarde',     valor: 1  },
    { etiqueta: 'LLT',                            valor: 0  },
    { etiqueta: 'LLTE',                           valor: 2  },
    { etiqueta: 'LLTC',                           valor: 0  },
    { etiqueta: 'Ausencia por retiro anticipado', valor: 0  },
    { etiqueta: 'RE',                             valor: 0  },
    { etiqueta: 'RA',                             valor: 0  },
    { etiqueta: 'RAE',                            valor: 0  },
  ],
};

export const ALUMNOS_DEMO: AlumnoBoletin[] = [ACOSTA_MIA, RODRIGUEZ_VALENTINO];
