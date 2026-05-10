import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { createLovableAuth } from "@lovable.dev/cloud-auth-js";
import { Brain, Loader2 } from "lucide-react";
import { toast } from "sonner";

const lovableAuth = createLovableAuth();

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({ meta: [{ title: "Sign in — Testear" }] }),
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/" });
    });
  }, [nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast.success("Account created. You're signed in.");
        nav({ to: "/" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        nav({ to: "/" });
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  async function googleSignIn() {
    setBusy(true);
    const result = await lovableAuth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign in failed");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    await supabase.auth.setSession(result.tokens);
    nav({ to: "/" });
  }

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="size-12 mx-auto rounded-lg grid place-items-center"
            style={{ background: "var(--gradient-neon)", boxShadow: "var(--shadow-neon)" }}>
            <Brain className="size-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Test<span className="neon-text">ear</span></h1>
          <p className="text-sm text-muted-foreground">
            {mode === "signin" ? "Sign in to access your banks anywhere." : "Create an account to sync your banks across devices."}
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{mode === "signin" ? "Sign in" : "Sign up"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full" onClick={googleSignIn} disabled={busy}>
              Continue with Google
            </Button>
            <div className="relative text-center text-xs text-muted-foreground">
              <span className="bg-card px-2 relative z-10">or</span>
              <div className="absolute inset-0 top-1/2 border-t border-border" />
            </div>
            <form onSubmit={submit} className="space-y-3">
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Password</Label>
                <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy && <Loader2 className="size-4 mr-2 animate-spin" />}
                {mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="w-full text-xs text-muted-foreground hover:text-foreground"
            >
              {mode === "signin" ? "No account? Sign up" : "Already have an account? Sign in"}
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
