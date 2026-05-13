import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Building2, ShieldCheck, Activity, ArrowRight, Check } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Acadex — Smarter School Accountability" },
      { name: "description", content: "Track materials, manage students, and eliminate delays. The modern accountability platform for schools." },
      { property: "og:title", content: "Acadex — Smarter School Accountability" },
      { property: "og:description", content: "Track materials, manage students, and eliminate delays." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#pricing" className="hover:text-foreground">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/login"><Button variant="ghost" size="sm">Login</Button></Link>
            <Link to="/login"><Button size="sm" variant="gradient">Get Started</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[var(--gradient-subtle)]" />
        <div className="absolute -top-32 left-1/2 -z-10 h-[500px] w-[900px] -translate-x-1/2 rounded-full opacity-30 blur-3xl" style={{ background: "var(--gradient-primary)" }} />
        <div className="mx-auto max-w-7xl px-6 pt-20 pb-24 text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            Trusted by modern schools
          </div>
          <h1 className="mx-auto max-w-3xl text-5xl font-bold tracking-tight text-primary-deep md:text-6xl">
            Smarter School <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>Accountability</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Acadex helps schools track materials, manage students, and eliminate delays — all in one beautiful, modern dashboard.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/login"><Button size="lg" variant="gradient">Get Started <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
            <Link to="/login"><Button size="lg" variant="outline">Login</Button></Link>
          </div>

          {/* Mock dashboard preview */}
          <div className="relative mx-auto mt-16 max-w-5xl rounded-2xl border border-border bg-card p-2 shadow-[var(--shadow-elegant)]">
            <div className="rounded-xl bg-[var(--gradient-subtle)] p-6">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Total Students", val: "1,284", color: "text-primary" },
                  { label: "Pending Items", val: "47", color: "text-warning" },
                  { label: "Overdue", val: "12", color: "text-destructive" },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg bg-card p-4 text-left shadow-sm">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</div>
                    <div className={`mt-1 text-2xl font-bold ${s.color}`}>{s.val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border/60 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-primary-deep md:text-4xl">Everything your school needs</h2>
            <p className="mt-4 text-muted-foreground">Built for clarity, scale, and accountability.</p>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              { icon: Building2, title: "Multi-school system", desc: "Each school operates independently with isolated data, users, and configuration." },
              { icon: ShieldCheck, title: "Role-based access", desc: "Finance, logistics, and academic staff each see exactly what they need — nothing more." },
              { icon: Activity, title: "Real-time tracking", desc: "Track every material, fee, and promised date with color-coded statuses live." },
            ].map((f) => (
              <div key={f.title} className="group rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-elegant)]">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-[var(--gradient-subtle)] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-primary-deep md:text-4xl">How Acadex works</h2>
            <p className="mt-4 text-muted-foreground">Three steps to full accountability.</p>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              { n: "01", title: "Create your school", desc: "Onboard your school in minutes with custom branding and structure." },
              { n: "02", title: "Add staff & students", desc: "Invite staff with the right roles, then add students by class." },
              { n: "03", title: "Track in real-time", desc: "Define materials and let staff update statuses as items come in." },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
                <div className="text-sm font-bold tracking-widest text-primary">{s.n}</div>
                <h3 className="mt-2 text-lg font-semibold text-foreground">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section id="pricing" className="py-24">
        <div className="mx-auto max-w-3xl rounded-3xl border border-border bg-card p-10 text-center shadow-[var(--shadow-elegant)]">
          <h2 className="text-3xl font-bold text-primary-deep">Built for schools of every size</h2>
          <p className="mt-3 text-muted-foreground">Start free. Upgrade as you grow.</p>
          <ul className="mx-auto mt-6 grid max-w-md gap-2 text-left text-sm">
            {["Unlimited students", "Custom material lists", "Role-based staff access", "Real-time analytics"].map((x) => (
              <li key={x} className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> {x}</li>
            ))}
          </ul>
          <Link to="/login"><Button size="lg" variant="gradient" className="mt-8">Get Started Free</Button></Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-card">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">The modern accountability platform helping schools track materials, manage students, and deliver outcomes.</p>
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">Product</div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-foreground">Features</a></li>
              <li><a href="#how" className="hover:text-foreground">How it works</a></li>
              <li><a href="#pricing" className="hover:text-foreground">Pricing</a></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">Company</div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/login" className="hover:text-foreground">Login</Link></li>
              <li><a href="#" className="hover:text-foreground">Contact</a></li>
              <li><a href="#" className="hover:text-foreground">Privacy</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} Acadex. Track. Manage. Deliver.</div>
      </footer>
    </div>
  );
}
