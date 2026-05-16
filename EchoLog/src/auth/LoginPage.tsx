import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/auth/AuthProvider";
import { Cr4c3_userprofilesService } from "@/generated/services/Cr4c3_userprofilesService";
import { sha256 } from "@/lib/utils";
import { AlertCircle, Lock, Mail, Zap } from "lucide-react";

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

  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginFormValues) => {
    setError(null);
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

      const hashedInput = await sha256(values.password);
      if (hashedInput !== passwordField) {
        setError("Incorrect password.");
        return;
      }

      // Strip password before storing in session
      const { ...safeUser } = user;
      delete (safeUser as Record<string, unknown>)["cr4c3_password"];

      login(safeUser);
      navigate(from, { replace: true });
    } catch {
      setError("Unable to sign in. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(222,47%,6%)] px-4">
      {/* Ambient orb */}
      <div className="pointer-events-none fixed top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-amber-500/5 blur-3xl" />

      <div className="glass rounded-2xl w-full max-w-md p-8 relative z-10 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-2">
            <Zap className="w-6 h-6 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">ECHO LOG</h1>
          <p className="text-sm text-slate-400">Enterprise Escalation Workflow System</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
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
              <p className="text-xs text-red-400">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
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
              <p className="text-xs text-red-400">{errors.password.message}</p>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="text-center text-xs text-slate-500">
          Azure Entra ID SSO coming soon · Contact IT for access issues
        </p>
      </div>
    </div>
  );
}
