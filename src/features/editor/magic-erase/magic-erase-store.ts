import { create } from "zustand";

export type MagicEraseMode = "off" | "select_rect";

type MagicEraseState = {
  mode: MagicEraseMode;
  prompt: string;
  setPrompt: (v: string) => void;
  startSelectRect: () => void;
  stop: () => void;
};

export const useMagicEraseStore = create<MagicEraseState>((set) => ({
  mode: "off",
  prompt: "",
  setPrompt: (prompt) => set({ prompt }),
  startSelectRect: () => set({ mode: "select_rect" }),
  stop: () => set({ mode: "off" }),
}));
