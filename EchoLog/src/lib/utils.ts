import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { SEVERITY_TAT_HOURS, type SeverityKey } from "@/lib/constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateDueDate(createdAt: Date, severityCode: number): Date {
  const severityMap: Record<number, SeverityKey> = {
    564060000: "Critical",
    564060001: "High",
    564060002: "Medium",
  };
  const key = severityMap[severityCode] ?? "Medium";
  const tatMs = SEVERITY_TAT_HOURS[key] * 60 * 60 * 1000;
  return new Date(createdAt.getTime() + tatMs);
}

export function calculateL1Window(createdAt: Date, severityCode: number): Date {
  const due = calculateDueDate(createdAt, severityCode);
  const tatMs = due.getTime() - createdAt.getTime();
  return new Date(createdAt.getTime() + tatMs * 0.3);
}

export function isOverdue(dueDate: string | Date | null | undefined): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

export function getRemainingTATMs(dueDate: string | Date | null | undefined): number {
  if (!dueDate) return 0;
  return new Date(dueDate).getTime() - Date.now();
}

export function formatDuration(ms: number): string {
  if (ms <= 0) return "Overdue";
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remH = hours % 24;
    return `${days}d ${remH}h`;
  }
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatTicketRef(ref: string | null | undefined): string {
  return ref ?? "—";
}

export function formatDateTime(dt: string | Date | null | undefined): string {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(dt: string | Date | null | undefined): string {
  if (!dt) return "—";
  return new Date(dt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Hash a plaintext string with SHA-256 (Web Crypto). Returns hex string. */
export async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

