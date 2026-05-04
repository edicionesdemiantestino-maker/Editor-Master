# Auditoría Editor Maestro — guía para ChatGPT

**Fecha de generación del bundle:** regenerá con `powershell -ExecutionPolicy Bypass -File .\scripts\export-audit-bundle.ps1` desde la raíz del repo.

## Qué archivo subir

| Archivo | Contenido | Uso en ChatGPT |
|--------|-----------|----------------|
| **`AUDIT_BUNDLE.md`** | Código fuente concatenado (`src/**/*.ts(x)`, configs raíz, migraciones SQL) + prompt base embebido | Adjuntar archivo o pegar por partes si supera el límite de contexto |
| **Este archivo** | Contexto y prompt extendido | Pegar primero en el chat; luego adjuntar `AUDIT_BUNDLE.md` |

## Resumen ejecutivo (estado del producto)

- **Stack:** Next.js 16 (App Router), React 19, TypeScript estricto, Fabric.js 7, Zustand, Supabase (SSR + RLS en proyectos), `pdf-lib` (cliente), `sharp` + `pdfkit` (servidor CMYK).
- **Superficies HTTP (API):**
  - `POST /api/inpaint` — Replicate; auth Supabase SSR; límites de body/resolución; rate limit en memoria; concurrencia por usuario; logs estructurados.
  - `GET /api/image-proxy` — allowlist `replicate.delivery`; auth; rate limit + concurrencia.
  - `POST /api/export-print` — PDF CMYK (sharp → CMYK JPEG → pdfkit); auth; validación de raster; límites de píxeles/DPI.
- **Server Actions:** auth (`signIn` / `signUp` / `signOut`), `createProjectAction` (rate limit + mensajes seguros).
- **Exportación cliente:** pipeline con `yieldToMain`, decode opcional en **Web Worker** para data URLs grandes; PDF impresión RGB + JSON; opción PDF CMYK vía API.
- **Canvas:** `objectCaching`, remuestreo de imágenes grandes antes de Fabric, `scheduleFabricRender` en movimiento, calidad 2D en lienzo inferior.
- **Tests:** Vitest (store, validación inpaint, export + mocks), Playwright (E2E export PNG demo).
- **Config:** `next.config.ts` — `allowedDevOrigins`, `serverExternalPackages` (`sharp`, `pdfkit`).

## Limitaciones conocidas (para que el auditor no las “descubra” como P0 falsos)

- Rate limits y concurrencia **en memoria** por instancia (documentado en código); en multi-instancia hace falta Redis/Upstash/etc.
- CMYK: pipeline real con sharp; **perfiles ICC** documentados como siguiente paso (variables de entorno sugeridas en el route).
- Next 16 avisa deprecación de convención `middleware` → `proxy` (seguimiento de framework).

---

## Prompt sugerido (copiar y pegar)

Sos un revisor senior de seguridad, arquitectura, performance y calidad de código (TypeScript / React 19 / Next.js 16 App Router).

Tenés el repositorio **Editor Maestro** en el archivo adjunto **`AUDIT_BUNDLE.md`** (bloques `## FILE: ruta` con el código). Hacé una auditoría **exhaustiva** y respondé en **español**, con tablas donde ayude.

### Áreas obligatorias

1. **Seguridad:** secretos y env; Supabase (sesión, `getUser`, RLS en migraciones); rutas `/api/inpaint`, `/api/image-proxy`, `/api/export-print` (auth, abuso, tamaños, SSRF, filtrado de errores); CSRF implícito en cookies SameSite; XSS en renders React.
2. **Arquitectura:** capas `entities/`, `features/`, `services/`, `app/`; acoplamiento cliente/servidor con `sharp`/`pdfkit` solo en API.
3. **Correctness:** Fabric + Zustand (historial, reconciliación); exportación (RGB vs CMYK, workers, memoria); inpainting/Replicate.
4. **Performance:** main thread, renders Fabric, imágenes grandes, build Next.
5. **DX / Prod:** tests, lint, observabilidad (`logStructuredLine`), despliegue (binarios `sharp` en CI/CD).

### Formato de salida

- Hallazgos priorizados **P0 / P1 / P2** con acción concreta y referencia `FILE: …` (ruta del bundle).
- Riesgos aceptados vs los que requieren remedio.
- Si algo queda fuera del bundle (p. ej. solo en `node_modules`), indicá “no auditable desde el artefacto”.

---

## Cómo volver a generar el bundle

```powershell
cd "D:\Editor Maestro"
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\export-audit-bundle.ps1
```

Salida por defecto: `AUDIT_BUNDLE.md`. Opcional: `-OutputPath ".\mi-bundle.md"`.
