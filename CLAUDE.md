# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Dev server at localhost:4200
npm run build      # Production build → dist/tesis-gestor-web/
npm run watch      # Watch mode with dev config
npm test           # Unit tests with Karma/Jasmine
```

To run a single test file, use:
```bash
ng test --include='**/path/to/file.spec.ts'
```

## Architecture

**Angular 19 standalone components** — no NgModules. All components declare their own `imports` array.

### Feature Structure

```
src/app/
├── core/
│   ├── models/         # Shared data models/interfaces
│   └── services/       # App-wide services (e.g., SearchBusService)
├── features/           # Feature modules (each has components/, models/, services/)
│   ├── asistencia-rapida/          # Quick attendance registration
│   ├── asistencia-general-manual/  # Manual per-course attendance
│   ├── credenciales-qr/            # QR credential generation
│   └── qr-scanner/                 # QR code scanner
├── layouts/            # Shared layout (navbar, sidebar, layout wrapper)
└── deploy-test/        # Weather component for deployment verification
```

### Routing

All feature routes are children of `LayoutComponent`:
- `/` → `HomeComponent`
- `/asistencia-rapida` → `AsistenciaRapidaComponent`
- `/asistencia-manual-curso` → `AsistenciaGeneralManualComponent`

### API & Environments

- **Production** (`environment.ts`): `https://tesis-gestion-api-5go5.onrender.com`
- **Development**: `https://localhost:7146` (.NET Core backend)

Services call API endpoints directly. The `apiUrl` from `environment` should be used rather than hardcoding localhost URLs in new services.

Key API patterns:
- `GET /api/asistencia-rapida/tipos` — attendance type catalog
- `GET /api/cursos` / `GET /api/cursos/{id}/estudiantes` — course + student data
- `POST /api/asistencia/lote` — batch attendance registration

### State & Reactivity

No global state library (no NgRx). State is managed via:
- **RxJS BehaviorSubject** in services for shared state (e.g., `SearchBusService` for cross-component search queries)
- **Reactive Forms** (`FormControl`, `FormGroup`) for component-level form state
- RxJS operators commonly used: `debounceTime`, `distinctUntilChanged`, `switchMap`, `forkJoin`

### UI

- **Angular Material** for all UI components (tables, dialogs, forms, snackbars, datepicker, icons)
- **@angular/cdk/layout** `BreakpointObserver` for responsive desktop/mobile behavior
- Layout: fixed sidebar on desktop, hamburger overlay on mobile

### TypeScript Config

Strict mode is enabled: `strict: true`, `strictTemplates: true`, `noImplicitReturns: true`. All new code must satisfy these constraints.

### Attendance Domain Notes

Attendance types `RE` and `RAE` are internal/calculated and must be excluded from UI selections. Types `LLT`, `LLTE`, `LLTC`, and `RA` require a time (`hora`) field when registering. Shifts are either `MANANA` or `TARDE`.
