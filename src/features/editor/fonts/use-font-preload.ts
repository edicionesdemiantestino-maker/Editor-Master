import { useEffect } from "react";

import { ensureFontLoaded } from "./font-manager";

export function useFontPreload() {
  useEffect(() => {
    void ensureFontLoaded("Inter", [400, 500, 600]);
  }, []);
}

