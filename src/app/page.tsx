"use client";

import { useEffect, useState, useCallback } from "react";
import { LoginForm } from "@/components/login-form";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { Dashboard } from "@/components/dashboard";

interface SessionUser {
  id: string;
  username: string;
  fullName: string | null;
  role: string;
}

interface StoredSession {
  token: string;
  user: SessionUser;
}

export default function Home() {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<"login" | "forgot">("login");

  // Restore session from localStorage on mount, then validate with server
  useEffect(() => {
    let cancelled = false;
    async function restore() {
      let stored: StoredSession | null = null;
      try {
        const raw = localStorage.getItem("sum_session");
        if (raw) stored = JSON.parse(raw) as StoredSession;
      } catch {
        // ignore
      }

      if (!stored?.token) {
        if (!cancelled) setHydrated(true);
        return;
      }

      try {
        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${stored.token}` },
        });
        const data = await res.json();
        if (!cancelled) {
          if (data?.ok && data?.user) {
            setSession(data.user);
            setToken(stored.token);
            // Refresh stored user object in case role/fullName changed
            try {
              localStorage.setItem(
                "sum_session",
                JSON.stringify({ token: stored.token, user: data.user })
              );
            } catch {
              // ignore
            }
          } else {
            // Token invalid — clear it
            try {
              localStorage.removeItem("sum_session");
            } catch {
              // ignore
            }
          }
          setHydrated(true);
        }
      } catch {
        if (!cancelled) setHydrated(true);
      }
    }
    restore();
    return () => {
      cancelled = true;
    };
  }, []);

  // Heartbeat: ping the server every 20s to keep session marked online
  useEffect(() => {
    if (!token) return;
    const id = window.setInterval(async () => {
      try {
        await fetch("/api/auth/heartbeat", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // ignore transient heartbeat failures
      }
    }, 20_000);
    // Also fire one immediately
    fetch("/api/auth/heartbeat", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    return () => window.clearInterval(id);
  }, [token]);

  const handleAuthenticated = useCallback(
    (user: SessionUser, newToken: string) => {
      setSession(user);
      setToken(newToken);
    },
    []
  );

  const handleSignOut = useCallback(async () => {
    if (token) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // ignore
      }
    }
    try {
      localStorage.removeItem("sum_session");
    } catch {
      // ignore
    }
    setSession(null);
    setToken(null);
  }, [token]);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50/40 via-gray-50 to-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 rounded-full border-2 border-emerald-200 border-t-emerald-600 animate-spin" />
          <span className="text-xs text-gray-500">
            Loading Store Update Monitor…
          </span>
        </div>
      </div>
    );
  }

  if (session && token) {
    return <Dashboard user={session} token={token} onSignOut={handleSignOut} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-emerald-50/40 via-gray-50 to-white">
      {view === "login" ? (
        <LoginForm
          onAuthenticated={handleAuthenticated}
          onForgotPassword={() => setView("forgot")}
        />
      ) : (
        <ForgotPasswordForm
          onBack={() => setView("login")}
          onResetSuccess={() => setView("login")}
        />
      )}
    </div>
  );
}
