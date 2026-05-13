import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import { initTheme } from "./hooks/use-theme";
import { supabase } from "./integrations/supabase/client";
import { hydrateFromCloud, setSession, getSession, type User, type Role } from "./lib/store";
import "./styles.css";

initTheme();

async function bootstrap() {
  supabase.auth.onAuthStateChange((_evt, session) => {
    if (!session) { setSession(null); return; }
    setTimeout(async () => {
      const uid = session.user.id;
      const [{ data: prof }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
      ]);
      const rank: Record<Role, number> = { super_admin: 3, school_admin: 2, staff: 1 };
      const role: Role = (roles ?? []).map((r: any) => r.role as Role).sort((a, b) => rank[b] - rank[a])[0] ?? "staff";
      const u: User = {
        id: uid,
        email: session.user.email ?? "",
        username: prof?.username ?? undefined,
        password: "",
        name: prof?.name || session.user.email || "",
        role,
        schoolId: prof?.school_id ?? null,
        staffRoleId: prof?.staff_role_id ?? null,
        photo: prof?.photo ?? null,
      };
      setSession(u);
      await hydrateFromCloud();
    }, 0);
  });
  const { data } = await supabase.auth.getSession();
  if (data.session && getSession()) await hydrateFromCloud();
}
void bootstrap();

const router = getRouter();

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);

if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  const isInIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
  const host = window.location.hostname;
  const isPreviewHost = host.includes("id-preview--") || host.includes("lovableproject.com");
  if (isInIframe || isPreviewHost) {
    navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
  } else {
    window.addEventListener("load", () => { navigator.serviceWorker.register("/sw.js").catch(() => {}); });
  }
}
