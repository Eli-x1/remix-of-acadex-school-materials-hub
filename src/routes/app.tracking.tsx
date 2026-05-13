import { createFileRoute, redirect } from "@tanstack/react-router";
import { useDB, useSession } from "@/hooks/use-acadex";
import { loadDB, saveDB, getSession, classDisplayName, currentAcademicYear, currentTerm, TERM_LABEL, logAudit, type TrackingStatus, type Term } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { ClipboardCheck, CheckCircle2, XCircle, Clock } from "lucide-react";
import { StatusBadge } from "./app.dashboard";
import { toast } from "sonner";

export const Route = createFileRoute("/app/tracking")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const u = getSession();
      if (!u) throw redirect({ to: "/login" });
    }
  },
  head: () => ({ meta: [{ title: "Tracking — Acadex" }] }),
  component: TrackingPage,
});

function TrackingPage() {
  const db = useDB();
  const user = useSession()!;

  const schoolFilter = (id: string | undefined) =>
    user.role === "super_admin" ? true : id === user.schoolId;

  // Materials this user can check:
  // - super_admin / school_admin: all in scope
  // - staff: only those assigned to them
  const myMaterials = db.materials
    .filter((m) => schoolFilter(m.schoolId))
    .filter((m) => user.role === "super_admin" || user.role === "school_admin" ? true : m.assignedStaffIds.includes(user.id));

  const [materialId, setMaterialId] = useState<string>("");
  const activeMaterial = myMaterials.find((m) => m.id === materialId) ?? myMaterials[0];

  const [year, setYear] = useState<number>(currentAcademicYear());
  const [term, setTerm] = useState<Term>(currentTerm());

  // Years available across existing tracking + current year.
  const yearOptions = Array.from(new Set<number>([
    currentAcademicYear(),
    ...db.tracking.map((t) => t.academicYear).filter((y): y is number => typeof y === "number"),
  ])).sort((a, b) => b - a);

  const classes = db.classes.filter((c) => schoolFilter(c.schoolId));
  const [classFilter, setClassFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const students = db.students
    .filter((s) => schoolFilter(s.schoolId))
    .filter((s) => !activeMaterial || s.schoolId === activeMaterial.schoolId)
    .filter((s) => classFilter === "all" || s.classId === classFilter)
    .filter((s) => !search.trim() || s.name.toLowerCase().includes(search.toLowerCase()));

  function findEntry(studentId: string, mid: string) {
    return db.tracking.find((x) => x.studentId === studentId && x.materialId === mid && x.academicYear === year && x.term === term);
  }

  function setStatus(studentId: string, status: TrackingStatus, promisedDate?: string | null) {
    if (!activeMaterial) return;
    const next = loadDB();
    let t = next.tracking.find((x) => x.studentId === studentId && x.materialId === activeMaterial.id && x.academicYear === year && x.term === term);
    if (!t) {
      const created = {
        id: "tr_" + Math.random().toString(36).slice(2, 10),
        schoolId: activeMaterial.schoolId,
        studentId,
        materialId: activeMaterial.id,
        status,
        promisedDate: promisedDate ?? null,
        updatedAt: new Date().toISOString(),
        academicYear: year,
        term,
      };
      next.tracking.push(created);
    } else {
      t.status = status;
      if (promisedDate !== undefined) t.promisedDate = promisedDate;
      if (status === "completed") t.promisedDate = null;
      t.updatedAt = new Date().toISOString();
    }
    saveDB(next);
    const stuName = next.students.find((s) => s.id === studentId)?.name ?? studentId;
    logAudit("tracking.update", `${stuName} · ${activeMaterial.name}`, status);
  }

  function recordPromise(studentId: string, dateStr: string) {
    if (!dateStr) return toast.error("Pick a promised date");
    setStatus(studentId, "pending", dateStr);
    toast.success("Promised date saved");
  }

  if (myMaterials.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Material tracking</h1>
          <p className="text-sm text-muted-foreground">Check students for the materials you are responsible for.</p>
        </div>
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
          No materials are assigned to you yet.
        </CardContent></Card>
      </div>
    );
  }

  const counts = {
    completed: students.filter((s) => findEntry(s.id, activeMaterial?.id ?? "")?.status === "completed").length,
    pending: students.filter((s) => {
      const t = findEntry(s.id, activeMaterial?.id ?? "");
      return !t || t.status === "pending";
    }).length,
    overdue: students.filter((s) => findEntry(s.id, activeMaterial?.id ?? "")?.status === "overdue").length,
  };

  function staffLabel(id: string): string {
    const u = db.users.find((x) => x.id === id);
    if (!u) return "—";
    const r = db.staffRoles.find((r) => r.id === u.staffRoleId);
    return r ? `${u.name} (${r.name})` : u.name;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Material tracking</h1>
        <p className="text-sm text-muted-foreground">
          Check whether each student has brought the material you are responsible for, mark it not brought, or record a promised date.
        </p>
      </div>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><ClipboardCheck className="h-4 w-4" /> Select material & period</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <Select value={activeMaterial?.id ?? ""} onValueChange={setMaterialId}>
            <SelectTrigger><SelectValue placeholder="Choose material" /></SelectTrigger>
            <SelectContent>
              {myMaterials.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger><SelectValue placeholder="Academic year" /></SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={term} onValueChange={(v) => setTerm(v as Term)}>
            <SelectTrigger><SelectValue placeholder="Term" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="T1">{TERM_LABEL.T1}</SelectItem>
              <SelectItem value="T2">{TERM_LABEL.T2}</SelectItem>
              <SelectItem value="T3">{TERM_LABEL.T3}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger><SelectValue placeholder="Filter by class" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {classes.map((c) => <SelectItem key={c.id} value={c.id}>{classDisplayName(c)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Search student..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </CardContent>
      </Card>

      {activeMaterial && (
        <div className="grid gap-3 md:grid-cols-3">
          <StatCard label="Brought" value={counts.completed} icon={<CheckCircle2 className="h-5 w-5 text-success" />} tone="text-success" />
          <StatCard label="Not brought / pending" value={counts.pending} icon={<Clock className="h-5 w-5 text-warning" />} tone="text-warning" />
          <StatCard label="Overdue" value={counts.overdue} icon={<XCircle className="h-5 w-5 text-destructive" />} tone="text-destructive" />
        </div>
      )}

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="text-base">
            {activeMaterial ? (
              <div className="flex flex-wrap items-center gap-2">
                <span>Checking: <span className="text-primary">{activeMaterial.name}</span></span>
                <Badge variant="outline">{year} · {TERM_LABEL[term]}</Badge>
                {activeMaterial.assignedStaffIds.map((sid) => (
                  <Badge key={sid} variant="secondary">{staffLabel(sid)}</Badge>
                ))}
              </div>
            ) : "Students"}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Promised date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">No students.</TableCell></TableRow>
              )}
              {students.map((s) => {
                const cls = db.classes.find((c) => c.id === s.classId);
                const t = activeMaterial ? findEntry(s.id, activeMaterial.id) : undefined;
                const status: TrackingStatus = t?.status ?? "pending";
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{cls ? classDisplayName(cls) : (s.className || "—")}</TableCell>
                    <TableCell><StatusBadge status={status} /></TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        className="h-8 w-[160px]"
                        value={t?.promisedDate ? t.promisedDate.slice(0, 10) : ""}
                        onChange={(e) => recordPromise(s.id, e.target.value)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-2">
                        <Button size="sm" variant={status === "completed" ? "gradient" : "outline"} onClick={() => setStatus(s.id, "completed", null)}>
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Brought
                        </Button>
                        <Button size="sm" variant={status === "pending" ? "secondary" : "outline"} onClick={() => setStatus(s.id, "pending")}>
                          Not brought
                        </Button>
                        <Button size="sm" variant={status === "overdue" ? "destructive" : "outline"} onClick={() => setStatus(s.id, "overdue")}>
                          Overdue
                        </Button>
                      </div>
                    </TableCell>
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

function StatCard({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: string }) {
  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className={`mt-1 text-3xl font-bold ${tone}`}>{value}</div>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">{icon}</div>
      </CardContent>
    </Card>
  );
}
