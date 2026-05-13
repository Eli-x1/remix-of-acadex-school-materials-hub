import { createFileRoute } from "@tanstack/react-router";
import { useDB, useSession } from "@/hooks/use-acadex";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "./app.dashboard";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { TERM_LABEL, currentAcademicYear, type Term } from "@/lib/store";
import { exportHTMLToPDF, escapeHTML, statusBadgeHTML } from "@/lib/pdf";

export const Route = createFileRoute("/app/reports")({
  head: () => ({ meta: [{ title: "Reports — Acadex" }] }),
  component: ReportsPage,
});

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function ReportsPage() {
  const db = useDB();
  const user = useSession()!;
  const inScope = (sid: string) => user.role === "super_admin" || sid === user.schoolId;
  const students = db.students.filter((s) => inScope(s.schoolId));
  const materials = db.materials.filter((m) => inScope(m.schoolId));
  const allTracking = db.tracking.filter((t) => inScope(t.schoolId));

  const [filter, setFilter] = useState<"all" | "pending" | "overdue" | "completed">("overdue");
  const [year, setYear] = useState<string>(String(currentAcademicYear()));
  const [term, setTerm] = useState<string>("all");
  const [month, setMonth] = useState<string>("all"); // 1-12 or "all"
  const [day, setDay] = useState<string>(""); // YYYY-MM-DD or ""

  const yearOptions = Array.from(new Set<number>([
    currentAcademicYear(),
    ...allTracking.map((t) => t.academicYear).filter((y): y is number => typeof y === "number"),
  ])).sort((a, b) => b - a);

  // Apply year/term/month/day filters against tracking.
  const tracking = allTracking.filter((t) => {
    if (year !== "all" && String(t.academicYear) !== year) return false;
    if (term !== "all" && t.term !== (term as Term)) return false;
    const updated = new Date(t.updatedAt);
    if (month !== "all" && updated.getMonth() + 1 !== Number(month)) return false;
    if (day) {
      const d = new Date(day);
      if (
        updated.getFullYear() !== d.getFullYear() ||
        updated.getMonth() !== d.getMonth() ||
        updated.getDate() !== d.getDate()
      ) return false;
    }
    return true;
  });

  const classes = Array.from(new Set(students.map((s) => s.className).filter(Boolean) as string[]));

  const missing = tracking.filter((t) => filter === "all" ? true : t.status === filter);

  const byClass = classes.map((c) => {
    const stuIds = students.filter((s) => s.className === c).map((s) => s.id);
    const rows = tracking.filter((t) => stuIds.includes(t.studentId));
    return {
      className: c,
      total: rows.length,
      completed: rows.filter((r) => r.status === "completed").length,
      pending: rows.filter((r) => r.status === "pending").length,
      overdue: rows.filter((r) => r.status === "overdue").length,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground">Filter materials brought by year, term, month, or day.</p>
      </div>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader><CardTitle className="text-base">Period filters</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div>
            <Label className="text-xs">Academic year</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All years</SelectItem>
                {yearOptions.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Term</Label>
            <Select value={term} onValueChange={setTerm}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All terms</SelectItem>
                <SelectItem value="T1">{TERM_LABEL.T1}</SelectItem>
                <SelectItem value="T2">{TERM_LABEL.T2}</SelectItem>
                <SelectItem value="T3">{TERM_LABEL.T3}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Month</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All months</SelectItem>
                {MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Specific day</Label>
            <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {byClass.map((c) => (
          <Card key={c.className} className="shadow-[var(--shadow-card)]">
            <CardHeader><CardTitle className="text-base">{c.className}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Brought</span><span className="font-semibold text-success">{c.completed}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Pending</span><span className="font-semibold text-warning">{c.pending}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Overdue</span><span className="font-semibold text-destructive">{c.overdue}</span></div>
            </CardContent>
          </Card>
        ))}
        {byClass.length === 0 && (
          <Card className="md:col-span-3"><CardContent className="p-6 text-center text-sm text-muted-foreground">No data for this period.</CardContent></Card>
        )}
      </div>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Detailed report</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="overdue">Overdue only</SelectItem>
                <SelectItem value="pending">Pending only</SelectItem>
                <SelectItem value="completed">Brought only</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={() => {
              const html = `<h1>Acadex report</h1><div class="meta">${year !== "all" ? year : "All years"} · ${term !== "all" ? TERM_LABEL[term as Term] : "All terms"} · ${filter}</div>` +
                `<table><thead><tr><th>Student</th><th>Class</th><th>Material</th><th>Period</th><th>Status</th><th>Promised</th></tr></thead><tbody>` +
                missing.map((t) => {
                  const s = students.find((x) => x.id === t.studentId);
                  const m = materials.find((x) => x.id === t.materialId);
                  if (!s || !m) return "";
                  return `<tr><td>${escapeHTML(s.name)}</td><td>${escapeHTML(s.className ?? "")}</td><td>${escapeHTML(m.name)}</td><td>${t.academicYear} · ${TERM_LABEL[t.term]}</td><td>${statusBadgeHTML(t.status)}</td><td>${t.promisedDate ? new Date(t.promisedDate).toLocaleDateString() : "—"}</td></tr>`;
                }).join("") + `</tbody></table>`;
              exportHTMLToPDF("Acadex report", html);
            }}><FileDown className="mr-1 h-3.5 w-3.5" />PDF</Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Year / Term</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Promised</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {missing.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">No records match these filters.</TableCell></TableRow>
              )}
              {missing.map((t) => {
                const s = students.find((x) => x.id === t.studentId);
                const m = materials.find((x) => x.id === t.materialId);
                if (!s || !m) return null;
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.className}</TableCell>
                    <TableCell>{m.name}</TableCell>
                    <TableCell className="text-muted-foreground">{t.academicYear} · {TERM_LABEL[t.term]}</TableCell>
                    <TableCell><StatusBadge status={t.status} /></TableCell>
                    <TableCell className="text-muted-foreground">{new Date(t.updatedAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-muted-foreground">{t.promisedDate ? new Date(t.promisedDate).toLocaleDateString() : "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
