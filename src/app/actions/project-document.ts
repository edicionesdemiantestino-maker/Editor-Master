"use server";

/**
 * @deprecated Prefer `saveProjectAction` desde `./project-persistence`.
 * Se mantiene el alias para imports existentes.
 */
export {
  saveProjectAction,
  saveProjectAction as saveProjectDocumentAction,
  getProjectAction,
  type SaveProjectResult,
  type SaveProjectResult as SaveProjectDocumentResult,
  type GetProjectResult,
} from "./project-persistence";
