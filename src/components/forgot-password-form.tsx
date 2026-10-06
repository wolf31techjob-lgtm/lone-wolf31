"use client";

import { useState, FormEvent } from "react";
import { LogIn, User, KeyRound, Store, ArrowRight, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ForgotPasswordFormProps {
  onBack: () => void;
  onResetSuccess: () => void;
}

export function ForgotPasswordForm({
  onBack,
  onResetSuccess,
}: ForgotPasswordFormProps) {
  const [username, setUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    const u = username.trim().toLowerCase();
    const p = newPassword;
    if (!u || !p) {
      toast({
        title: "Missing fields",
        description: "Please enter your UserID and a new password.",
        variant: "destructive",
      });
      return;
    }
    if (p.length < 6) {
      toast({
        title: "Password too short",
        description: "New password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }
    if (p !== confirm) {
      toast({
        title: "Passwords don't match",
        description: "Please re-enter the same password in both fields.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, newPassword: p }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setSubmitting(false);
        toast({
          title: "Reset failed",
          description: data?.error || "Could not reset the password.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Password reset",
        description: "You can now sign in with your new password.",
      });
      onResetSuccess();
    } catch (err) {
      setSubmitting(false);
      toast({
        title: "Reset failed",
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
          Reset your password if you've forgotten it.
        </p>
      </div>

      {/* Reset card */}
      <div className="rounded-2xl bg-white shadow-xl shadow-gray-200/60 ring-1 ring-gray-100 p-7 md:p-8">
        <div className="flex items-center gap-2 mb-1">
          <KeyRound className="w-5 h-5 text-emerald-600" />
          <h2 className="text-lg md:text-xl font-semibold text-gray-900">
            Reset password
          </h2>
        </div>
        <p className="text-[13px] text-gray-500 mb-6">
          Enter your UserID and choose a new password. All your previous sessions
          will be signed out.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div className="space-y-1.5">
            <Label htmlFor="fp-username" className="text-[13px] font-semibold text-gray-800">
              UserID
            </Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="fp-username"
                type="text"
                placeholder="enter your UserID"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-11 pl-9 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 rounded-lg focus-visible:bg-white focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
                disabled={submitting}
                autoCapitalize="off"
                autoCorrect="off"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fp-new" className="text-[13px] font-semibold text-gray-800">
              New password
            </Label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="fp-new"
                type="password"
                placeholder="minimum 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-11 pl-9 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 rounded-lg focus-visible:bg-white focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
                disabled={submitting}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fp-confirm" className="text-[13px] font-semibold text-gray-800">
              Confirm new password
            </Label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="fp-confirm"
                type="password"
                placeholder="re-enter new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="h-11 pl-9 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 rounded-lg focus-visible:bg-white focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
                disabled={submitting}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="group mt-2 w-full inline-flex items-center justify-center gap-2 h-11 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-emerald-600/20"
          >
            {submitting ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Resetting…
              </>
            ) : (
              <>
                Reset password
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </form>

        <button
          type="button"
          onClick={onBack}
          className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] text-gray-500 hover:text-emerald-700 font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to sign in
        </button>
      </div>
    </div>
  );
}
