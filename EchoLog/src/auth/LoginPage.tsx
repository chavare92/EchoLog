import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAtomValue } from "jotai";
import { isAuthenticatedAtom } from "@/store/authAtoms";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/auth/AuthProvider";
import { Cr4c3_userprofilesService } from "@/generated/services/Cr4c3_userprofilesService";
import { sha256 } from "@/lib/utils";
import { AlertCircle, Lock, Mail, Zap, FlaskConical } from "lucide-react";
import { USER_ROLE } from "@/lib/constants";

// ─── Dev bypass ───────────────────────────────────────────────────────────────
const DEV_USER = {
  cr4c3_userprofileid: "00000000-0000-0000-0000-000000000001",
  cr4c3_fullname: "Dev Admin",
  cr4c3_email: "test@echolog.dev",
  cr4c3_role: USER_ROLE.Admin,
};

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

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  // Declarative redirect — must be after all hooks
  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const onSubmit = async (values: LoginFormValues) => {
    setError(null);

    // ── Dev bypass: test@echolog.dev / test ──────────────────────────────────
    if (values.email === "test@echolog.dev" && values.password === "test") {
      login(DEV_USER);
      navigate(from, { replace: true });
      return;
    }

    try {
      const result = await Cr4c3_userprofilesService.getAll({
        filter: `cr4c3_email eq '${values.email}'`,
        select: ["cr4c3_userprofileid", "cr4c3_fullname", "cr4c3_email", "cr4c3_role", "_cr4c3_department_value", "_cr4c3_team_value", "_cr4c3_manager_value", "_cr4c3_l2manager_value", "cr4c3_password"],
      });

      const users = result.data ?? [];
      if (users.length === 0) {
        setError("No account found with that email address.");
        return;
      }

      const user = users[0];
      const passwordField = (user as Record<string, unknown>)["cr4c3_password"] as string | undefined;

      if (!passwordField) {
        setError("This account has no password set. Contact your administrator.");
        return;
      }

      // Normalise stored hash — sha256sum appends "  -"; strip it
      const storedHash = passwordField.trim().split(/\s/)[0].toLowerCase();
      const hashedInput = await sha256(values.password);
      if (hashedInput !== storedHash) {
        setError("Incorrect password.");
        return;
      }

      // Strip password before storing in session
      const { ...safeUser } = user;
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

          {error && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 px-3 py-2">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in…" : "Sign in"}
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
