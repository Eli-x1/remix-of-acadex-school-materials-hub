import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useDB } from "@/hooks/use-acadex";
import { classDisplayName, TERM_LABEL } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "./app.dashboard";
import { ArrowLeft, FileDown, Phone } from "lucide-react";
import { exportHTMLToPDF, escapeHTML, statusBadgeHTML } from "@/lib/pdf";

export const Route = createFileRoute("/app/students/$studentId")({
  head: () => ({ meta: [{ title: "Student profile — Acadex" }] }),
  component: StudentProfilePage,
});

function StudentProfilePage() {
  const { studentId } = useParams({ from: "/app/students/$studentId" });
  const db = useDB();
  const student = db.students.find((s) => s.id === studentId);

  if (!student) {
    return (
      <div className="space-y-4">
        <Link to="/app/students" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Back</Link>
        <Card><CardContent className="p-8 text-center text-muted-foreground">Student not found.</CardContent></Card>
      </div>
    );
  }

  const cls = db.classes.find((c) => c.id === student.classId);
  const tracking = db.tracking.filter((t) => t.studentId === student.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const archived = (db.archives ?? []).flatMap((a) => a.tracking.filter((t) => t.studentId === student.id).map((t) => ({ ...t, _archive: a })));
  const totals = {
    completed: tracking.filter((t) => t.status === "completed").length,
    pending: tracking.filter((t) => t.status === "pending").length,
    overdue: tracking.filter((t) => t.status === "overdue").length,
  };

  const stu = student;
  function exportPDF() {
    const rows = tracking.map((tr) => {
      const m = db.materials.find((x) => x.id === tr.materialId);
      return `<tr><td>${escapeHTML(m?.name ?? "—")}</td><td>${tr.academicYear} · ${TERM_LABEL[tr.term]}</td><td>${statusBadgeHTML(tr.status)}</td><td>${tr.promisedDate ? new Date(tr.promisedDate).toLocaleDateString() : "—"}</td><td>${new Date(tr.updatedAt).toLocaleDateString()}</td></tr>`;
    }).join("");
    const html = `
      <h1>${escapeHTML(stu.name)}</h1>
      <div class="meta">${escapeHTML(cls ? classDisplayName(cls) : stu.className ?? "")} · Parent: ${escapeHTML(stu.parentPhone ?? "—")}</div>
      <div class="summary">
        <div><span>Brought</span><b>${totals.completed}</b></div>
        <div><span>Pending</span><b>${totals.pending}</b></div>
        <div><span>Overdue</span><b>${totals.overdue}</b></div>
      </div>
      <table><thead><tr><th>Material</th><th>Period</th><th>Status</th><th>Promised</th><th>Updated</th></tr></thead><tbody>${rows}</tbody></table>`;
    exportHTMLToPDF(`Profile — ${stu.name}`, html);
  }

  return (
    <div className="space-y-6">
      <Link to="/app/students" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Back to students</Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          {student.photo ? (
            <img src={student.photo} alt={student.name} className="h-20 w-20 rounded-full object-cover border border-border" />
          ) : (
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center text-2xl text-muted-foreground">{student.name.charAt(0).toUpperCase()}</div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground">{student.name}</h1>
            <p className="text-sm text-muted-foreground">{cls ? classDisplayName(cls) : student.className}</p>
            {student.parentPhone && (
              <a href={`tel:${student.parentPhone}`} className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                <Phone className="h-3.5 w-3.5" />{student.parentPhone}
              </a>
            )}
          </div>
        </div>
        <Button variant="outline" onClick={exportPDF}><FileDown className="mr-2 h-4 w-4" />Export PDF</Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Stat label="Brought" value={totals.completed} tone="text-success" />
        <Stat label="Pending" value={totals.pending} tone="text-warning" />
        <Stat label="Overdue" value={totals.overdue} tone="text-destructive" />
      </div>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader><CardTitle className="text-base">Current term tracking</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Material</TableHead><TableHead>Period</TableHead><TableHead>Status</TableHead><TableHead>Promised</TableHead><TableHead>Updated</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {tracking.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No records.</TableCell></TableRow>}
              {tracking.map((tr) => {
                const m = db.materials.find((x) => x.id === tr.materialId);
                return (
                  <TableRow key={tr.id}>
                    <TableCell className="font-medium">{m?.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{tr.academicYear} · {TERM_LABEL[tr.term]}</TableCell>
                    <TableCell><StatusBadge status={tr.status} /></TableCell>
                    <TableCell>{tr.promisedDate ? new Date(tr.promisedDate).toLocaleDateString() : "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{new Date(tr.updatedAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {archived.length > 0 && (
        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader><CardTitle className="text-base">Archived history</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Material</TableHead><TableHead>Period</TableHead><TableHead>Status</TableHead><TableHead>Archived</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {archived.map((tr) => {
                  const m = db.materials.find((x) => x.id === tr.materialId);
                  return (
                    <TableRow key={tr.id + tr._archive.id}>
                      <TableCell className="font-medium">{m?.name ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{tr.academicYear} · {TERM_LABEL[tr.term]}</TableCell>
                      <TableCell><StatusBadge status={tr.status} /></TableCell>
                      <TableCell className="text-muted-foreground text-xs">{new Date(tr._archive.archivedAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={`mt-1 text-3xl font-bold ${tone}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
