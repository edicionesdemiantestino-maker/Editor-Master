/**
 * Señal liviana para que el autosave coalescezca cambios que tocan Fabric
 * pero podrían no reflejarse inmediatamente en el selector `present` del store
 * (p. ej. algunos `object:added` / `object:removed`).
 *
 * No persiste datos por sí mismo: solo dispara el mismo debounce que el documento canónico.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeFabricSceneDirty(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function bumpFabricSceneDirty(): void {
  for (const l of listeners) {
    try {
      l();
    } catch {
      /* aislado: un listener roto no tumba el editor */
    }
  }
}
