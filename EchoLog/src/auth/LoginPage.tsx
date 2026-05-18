import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAtomValue } from "jotai";
import { isAuthenticatedAtom } from "@/store/authAtoms";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/auth/AuthProvider";
import { Cr4c3_userprofilesService } from "@/generated/services/Cr4c3_userprofilesService";
import { unwrapResult } from "@/lib/utils";
import { AlertCircle, Lock, Mail, Zap, FlaskConical, Timer } from "lucide-react";
import { USER_ROLE } from "@/lib/constants";

// ─── Password hashing ────────────────────────────────────────────────────────
const hashPassword = async (plain: string): Promise<string> => {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(plain)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

// ─── Dev bypass ───────────────────────────────────────────────────────────────
const DEV_USER = {
  cr4c3_userprofileid: "00000000-0000-0000-0000-000000000001",
  cr4c3_fullname: "Dev Admin",
  cr4c3_email: "test@echolog.dev",
  cr4c3_role: USER_ROLE.Admin,
};

// ─── Throttle constants (PRD §2.5) ───────────────────────────────────────────
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_STORAGE_KEY = "echolog_lockout"; // { email, lockedAt }

interface LockoutEntry { email: string; lockedAt: number; }

function getLockout(): LockoutEntry | null {
  try {
    const raw = sessionStorage.getItem(LOCKOUT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LockoutEntry) : null;
  } catch { return null; }
}

function setLockout(email: string) {
  sessionStorage.setItem(LOCKOUT_STORAGE_KEY, JSON.stringify({ email, lockedAt: Date.now() }));
}

function clearLockout() {
  sessionStorage.removeItem(LOCKOUT_STORAGE_KEY);
}

function getRemainingLockoutMs(lockedAt: number): number {
  return Math.max(0, LOCKOUT_DURATION_MS - (Date.now() - lockedAt));
}

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/";
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);

  const [error, setError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutRemaining, setLockoutRemaining] = useState(0); // ms
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Resume active lockout on mount ────────────────────────────────────────
  useEffect(() => {
    const entry = getLockout();
    if (entry) {
      const remaining = getRemainingLockoutMs(entry.lockedAt);
      if (remaining > 0) {
        setLockoutRemaining(remaining);
        startCountdown();
      } else {
        clearLockout();
      }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startCountdown() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const entry = getLockout();
      if (!entry) { setLockoutRemaining(0); clearInterval(timerRef.current!); return; }
      const rem = getRemainingLockoutMs(entry.lockedAt);
      if (rem <= 0) {
        setLockoutRemaining(0);
        clearLockout();
        setFailedAttempts(0);
        clearInterval(timerRef.current!);
      } else {
        setLockoutRemaining(rem);
      }
    }, 1000);
  }

  function formatCountdown(ms: number): string {
    const totalSec = Math.ceil(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  // Declarative redirect — must be after all hooks
  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const isLocked = lockoutRemaining > 0;

  const onSubmit = async (values: LoginFormValues) => {
    setError(null);

    // ── Check active lockout ─────────────────────────────────────────────────
    const entry = getLockout();
    if (entry && entry.email === values.email) {
      const rem = getRemainingLockoutMs(entry.lockedAt);
      if (rem > 0) {
        setLockoutRemaining(rem);
        startCountdown();
        setError(`Account locked. Try again in ${formatCountdown(rem)}.`);
        return;
      } else {
        clearLockout();
        setFailedAttempts(0);
      }
    }

    // ── Dev bypass: test@echolog.dev / test ──────────────────────────────────
    if (values.email === "test@echolog.dev" && values.password === "test") {
      login(DEV_USER);
      navigate(from, { replace: true });
      return;
    }

    try {
      const result = await Cr4c3_userprofilesService.getAll({
        filter: `cr4c3_email eq '${values.email}'`,
        select: ["cr4c3_userprofileid", "cr4c3_fullname", "cr4c3_email", "cr4c3_role", "_cr4c3_department_value", "_cr4c3_subdepartment_value", "_cr4c3_process_value", "_cr4c3_team_value", "_cr4c3_manager_value", "_cr4c3_l2manager_value", "cr4c3_password"],
      });

      const users = unwrapResult(result) ?? [];
      if (users.length === 0) {
        setError("No account found with that email address.");
        return;
      }

      const user = users[0];

      const passwordField = user.cr4c3_password;
      if (!passwordField) {
        setError("This account has no password set. Contact your administrator.");
        return;
      }

      const storedValue = passwordField.trim();
      const hashedInput = await hashPassword(values.password.trim());
      const passwordMatch = hashedInput === storedValue;

      if (!passwordMatch) {
        const newCount = failedAttempts + 1;
        setFailedAttempts(newCount);

        // no-op: failedloginattempts not tracked server-side in this schema

        if (newCount >= MAX_ATTEMPTS) {
          setLockout(values.email);
          setLockoutRemaining(LOCKOUT_DURATION_MS);
          startCountdown();
          setError(`Too many failed attempts. Account locked for 15 minutes.`);
        } else {
          const remaining = MAX_ATTEMPTS - newCount;
          setError(`Incorrect password. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`);
        }
        return;
      }

      // ── Successful login: reset counters ──────────────────────────────────
      clearLockout();
      setFailedAttempts(0);

      // Strip password before storing in session (never persist credentials)
      const safeUser = { ...user };
      delete (safeUser as Record<string, unknown>)["cr4c3_password"];

      login(safeUser);
      navigate(from, { replace: true });
    } catch (err) {
      console.error("[EchoLog] Login error:", err);
      setError(`Unable to sign in: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] px-4 transition-colors">
      {/* Ambient orb */}
      <div className="pointer-events-none fixed top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-amber-500/5 blur-3xl" />

      <div className="glass rounded-2xl w-full max-w-md p-8 relative z-10 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 mb-2">
          <Zap className="w-6 h-6 text-amber-600 dark:text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">ECHO LOG</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Enterprise Escalation Workflow System</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                className="pl-9"
                {...register("email")}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="pl-9"
                {...register("password")}
              />
            </div>
            {errors.password && (
              <p className="text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>

          {isLocked && (
            <div className="flex items-center gap-2 rounded-md bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 px-3 py-2">
              <Timer className="h-4 w-4 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                Account locked · Try again in <span className="font-mono">{formatCountdown(lockoutRemaining)}</span>
              </p>
            </div>
          )}

          {!isLocked && error && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 px-3 py-2">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {!isLocked && failedAttempts > 0 && failedAttempts < MAX_ATTEMPTS && (
            <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
              {MAX_ATTEMPTS - failedAttempts} attempt{MAX_ATTEMPTS - failedAttempts !== 1 ? "s" : ""} remaining before lockout
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting || isLocked}>
            {isLocked ? "Account Locked" : isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        {/* Dev shortcut */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-700" /></div>
          <div className="relative flex justify-center text-xs"><span className="bg-[hsl(var(--background-card))] px-2 text-gray-400 dark:text-gray-500">dev</span></div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950"
          onClick={() => { login(DEV_USER); navigate(from, { replace: true }); }}
        >
          <FlaskConical className="w-4 h-4 mr-2" />
          Quick Dev Login (Admin)
        </Button>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500">
          Azure Entra ID SSO coming soon · Contact IT for access issues
        </p>
      </div>
    </div>
  );
}
