import { atom } from "jotai";
import type { Cr4c3_userprofilesBase } from "@/generated/models/Cr4c3_userprofilesModel";

const SESSION_KEY = "echolog_user";

function loadPersistedUser(): Cr4c3_userprofilesBase | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Cr4c3_userprofilesBase) : null;
  } catch {
    return null;
  }
}

export const currentUserAtom = atom<Cr4c3_userprofilesBase | null>(loadPersistedUser());

export const isAuthenticatedAtom = atom((get) => get(currentUserAtom) !== null);

export const SESSION_STORAGE_KEY = SESSION_KEY;
