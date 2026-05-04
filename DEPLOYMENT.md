# Despliegue (Vercel + Supabase)

## Variables de entorno (Next.js / Vercel)

Definilas en **Vercel → Project → Settings → Environment Variables** para **Production** y **Preview** (y opcionalmente Development si usás integración con Vercel CLI).

| Variable | Dónde se usa | Notas |
|----------|----------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Cliente y servidor | URL del proyecto Supabase (pública). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` o `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Cliente y servidor | Clave anónima / publishable (pública). |
| `NEXT_PUBLIC_SITE_URL` | Auth, redirects, magic links | Origen canónico **con** `https://` y **sin** barra final. Ej.: `https://tu-dominio.com`. |
| `VERCEL_URL` | (automática en Vercel) | La app ya la usa vía `getTrustedRequestOrigin` para previews. No la definas a mano salvo casos excepcionales. |

**Nunca** subas `SUPABASE_SERVICE_ROLE_KEY` como `NEXT_PUBLIC_*` ni la importes en componentes cliente.

## Supabase Dashboard

1. **Auth → URL configuration**
   - **Site URL**: igual a `NEXT_PUBLIC_SITE_URL` de producción.
   - **Redirect URLs**: incluí `https://<tu-dominio>/**`, previews `https://*.vercel.app/**` si usás previews, y local `http://localhost:3000/**`.
2. **SQL / migraciones**: aplicá las migraciones del repo (`supabase/migrations/`) con `supabase db push` o el SQL Editor. Sin columnas `name` / `updated_at` en `projects`, el listado y el guardado fallarán.

## Deploy en Vercel

1. Conectá el repo a Vercel (import Git).
2. Configurá las variables de entorno anteriores.
3. Build command por defecto: `next build`; output: Next.js.
4. Tras el primer deploy, probá login, crear proyecto, abrir editor, autosave y recarga (checklist en `src/lib/supabase/production-checklist.ts` y comentario en `src/app/actions/project-persistence.ts`). Creación de proyecto: server action `src/app/actions/projects.ts` (`createProjectAction`).

## Local

Copiá `.env.example` a `.env.local` si existe en el repo; si no, creá `.env.local` con las mismas claves que arriba. Reiniciá `next dev` tras cambiar env.

## Decisiones de persistencia

- **Fuente de verdad**: modelo `EditorDocument` en Zustand + reconcile hacia Fabric.
- **`fabricSnapshot`**: se guarda además como `canvas.toJSON()` recortado (sin data URLs gigantes) para interoperabilidad; la hidratación principal sigue siendo el documento canónico.
- **Cargar Fabric desde JSON**: helper `loadFabricJsonOntoCanvas` en `src/features/editor/persistence/load-fabric-json-onto-canvas.ts` para flujos de importación sin reemplazar el reconcile del editor principal.
