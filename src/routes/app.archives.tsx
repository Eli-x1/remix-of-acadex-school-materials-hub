import { createFileRoute, redirect } from "@tanstack/react-router";
import { useDB, useSession } from "@/hooks/use-acadex";
import { getSession, archiveTerm, currentAcademicYear, currentTerm, TERM_LABEL, type Term } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { toast } from "sonner";
import { Archive, FileDown } from "lucide-react";
import { exportHTMLToPDF, escapeHTML, statusBadgeHTML } from "@/lib/pdf";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/app/archives")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const u = getSession();
      if (!u || u.role === "staff") throw redirect({ to: "/app/dashboard" });
    }
  },
  head: () => ({ meta: [{ title: "Archives — Acadex" }] }),
  component: ArchivesPage,
});

function ArchivesPage() {
  const db = useDB();
  const user = useSession()!;
  const { t } = useLang();
  const schoolId = user.schoolId ?? db.schools[0]?.id ?? "";
  const [year, setYear] = useState(currentAcademicYear());
  const [term, setTerm] = useState<Term>(currentTerm());
  const [promote, setPromote] = useState(true);

  const archives = (db.archives ?? []).filter((a) => user.role === "super_admin" || a.schoolId === schoolId).sort((a, b) => b.archivedAt.localeCompare(a.archivedAt));

  function doArchive() {
    if (!schoolId) return toast.error("No school");
    if (!confirm(t("confirm_archive"))) return;
    const res = archiveTerm({ schoolId, academicYear: year, term, promote });
    if (!res.ok) return toast.error(res.error || "Failed");
    toast.success("Term archived");
  }

  function exportArchive(id: string) {
    const a = (db.archives ?? []).find((x) => x.id === id);
    if (!a) return;
    const school = db.schools.find((s) => s.id === a.schoolId);
    const rows = a.tracking.map((tr) => {
      const stu = db.students.find((s) => s.id === tr.studentId);
      const mat = db.materials.find((m) => m.id === tr.materialId);
      return `<tr><td>${escapeHTML(stu?.name ?? "—")}</td><td>${escapeHTML(stu?.className ?? "—")}</td><td>${escapeHTML(mat?.name ?? "—")}</td><td>${statusBadgeHTML(tr.status)}</td><td>${tr.promisedDate ? new Date(tr.promisedDate).toLocaleDateString() : "—"}</td></tr>`;
    }).join("");
    const html = `
      <h1>${escapeHTML(school?.name ?? "Acadex")} — ${a.academicYear} · ${TERM_LABEL[a.term]}</h1>
      <div class="meta">Archived ${new Date(a.archivedAt).toLocaleString()} by ${escapeHTML(a.archivedBy)}</div>
      <div class="summary">
        <div><span>Brought</span><b>${a.summary.completed}</b></div>
        <div><span>Pending</span><b>${a.summary.pending}</b></div>
        <div><span>Overdue</span><b>${a.summary.overdue}</b></div>
        <div><span>Students</span><b>${a.studentsCount}</b></div>
      </div>
      <table><thead><tr><th>Student</th><th>Class</th><th>Material</th><th>Status</th><th>Promised</th></tr></thead><tbody>${rows}</tbody></table>`;
    exportHTMLToPDF(`Archive ${a.academicYear}-${a.term}`, html);
  }

  const yearOptions = [currentAcademicYear() - 1, currentAcademicYear(), currentAcademicYear() + 1];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("archives")}</h1>
        <p className="text-sm text-muted-foreground">Close a term, snapshot all tracking data, and optionally promote students to the next class.</p>
      </div>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Archive className="h-4 w-4" />{t("archive_term")}</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4 items-end">
          <div>
            <Label className="text-xs">{t("year")}</Label>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{yearOptions.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{t("term")}</Label>
            <Select value={term} onValueChange={(v) => setTerm(v as Term)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="T1">{TERM_LABEL.T1}</SelectItem>
                <SelectItem value="T2">{TERM_LABEL.T2}</SelectItem>
                <SelectItem value="T3">{TERM_LABEL.T3}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Switch checked={promote} onCheckedChange={setPromote} id="prom" />
            <Label htmlFor="prom" className="cursor-pointer text-sm">{t("promote_students")}</Label>
          </div>
          <Button onClick={doArchive} variant="gradient"><Archive className="mr-2 h-4 w-4" />{t("archive_term")}</Button>
        </CardContent>
      </Card>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader><CardTitle className="text-base">Past archives ({archives.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Brought</TableHead>
                <TableHead>Pending</TableHead>
                <TableHead>Overdue</TableHead>
                <TableHead>{t("archived_at")}</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {archives.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">{t("no_records")}</TableCell></TableRow>}
              {archives.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.academicYear} · {TERM_LABEL[a.term]}</TableCell>
                  <TableCell className="text-success font-medium">{a.summary.completed}</TableCell>
                  <TableCell className="text-warning font-medium">{a.summary.pending}</TableCell>
                  <TableCell className="text-destructive font-medium">{a.summary.overdue}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{new Date(a.archivedAt).toLocaleString()}<br/>by {a.archivedBy}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => exportArchive(a.id)}><FileDown className="mr-1 h-3.5 w-3.5" />PDF</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
