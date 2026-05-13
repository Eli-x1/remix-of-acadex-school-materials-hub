import { createFileRoute, Outlet, Link, useNavigate, useLocation, redirect } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-acadex";
import { signOut, hasPermission, userRoleLabel } from "@/lib/store";
import { useDB } from "@/hooks/use-acadex";
import { LayoutDashboard, Users, Package, FileBarChart, Settings, Building2, LogOut, Menu, X, GraduationCap, ClipboardCheck, Tag, UserCog, Sun, Moon, Upload, Archive, History, Globe } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useLang, type Lang } from "@/lib/i18n";
import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/app")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("acadex_session_v1");
      if (!raw) throw redirect({ to: "/login" });
    }
  },
  component: AppShell,
});

const NAV = [
  { to: "/app/dashboard", label: "Dashboard", key: "dashboard", icon: LayoutDashboard, perm: null as null | string },
  { to: "/app/schools", label: "Schools", key: "schools", icon: Building2, perm: "manage_schools" },
  { to: "/app/students", label: "Students", key: "students", icon: Users, perm: "manage_students" },
  { to: "/app/classes", label: "Classes", key: "classes", icon: GraduationCap, perm: "manage_classes" },
  { to: "/app/categories", label: "Staff Roles", key: "staff_roles", icon: Tag, perm: "manage_roles" },
  { to: "/app/staff", label: "Staff", key: "staff", icon: UserCog, perm: "manage_staff" },
  { to: "/app/materials", label: "Materials", key: "materials", icon: Package, perm: "manage_materials" },
  { to: "/app/tracking", label: "Tracking", key: "tracking", icon: ClipboardCheck, perm: null },
  { to: "/app/reports", label: "Reports", key: "reports", icon: FileBarChart, perm: "view_reports" },
  { to: "/app/import", label: "Bulk import", key: "bulk_import", icon: Upload, perm: "manage_students" },
  { to: "/app/archives", label: "Archives", key: "archives", icon: Archive, perm: "view_reports" },
  { to: "/app/audit", label: "Audit log", key: "audit_log", icon: History, perm: "manage_staff" },
  { to: "/app/settings", label: "Settings", key: "settings", icon: Settings, perm: null },
] as const;

function AppShell() {
  const user = useSession();
  const db = useDB();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { t } = useLang();

  if (!user) return null;

  async function logout() {
    await signOut();
    navigate({ to: "/login" });
  }

  const visible = NAV.filter((n) => !n.perm || hasPermission(user, n.perm as any));

  return (
    <div className="min-h-screen bg-[var(--gradient-subtle)]">
      <Toaster />
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-border bg-card transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <Link to="/"><Logo /></Link>
          <button className="lg:hidden" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {visible.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link key={item.to} to={item.to} preload="intent" onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${active ? "bg-primary text-primary-foreground shadow-[var(--shadow-elegant)]" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
                <item.icon className="h-4 w-4" /> {t(item.key as any)}
              </Link>
            );
          })}
        </nav>
        <div className="absolute inset-x-0 bottom-0 border-t border-border p-3">
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="text-sm font-semibold text-foreground">{user.name}</div>
            <div className="text-xs text-muted-foreground">{userRoleLabel(user, db)}</div>
            <Button variant="outline" size="sm" className="mt-3 w-full" onClick={logout}>
              <LogOut className="mr-2 h-3 w-3" /> {t("signout")}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur">
          <button className="lg:hidden" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button>
          <div className="ml-auto flex items-center gap-3 text-sm text-muted-foreground">
            <LangToggle />
            <ThemeToggle />
            <span className="hidden sm:inline">{userRoleLabel(user, db)}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {user.name.split(" ").map(s=>s[0]).slice(0,2).join("")}
            </div>
          </div>
        </header>
        <main className="p-6"><Outlet /></main>
      </div>
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button onClick={toggle} aria-label="Toggle theme" className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-foreground hover:bg-accent transition">
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

function LangToggle() {
  const { lang, setLang } = useLang();
  const cycle: Record<Lang, Lang> = { en: "fr", fr: "rw", rw: "en" };
  return (
    <button
      onClick={() => setLang(cycle[lang])}
      aria-label="Change language"
      title="Language"
      className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-card px-2 text-xs font-medium text-foreground hover:bg-accent transition"
    >
      <Globe className="h-3.5 w-3.5" />{lang.toUpperCase()}
    </button>
  );
}
