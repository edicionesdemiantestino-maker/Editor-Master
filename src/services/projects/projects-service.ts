import type { SupabaseClient } from "@supabase/supabase-js";

import type { EditorDocument } from "@/entities/editor/document-schema";
import { createEmptyDocument } from "@/entities/editor/defaults";
import {
  cloneDocument,
  hydrateEditorDocument,
} from "@/features/editor/store/document-mutations";

import type { ProjectRow, ProjectSummary } from "./project.types";

/**
 * Acceso a `public.projects` bajo RLS: SELECT/INSERT/UPDATE/DELETE solo filas con `user_id = auth.uid()`
 * (políticas en `supabase/migrations/20260504120000_create_projects.sql`).
 */

export async function listProjectsForUser(
  supabase: SupabaseClient,
): Promise<ProjectSummary[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ProjectSummary[];
}

export async function getProjectById(
  supabase: SupabaseClient,
  projectId: string,
): Promise<ProjectRow | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, user_id, name, data, created_at, updated_at")
    .eq("id", projectId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as Omit<ProjectRow, "data"> & { data: unknown };
  const doc = hydrateEditorDocument(row.data, row.id);
  return {
    id: row.id,
    user_id: row.user_id,
    name: typeof row.name === "string" ? row.name : doc.meta.title,
    data: doc,
    created_at: row.created_at,
    updated_at:
      typeof row.updated_at === "string" ? row.updated_at : row.created_at,
  };
}

/**
 * Crea proyecto para el usuario de la sesión actual (`getUser()`), sin aceptar `user_id` del cliente.
 * RLS exige `with check (auth.uid() = user_id)` en INSERT.
 */
export async function createProject(supabase: SupabaseClient): Promise<string> {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    throw new Error("Sesión requerida para crear proyecto.");
  }
  const id = crypto.randomUUID();
  const doc = createEmptyDocument(id);

  const { error } = await supabase.from("projects").insert({
    id,
    user_id: user.id,
    name: doc.meta.title,
    data: doc,
  });

  if (error) throw error;
  return id;
}

export async function saveProjectDocument(
  supabase: SupabaseClient,
  projectId: string,
  document: EditorDocument,
): Promise<void> {
  const payload = cloneDocument({
    ...document,
    projectId,
    meta: {
      ...document.meta,
      updatedAt: new Date().toISOString(),
    },
  });

  const { error } = await supabase
    .from("projects")
    .update({
      data: payload,
      name: payload.meta.title,
    })
    .eq("id", projectId);

  if (error) throw error;
}
