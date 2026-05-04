# Supabase — migraciones y entorno

Este directorio contiene SQL versionado para Postgres (tablas, RLS, etc.).

## Variables necesarias (Next.js)

| Variable | Rol |
|----------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto (Auth + PostgREST). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` o `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave pública para cliente/browser y `createServerClient`. |
| `NEXT_PUBLIC_SITE_URL` | Origen canónico de la app (`https://…`) para enlaces de email/OAuth y redirects seguros. |

Lectura centralizada en código: `src/lib/supabase/env.ts` y re-export `src/lib/env/public-app-env.ts`.

## Dashboard (Auth)

- **Authentication → URL configuration → Site URL**: debe coincidir con `NEXT_PUBLIC_SITE_URL` en producción.
- **Redirect URLs**: agregá tu dominio de producción, previews (`https://*.vercel.app/**` si aplica) y `http://localhost:3000/**` para desarrollo.

## Vercel

Definí las mismas `NEXT_PUBLIC_*` en el proyecto de Vercel (Production + Preview). Ver **`DEPLOYMENT.md`** en la raíz del repo para el flujo completo de deploy.

---

## Aplicar en el proyecto cloud (commits / `db push`)

1. Instalá la CLI: `npm i -g supabase` o usá `npx supabase` sin instalación global.
2. Iniciá sesión: `npx supabase login`.
3. Enlazá el repo local al proyecto: `npx supabase link --project-ref <TU_PROJECT_REF>`  
   (`project-ref` está en **Project Settings → General** del dashboard).  
   Si tu red **no tiene IPv6** o ves el error *Pooler URL is not configured* / *IPv6 is not supported*, volvé a enlazar **con la contraseña de Postgres** (misma pantalla *Database* del dashboard):  
   `npx supabase link --project-ref <TU_PROJECT_REF> -p "<POSTGRES_PASSWORD>" --yes`  
   Así la CLI guarda la URL del **pooler IPv4** y `db push` puede conectarse.
4. Subí el esquema pendiente: `npx supabase db push --yes`.

Eso aplica las migraciones que aún no estén registradas en `schema_migrations` del proyecto remoto (equivalente operativo a “aplicar los commits” de SQL).

**Proyecto actual en este repo:** **Master Editor** — `bjjctudxipelerbmeksi` (región `us-west-2`). Ya está hecho `link` sin password; para aplicar migraciones desde entornos sin IPv6 hace falta el `link` con `-p` como arriba (o ejecutar el SQL a mano en el *SQL Editor* del dashboard).

### Crear un proyecto nuevo desde la terminal

Si todavía no tenés proyecto (y tu cuenta no alcanzó el límite del plan gratuito):

```bash
npx supabase orgs list
npx supabase projects create editor-maestro --org-id <ORG_ID> --db-password "<contraseña_segura>" --region us-east-1
```

Después enlazá y empujá: `npx supabase link --project-ref <REF_DEL_OUTPUT>` y `npx supabase db push`.

**Plan gratuito:** Supabase suele limitar a **2 proyectos activos** por usuario administrador. Si `projects create` falla con ese mensaje, pausá o borrá un proyecto en el [dashboard](https://supabase.com/dashboard), o pasá a plan de pago, y volvé a ejecutar el `create`.

## Estado actual

- `migrations/20260504120000_create_projects.sql` — tabla `public.projects` con políticas RLS (SELECT/INSERT/UPDATE/DELETE solo `user_id = auth.uid()`).
- `migrations/20260504210000_projects_name_updated_at.sql` — columnas `name`, `updated_at` y trigger de actualización.

Checklist de QA antes de producción (también en código): `src/lib/supabase/production-checklist.ts` y checklist en comentarios de `src/app/actions/project-persistence.ts`.

El rate limiting y la concurrencia de APIs viven en **Upstash Redis** (variables `UPSTASH_REDIS_*` en el runtime de Next.js), no en migraciones Postgres.

## Desarrollo local opcional

Si querés levantar Postgres embebido: `npx supabase start` (requiere Docker). Para solo empujar a cloud, alcanza con `db push` tras `link`.
