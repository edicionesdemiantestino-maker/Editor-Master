import type { EditorDocument } from "@/entities/editor/document-schema";

/** Fila `public.projects` (JSON canónico del editor). */
export type ProjectRow = {
  id: string;
  user_id: string;
  name: string;
  data: EditorDocument;
  created_at: string;
  updated_at: string;
};

export type ProjectSummary = Pick<
  ProjectRow,
  "id" | "name" | "created_at" | "updated_at"
>;
