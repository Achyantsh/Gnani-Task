"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { GlassEffect } from "@/components/liquid";
import { motion } from "motion/react";
import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  ShieldAlert,
} from "lucide-react";
import GoogleIcon from "@/constant/icons/google";
import { SITE_NAME } from "@/constant/site-config";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!email || !password) {
      setError("Please provide both email and password.");
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError(signInError.message);
          setLoading(false);
          return;
        }

        // Successfully signed in
        router.refresh();
        router.push(next);

      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });

        if (signUpError) {
          setError(signUpError.message);
          setLoading(false);
          return;
        }

        if (data?.user && !data.session) {
          setMessage(
            "Account created! Please check your email to confirm your account.",
          );
        } else {
          setMessage("Account created successfully! Redirecting...");
          router.refresh();
          router.push(next);
        }
        setLoading(false);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: "google") => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setError(error.message);
    }
  };

  return (
    <GlassEffect className="w-full rounded-3xl border border-white/30 p-7 sm:p-9 shadow-[0_16px_48px_rgba(0,0,0,0.25)] backdrop-blur-2xl">
      {/* Title & Badge */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">
          {mode === "signin" ? "Login" : "Create your account"}
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-white/80">
          {mode === "signin"
            ? `Enter your credentials to access your ${SITE_NAME} workspace`
            : `Get started with ${SITE_NAME} AI intelligence platform`}
        </p>

        {/* Tab Toggle with Smooth Spring Motion */}
        <div className="mt-6 grid grid-cols-2 gap-1 rounded-full bg-white/10 p-1 border border-white/20 backdrop-blur-md">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setError(null);
              setMessage(null);
            }}
            className={`relative rounded-full py-2 text-xs font-semibold transition-colors duration-200 select-none cursor-pointer ${
              mode === "signin"
                ? "text-white"
                : "text-white/70 hover:text-white"
            }`}
          >
            {mode === "signin" && (
              <motion.div
                layoutId="auth-active-tab"
                className="absolute inset-0 rounded-full bg-white/30 border border-white/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_2px_8px_rgba(0,0,0,0.15)] backdrop-blur-md"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">Sign In</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError(null);
              setMessage(null);
            }}
            className={`relative rounded-full py-2 text-xs font-semibold transition-colors duration-200 select-none cursor-pointer ${
              mode === "signup"
                ? "text-white"
                : "text-white/70 hover:text-white"
            }`}
          >
            {mode === "signup" && (
              <motion.div
                layoutId="auth-active-tab"
                className="absolute inset-0 rounded-full bg-white/30 border border-white/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_2px_8px_rgba(0,0,0,0.15)] backdrop-blur-md"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">Sign Up</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-red-400/40 bg-red-500/25 p-3 text-xs text-white backdrop-blur-md">
          <ShieldAlert className="h-4 w-4 shrink-0 text-red-200" />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-emerald-400/40 bg-emerald-500/25 p-3 text-xs text-white backdrop-blur-md">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-200" />
          <span>{message}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleAuth} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-white/90 mb-1.5">
            Email address
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="w-full rounded-xl border border-white/25 bg-white/15 py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/60 outline-none backdrop-blur-md transition-all focus:border-white/60 focus:bg-white/25 focus:ring-2 focus:ring-white/30"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-white/90 mb-1.5">
            Password
          </label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-white/25 bg-white/15 py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/60 outline-none backdrop-blur-md transition-all focus:border-white/60 focus:bg-white/25 focus:ring-2 focus:ring-white/30"
            />
          </div>
        </div>

        {mode === "signup" && (
          <div>
            <label className="block text-xs font-medium text-white/90 mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/25 bg-white/15 py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/60 outline-none backdrop-blur-md transition-all focus:border-white/60 focus:bg-white/25 focus:ring-2 focus:ring-white/30"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/90 py-2.5 text-xs font-semibold text-neutral-800 shadow-sm backdrop-blur-md hover:bg-white/80 hover:border-white/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-zinc-950" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <span>
                {mode === "signin" ? "Sign In to Workspace" : "Create Account"}
              </span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      {/* Social Providers Divider */}
      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/20" />
        <span className="text-[11px] text-white/70 uppercase tracking-wider font-medium">
          or continue with
        </span>
        <div className="h-px flex-1 bg-white/20" />
      </div>

      {/* OAuth Buttons */}
      <div className="grid grid-cols-1 gap-3">
    
        <button
          type="button"
          onClick={() => handleOAuthSignIn("google")}
          className="flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/15 py-2.5 text-xs font-semibold text-white shadow-sm backdrop-blur-md hover:bg-white/25 hover:border-white/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
        >
          <GoogleIcon/>
          <span>Google</span>
        </button>
      </div>

      <div className="mt-6 text-center text-[11px] text-white/75">
        By continuing, you agree to {SITE_NAME}&apos;s{" "}
        <Link
          href="/terms-and-policies"
          className="underline underline-offset-4 text-white hover:text-sky-200 transition"
        >
          Terms &amp; Policies
        </Link>
        .
      </div>
    </GlassEffect>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex w-full items-center justify-center rounded-3xl border border-white/20 bg-white/10 p-12 shadow-2xl backdrop-blur-xl">
          <Loader2 className="h-8 w-8 animate-spin text-white/50" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}