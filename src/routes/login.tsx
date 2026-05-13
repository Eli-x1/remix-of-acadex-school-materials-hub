import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginWithPassword, signUpWithPassword, signInWithGoogle } from "@/lib/store";
import { Check, X } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login — Acadex" }, { name: "description", content: "Sign in to your Acadex workspace." }] }),
  component: LoginPage,
});

type Popup = { kind: "success" | "error"; title: string; message: string } | null;

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState<Popup>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setPopup(null);
    if (mode === "signup") {
      const r = await signUpWithPassword(email, password, name || email.split("@")[0]);
      setLoading(false);
      if (!r.ok) return setPopup({ kind: "error", title: "Sign up failed", message: r.error || "Try again." });
      setPopup({ kind: "success", title: "Check your email", message: "Confirm your address to finish signing up." });
      return;
    }
    const r = await loginWithPassword(email, password);
    setLoading(false);
    if (!r.ok || !r.user) return setPopup({ kind: "error", title: "Login failed", message: r.error || "Invalid email or password." });
    setPopup({ kind: "success", title: "Welcome back!", message: `Signed in as ${r.user.name}` });
    setTimeout(() => navigate({ to: "/app/dashboard" }), 700);
  }

  async function onGoogle() {
    setLoading(true);
    const r = await signInWithGoogle();
    setLoading(false);
    if (!r.ok) setPopup({ kind: "error", title: "Google sign-in failed", message: r.error || "Try again." });
  }

  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      <div className="absolute right-4 top-4 z-20"><ThemeToggle /></div>
      <div className="relative hidden overflow-hidden lg:block" style={{ background: "var(--gradient-hero)" }}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative flex h-full flex-col justify-between p-12 text-primary-foreground">
          <Link to="/"><Logo className="h-9 w-9" /></Link>
          <div>
            <h2 className="text-4xl font-bold leading-tight">Track. Manage. Deliver.</h2>
            <p className="mt-4 max-w-md text-white/80">The accountability platform built for modern schools.</p>
          </div>
          <div className="text-xs text-white/60">© {new Date().getFullYear()} Acadex</div>
        </div>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8"><Link to="/"><Logo /></Link></div>
          <h1 className="text-2xl font-bold text-foreground">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{mode === "login" ? "Sign in to your Acadex account." : "Sign up to get started with Acadex."}</p>
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" disabled={loading} variant="gradient" className="w-full">
              {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Sign up"}
            </Button>
            <Button type="button" variant="outline" className="w-full" disabled={loading} onClick={onGoogle}>
              Continue with Google
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {mode === "login" ? (
                <>No account? <button type="button" className="text-primary hover:underline" onClick={() => setMode("signup")}>Sign up</button></>
              ) : (
                <>Already have an account? <button type="button" className="text-primary hover:underline" onClick={() => setMode("login")}>Sign in</button></>
              )}
            </p>
          </form>
        </div>
      </div>

      {popup && <AuthPopup popup={popup} onClose={() => setPopup(null)} />}
    </div>
  );
}

function AuthPopup({ popup, onClose }: { popup: NonNullable<Popup>; onClose: () => void }) {
  const isSuccess = popup.kind === "success";
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-2xl animate-in zoom-in-95 fade-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center">
          {isSuccess ? <SuccessTick /> : <ErrorCross />}
        </div>
        <h3 className={`text-xl font-bold ${isSuccess ? "text-success" : "text-destructive"}`}>
          {popup.title}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">{popup.message}</p>
        {!isSuccess && (
          <Button variant="outline" className="mt-6 w-full" onClick={onClose}>
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}

function SuccessTick() {
  return (
    <div className="relative flex h-20 w-20 items-center justify-center">
      <span className="absolute inset-0 rounded-full bg-success/15 animate-ping" />
      <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-success/15 ring-4 ring-success/30">
        <Check className="h-10 w-10 text-success animate-in zoom-in-50 duration-500" strokeWidth={3} />
      </div>
    </div>
  );
}

function ErrorCross() {
  return (
    <div className="relative flex h-20 w-20 items-center justify-center">
      <span className="absolute inset-0 rounded-full bg-destructive/10" />
      <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-destructive/15 ring-4 ring-destructive/30 animate-[shake_0.5s_ease-in-out]">
        <X className="h-10 w-10 text-destructive animate-in zoom-in-50 duration-300" strokeWidth={3} />
      </div>
      <style>{`@keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }`}</style>
    </div>
  );
}
