import { atom } from "jotai";
import type { Cr4c3_userprofilesBase } from "@/generated/models/Cr4c3_userprofilesModel";

// PRD §2.5: Credentials stored in-memory only. No persistence across page refreshes.
export const currentUserAtom = atom<Cr4c3_userprofilesBase | null>(null);

export const isAuthenticatedAtom = atom((get) => get(currentUserAtom) !== null);

/** @deprecated No longer used — kept for import compatibility during transition */
export const SESSION_STORAGE_KEY = "echolog_user";
