import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { getSession, loadDB, saveDB, uid, classDisplayName, currentAcademicYear, currentTerm, logAudit, type ClassLevel } from "@/lib/store";
import { useDB, useSession } from "@/hooks/use-acadex";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { Upload, Download, Users, GraduationCap, Package } from "lucide-react";
import { parseCSV, downloadFile } from "@/lib/csv";
import { toast } from "sonner";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/app/import")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const u = getSession();
      if (!u || u.role === "staff") throw redirect({ to: "/app/dashboard" });
    }
  },
  head: () => ({ meta: [{ title: "Bulk import — Acadex" }] }),
  component: ImportPage,
});

const LEVELS: ClassLevel[] = ["L3", "L4", "L5", "S1", "S2", "S3", "S4", "S5"];

function ImportPage() {
  const db = useDB();
  const user = useSession()!;
  const { t } = useLang();
  const schoolId = user.schoolId ?? db.schools[0]?.id;

  if (!schoolId) {
    return <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No school selected. <Link to="/app/schools" className="text-primary underline">Create a school first</Link>.</CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("bulk_import")}</h1>
        <p className="text-sm text-muted-foreground">Upload CSV files to add many students, classes, or materials at once.</p>
      </div>

      <Tabs defaultValue="students">
        <TabsList>
          <TabsTrigger value="students"><Users className="mr-2 h-4 w-4" />{t("students")}</TabsTrigger>
          <TabsTrigger value="classes"><GraduationCap className="mr-2 h-4 w-4" />{t("classes")}</TabsTrigger>
          <TabsTrigger value="materials"><Package className="mr-2 h-4 w-4" />{t("materials")}</TabsTrigger>
        </TabsList>

        <TabsContent value="classes">
          <ImportPanel
            title={t("classes")}
            template={[["level", "trade", "abbreviation"], ["S1", "", ""], ["L4", "Computer Science Alt.", "CSA"]]}
            help="Columns: level (L3-L5 or S1-S5), trade (optional, for L levels), abbreviation (optional, e.g. CSA)"
            onImport={(rows) => importClasses(rows, schoolId)}
          />
        </TabsContent>

        <TabsContent value="materials">
          <ImportPanel
            title={t("materials")}
            template={[["name"], ["Mathematics textbook"], ["Notebooks pack"]]}
            help="Columns: name"
            onImport={(rows) => importMaterials(rows, schoolId)}
          />
        </TabsContent>

        <TabsContent value="students">
          <ImportPanel
            title={t("students")}
            template={[["name", "class", "parent_phone"], ["Jane Doe", "S1", "+250788000000"], ["John Smith", "L4 CSA", "+250788111222"]]}
            help={`Columns: name, class (e.g. "S1" or "L4 CSA"), parent_phone. Existing classes only.`}
            onImport={(rows) => importStudents(rows, schoolId)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ImportPanel({ title, template, help, onImport }: { title: string; template: string[][]; help: string; onImport: (rows: Record<string, string>[]) => { ok: number; errors: string[] } }) {
  const [text, setText] = useState("");
  const [report, setReport] = useState<{ ok: number; errors: string[] } | null>(null);

  function downloadTemplate() {
    const csv = template.map((r) => r.map((v) => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v).join(",")).join("\n");
    downloadFile(`${title.toLowerCase()}-template.csv`, csv);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => setText(typeof r.result === "string" ? r.result : "");
    r.readAsText(f);
  }

  function run() {
    const grid = parseCSV(text);
    if (grid.length < 2) return toast.error("Empty file");
    const header = grid[0].map((h) => h.trim().toLowerCase());
    const rows = grid.slice(1).map((r) => {
      const obj: Record<string, string> = {};
      header.forEach((h, i) => { obj[h] = (r[i] ?? "").trim(); });
      return obj;
    });
    const res = onImport(rows);
    setReport(res);
    if (res.ok > 0) toast.success(`Imported ${res.ok} rows`);
    if (res.errors.length) toast.error(`${res.errors.length} rows skipped`);
  }

  return (
    <Card className="mt-4 shadow-[var(--shadow-card)]">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>Import {title}</span>
          <Button variant="outline" size="sm" onClick={downloadTemplate}><Download className="mr-2 h-3 w-3" />Template</Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">{help}</p>
        <Input type="file" accept=".csv,text/csv" onChange={onFile} />
        <Textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder="...or paste CSV here" />
        <Button onClick={run} variant="gradient"><Upload className="mr-2 h-4 w-4" />Import</Button>
        {report && (
          <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
            <div className="font-medium">Imported {report.ok} rows{report.errors.length ? `, ${report.errors.length} skipped:` : ""}</div>
            {report.errors.slice(0, 20).map((e, i) => <div key={i} className="text-destructive">• {e}</div>)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={"flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm " + (props.className ?? "")} />;
}

function importClasses(rows: Record<string, string>[], schoolId: string) {
  const db = loadDB();
  let ok = 0; const errors: string[] = [];
  rows.forEach((r, i) => {
    const level = r.level?.toUpperCase() as ClassLevel;
    if (!LEVELS.includes(level)) { errors.push(`Row ${i + 2}: invalid level "${r.level}"`); return; }
    const trade = r.trade || null;
    const abbr = r.abbreviation || null;
    db.classes.push({ id: "cls_" + uid(), schoolId, level, trade, abbreviation: abbr, createdAt: new Date().toISOString() });
    ok++;
  });
  saveDB(db); logAudit("classes.bulk_import", `${ok} rows`);
  return { ok, errors };
}

function importMaterials(rows: Record<string, string>[], schoolId: string) {
  const db = loadDB();
  let ok = 0; const errors: string[] = [];
  rows.forEach((r, i) => {
    const name = r.name?.trim();
    if (!name) { errors.push(`Row ${i + 2}: missing name`); return; }
    db.materials.push({ id: "m_" + uid(), schoolId, name, assignedStaffIds: [] });
    ok++;
  });
  saveDB(db); logAudit("materials.bulk_import", `${ok} rows`);
  return { ok, errors };
}

function importStudents(rows: Record<string, string>[], schoolId: string) {
  const db = loadDB();
  let ok = 0; const errors: string[] = [];
  const classMatch = (label: string) => {
    const norm = label.trim().toLowerCase();
    return db.classes.find((c) => c.schoolId === schoolId && classDisplayName(c).toLowerCase() === norm);
  };
  rows.forEach((r, i) => {
    const name = r.name?.trim();
    const classLabel = r.class?.trim() ?? "";
    const phone = (r.parent_phone || r.phone || "").trim();
    if (!name) { errors.push(`Row ${i + 2}: missing name`); return; }
    const cls = classMatch(classLabel);
    if (!cls) { errors.push(`Row ${i + 2}: class "${classLabel}" not found`); return; }
    if (!phone || phone.length < 7) { errors.push(`Row ${i + 2}: invalid parent phone`); return; }
    const sid = "st_" + uid();
    db.students.push({ id: sid, schoolId, name, classId: cls.id, className: classDisplayName(cls), parentPhone: phone, photo: null });
    db.materials.filter((m) => m.schoolId === schoolId).forEach((m) =>
      db.tracking.push({ id: "tr_" + uid(), schoolId, studentId: sid, materialId: m.id, status: "pending", promisedDate: null, updatedAt: new Date().toISOString(), academicYear: currentAcademicYear(), term: currentTerm() })
    );
    ok++;
  });
  saveDB(db); logAudit("students.bulk_import", `${ok} rows`);
  return { ok, errors };
}
