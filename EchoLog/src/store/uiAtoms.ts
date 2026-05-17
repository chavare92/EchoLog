import { atom } from "jotai";

/** Desktop sidebar collapsed state (icon-only mode). */
export const sidebarCollapsedAtom = atom<boolean>(false);

/** Mobile sidebar open state (slide-out drawer). */
export const mobileSidebarOpenAtom = atom<boolean>(false);

/** Active notification count for badge display. */
export const activeNotificationCountAtom = atom<number>(0);
