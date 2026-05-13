import { createFileRoute, redirect } from "@tanstack/react-router";
import { useDB, useSession } from "@/hooks/use-acadex";
import { getSession } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { History } from "lucide-react";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/app/audit")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const u = getSession();
      if (!u || u.role === "staff") throw redirect({ to: "/app/dashboard" });
    }
  },
  head: () => ({ meta: [{ title: "Audit log — Acadex" }] }),
  component: AuditPage,
});

function AuditPage() {
  const db = useDB();
  const user = useSession()!;
  const { t } = useLang();
  const [q, setQ] = useState("");
  const entries = (db.audit ?? [])
    .filter((a) => user.role === "super_admin" || a.schoolId === user.schoolId || a.schoolId === null)
    .filter((a) => !q.trim() || `${a.actorName} ${a.action} ${a.target ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("audit_log")}</h1>
        <p className="text-sm text-muted-foreground">All recent changes performed in your workspace.</p>
      </div>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2"><History className="h-4 w-4" />{entries.length} entries</span>
            <Input placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} className="w-[220px]" />
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("time")}</TableHead>
                <TableHead>{t("actor")}</TableHead>
                <TableHead>{t("action")}</TableHead>
                <TableHead>{t("target")}</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">{t("no_records")}</TableCell></TableRow>}
              {entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(e.at).toLocaleString()}</TableCell>
                  <TableCell className="font-medium">{e.actorName}</TableCell>
                  <TableCell><code className="rounded bg-muted px-1.5 py-0.5 text-xs">{e.action}</code></TableCell>
                  <TableCell>{e.target || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{e.details || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
