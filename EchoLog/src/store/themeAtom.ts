import { atom } from "jotai";
import { type Theme, getStoredTheme, storeTheme, applyTheme } from "@/lib/theme";

/**
 * Holds the user's theme preference: 'light' | 'dark' | 'system'.
 * Initialized from localStorage on startup.
 */
export const themeAtom = atom<Theme>(getStoredTheme());

/**
 * Write-only atom that updates the theme, persists it, and applies it to the DOM.
 */
export const setThemeAtom = atom(null, (_get, set, theme: Theme) => {
  set(themeAtom, theme);
  storeTheme(theme);
  applyTheme(theme);
});
