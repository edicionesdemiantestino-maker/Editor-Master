/**
 * Checklist de integración Supabase + Auth para producción (QA manual o release).
 * No ejecuta pruebas automáticas: sirve como contrato de lo que debe verificarse antes de ship.
 */
export const SUPABASE_PRODUCTION_READINESS = [
  "Variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY (o PUBLISHABLE), NEXT_PUBLIC_SITE_URL en el host (p. ej. Vercel).",
  "Supabase Dashboard → Auth → URL: Site URL = NEXT_PUBLIC_SITE_URL de producción; Redirect URLs incluyen https://<dominio>/** y http://localhost:3000/**.",
  "Migraciones aplicadas: `projects` con columnas `name`, `updated_at` (ver `supabase/migrations/`).",
  "Registro: usuario nuevo puede crear cuenta (y confirmar email si está habilitado).",
  "Login: credenciales válidas redirigen al inicio o a `next` interno seguro.",
  "Logout: sesión cerrada y cookies actualizadas (middleware + server client).",
  "Crear proyecto: fila en public.projects con user_id = auth.uid() (ver en Table Editor).",
  "Listar proyectos: solo aparecen filas del usuario (RLS SELECT).",
  "Abrir /editor/<uuid ajeno>: 403/redirect sin datos (RLS + guard en servidor).",
  "Guardar proyecto: Server Action persiste sin poder forzar user_id ajeno (RLS UPDATE).",
  "Autosave: tras editar, recarga la página y verificá que el estado coincide (documento + snapshot Fabric opcional).",
  "Nunca exponer service_role en NEXT_PUBLIC_* ni en el cliente.",
] as const;
