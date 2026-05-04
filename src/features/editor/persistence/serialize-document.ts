import type { EditorDocument } from "@/entities/editor/document-schema";

import { cloneDocument } from "../store/document-mutations";

import { pruneFabricJsonForPersistence } from "./fabric-json-prune";

/**
 * Elimina `undefined`, funciones y referencias no serializables vía round-trip JSON.
 * Útil antes de persistir o para fingerprints estables del documento canónico.
 */
export function sanitizeSerializableDocument(doc: EditorDocument): EditorDocument {
  return JSON.parse(JSON.stringify(cloneDocument(doc))) as EditorDocument;
}

export function fingerprintSerializedDocument(doc: EditorDocument): string {
  return JSON.stringify(sanitizeSerializableDocument(doc));
}

/** Combina el documento canónico con un snapshot Fabric recortado para persistencia. */
export function mergePresentWithFabricSnapshot(
  present: EditorDocument,
  fabricJson: unknown | null,
): EditorDocument {
  if (!fabricJson || typeof fabricJson !== "object" || Array.isArray(fabricJson)) {
    return cloneDocument(present);
  }
  const pruned = pruneFabricJsonForPersistence(fabricJson as Record<string, unknown>);
  return {
    ...cloneDocument(present),
    fabricSnapshot: pruned,
  };
}

export function fingerprintPersistablePayload(
  present: EditorDocument,
  fabricJson: unknown | null,
): string {
  return JSON.stringify(
    sanitizeSerializableDocument(mergePresentWithFabricSnapshot(present, fabricJson)),
  );
}
