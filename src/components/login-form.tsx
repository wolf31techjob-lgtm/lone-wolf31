"use client";

import { useState, FormEvent } from "react";
import { LogIn, User, KeyRound, Store, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface LoginFormProps {
  onAuthenticated: (user: { id: string; username: string; fullName: string | null; role: string }, token: string) => void;
  onForgotPassword: () => void;
}

export function LoginForm({ onAuthenticated, onForgotPassword }: LoginFormProps) {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    const trimmedUser = userId.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      toast({
        title: "Missing credentials",
        description: "Please enter both your UserID and password.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmedUser.toLowerCase(), password: trimmedPass }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setSubmitting(false);
        toast({
          title: "Sign-in failed",
          description: data?.error || "Invalid UserID or password.",
          variant: "destructive",
        });
        return;
      }

      // Persist session token so the dashboard can use it across reloads
      try {
        localStorage.setItem(
          "sum_session",
          JSON.stringify({
            token: data.token,
            user: data.user,
          })
        );
      } catch {
        // localStorage unavailable (private mode) — non-fatal
      }

      toast({
        title: `Welcome back, ${data.user.fullName || data.user.username}`,
        description: "You are now signed in to Store Update Monitor.",
      });

      onAuthenticated(data.user, data.token);
    } catch (err) {
      setSubmitting(false);
      toast({
        title: "Sign-in failed",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Brand header */}
      <div className="flex flex-col items-center text-center mb-7">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-500/30 mb-4">
          <Store className="w-9 h-9 text-white" strokeWidth={2.1} />
        </div>
        <h1 className="text-[26px] md:text-[28px] font-bold tracking-tight text-gray-900">
          Store Update Monitor
        </h1>
        <p className="mt-2 text-sm md:text-[15px] text-gray-500 max-w-sm">
          Sign in with your credentials to track store update execution.
        </p>
      </div>

      {/* Login card */}
      <div className="rounded-2xl bg-white shadow-xl shadow-gray-200/60 ring-1 ring-gray-100 p-7 md:p-8">
        <div className="flex items-center gap-2 mb-1">
          <LogIn className="w-5 h-5 text-emerald-600" />
          <h2 className="text-lg md:text-xl font-semibold text-gray-900">
            Sign in
          </h2>
        </div>
        <p className="text-[13px] text-gray-500 mb-6">
          Use the UserID and password provided by your Admin.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          {/* UserID */}
          <div className="space-y-1.5">
            <Label
              htmlFor="userid"
              className="text-[13px] font-semibold text-gray-800"
            >
              UserID
            </Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="userid"
                type="text"
                autoComplete="username"
                placeholder="enter your UserID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="h-11 pl-9 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 rounded-lg focus-visible:bg-white focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
                disabled={submitting}
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label
              htmlFor="password"
              className="text-[13px] font-semibold text-gray-800"
            >
              Password
            </Label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 pl-9 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 rounded-lg focus-visible:bg-white focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
                disabled={submitting}
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="group mt-2 w-full inline-flex items-center justify-center gap-2 h-11 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-emerald-600/20"
          >
            {submitting ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                Sign in
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>

          {/* Forgot password link */}
          <div className="text-center mt-3">
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-[12.5px] text-gray-500 hover:text-emerald-700 font-medium"
            >
              Forgot your password? Reset it here.
            </button>
          </div>
        </form>

        {/* Info box — updated text */}
        <div className="mt-6 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
          <p className="text-[13px] font-semibold text-emerald-800">
            Need access?
          </p>
          <p className="text-[12.5px] text-emerald-700/90 mt-0.5 leading-relaxed">
            Demand from your System Administrator to provision your credentials here.
          </p>
        </div>
      </div>
    </div>
  );
}
