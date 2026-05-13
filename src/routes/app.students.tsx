import { createFileRoute } from "@tanstack/react-router";
import { useDB, useSession } from "@/hooks/use-acadex";
import { loadDB, saveDB, uid, hasPermission, classDisplayName, currentAcademicYear, currentTerm, logAudit } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useMemo, useState } from "react";
import { Plus, Trash2, Eye, Pencil } from "lucide-react";
import { StatusBadge } from "./app.dashboard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/app/students")({
  head: () => ({ meta: [{ title: "Students — Acadex" }] }),
  component: StudentsPage,
});

function StudentsPage() {
  const db = useDB();
  const user = useSession()!;
  const canEdit = hasPermission(user, "manage_students");
  const schoolId = user.schoolId ?? db.schools[0]?.id;
  const classes = useMemo(
    () => db.classes.filter((c) => user.role === "super_admin" || c.schoolId === user.schoolId),
    [db.classes, user]
  );
  const materials = db.materials.filter((m) => m.schoolId === schoolId);

  const [filterClass, setFilterClass] = useState<string>("all");
  const students = db.students
    .filter((s) => user.role === "super_admin" || s.schoolId === user.schoolId)
    .filter((s) => filterClass === "all" || s.classId === filterClass);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [classId, setClassId] = useState<string>("");
  const [parentPhone, setParentPhone] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [viewStudent, setViewStudent] = useState<string | null>(null);

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Photo must be under 2MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setPhoto(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  function resetForm() {
    setEditingId(null); setName(""); setClassId(""); setParentPhone(""); setPhoto(null);
  }

  function openCreate() {
    resetForm(); setOpen(true);
  }

  function openEdit(id: string) {
    const s = db.students.find((x) => x.id === id);
    if (!s) return;
    setEditingId(id);
    setName(s.name);
    setClassId(s.classId);
    setParentPhone(s.parentPhone || "");
    setPhoto(s.photo ?? null);
    setOpen(true);
  }

  function saveStudent() {
    if (!name.trim()) return toast.error("Enter the student name");
    if (!classId) return toast.error("Select a class");
    if (!parentPhone.trim() || parentPhone.trim().length < 7) return toast.error("Enter a valid parent phone number");
    const next = loadDB();
    const cls = next.classes.find((c) => c.id === classId);
    if (!cls) return toast.error("Class not found");

    if (editingId) {
      const s = next.students.find((x) => x.id === editingId);
      if (!s) return;
      s.name = name.trim();
      s.classId = classId;
      s.className = classDisplayName(cls);
      s.parentPhone = parentPhone.trim();
      s.photo = photo;
      saveDB(next);
      logAudit("student.update", name.trim());
      setOpen(false); resetForm();
      toast.success("Student updated");
      return;
    }

    const newId = "st_" + uid();
    next.students.push({
      id: newId,
      schoolId: cls.schoolId,
      name: name.trim(),
      classId,
      className: classDisplayName(cls),
      parentPhone: parentPhone.trim(),
      photo: photo,
    });
    materials.filter((m) => m.schoolId === cls.schoolId).forEach((m) => next.tracking.push({
      id: "tr_" + uid(), schoolId: cls.schoolId, studentId: newId,
      materialId: m.id, status: "pending", promisedDate: null, updatedAt: new Date().toISOString(),
      academicYear: currentAcademicYear(), term: currentTerm(),
    }));
    saveDB(next);
    logAudit("student.create", name.trim());
    setOpen(false); resetForm();
    toast.success("Student added");
  }

  function removeStudent(id: string) {
    const next = loadDB();
    const stu = next.students.find((s) => s.id === id);
    next.students = next.students.filter((s) => s.id !== id);
    next.tracking = next.tracking.filter((t) => t.studentId !== id);
    saveDB(next);
    if (stu) logAudit("student.delete", stu.name);
  }



  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Students</h1>
          <p className="text-sm text-muted-foreground">Manage students grouped by their classes.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filter by class" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>{classDisplayName(c)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canEdit && (
            <Button variant="gradient" onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Add Student</Button>
          )}
        </div>
      </div>

      {canEdit && (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingId ? "Edit student" : "Add new student"}</DialogTitle></DialogHeader>
            {classes.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                You need to create a class first. <Link to="/app/classes" className="text-primary underline">Go to Classes</Link>.
              </div>
            ) : (
              <div className="space-y-3">
                <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div>
                  <Label>Class</Label>
                  <Select value={classId} onValueChange={setClassId}>
                    <SelectTrigger><SelectValue placeholder="Select class (e.g. S1, L5 CSA)" /></SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{classDisplayName(c)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Parent phone</Label>
                  <Input type="tel" placeholder="e.g. +250 7XX XXX XXX" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} />
                </div>
                <div>
                  <Label>Photo (optional)</Label>
                  <Input type="file" accept="image/*" onChange={onPhotoChange} />
                  {photo && (
                    <div className="mt-2 flex items-center gap-2">
                      <img src={photo} alt="Student preview" className="h-20 w-20 rounded-full object-cover border border-border" />
                      <Button type="button" size="sm" variant="outline" onClick={() => setPhoto(null)}>Remove photo</Button>
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter><Button onClick={saveStudent} variant="gradient" disabled={classes.length === 0}>{editingId ? "Save changes" : "Save"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader><CardTitle className="text-base">All students ({students.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Materials summary</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">No students yet.</TableCell></TableRow>
              )}
              {students.map((s) => {
                const cls = db.classes.find((c) => c.id === s.classId);
                const studentTracking = db.tracking.filter((t) => t.studentId === s.id);
                const done = studentTracking.filter((t) => t.status === "completed").length;
                const total = studentTracking.length;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {s.photo ? (
                          <img src={s.photo} alt={s.name} className="h-8 w-8 rounded-full object-cover border border-border" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <Link to="/app/students/$studentId" params={{ studentId: s.id }} className="hover:text-primary hover:underline">{s.name}</Link>
                          {s.parentPhone && <div className="text-xs text-muted-foreground">{s.parentPhone}</div>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{cls ? classDisplayName(cls) : (s.className || "—")}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{done} / {total} completed</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Link to="/app/students/$studentId" params={{ studentId: s.id }}>
                          <Button size="sm" variant="outline">
                            <Eye className="mr-1 h-3.5 w-3.5" /> View
                          </Button>
                        </Link>
                        {canEdit && (
                          <>
                            <Button size="icon" variant="ghost" onClick={() => openEdit(s.id)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => removeStudent(s.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <StudentDetailDialog studentId={viewStudent} onClose={() => setViewStudent(null)} />
    </div>
  );
}

function StudentDetailDialog({ studentId, onClose }: { studentId: string | null; onClose: () => void }) {
  const db = useDB();
  const student = studentId ? db.students.find((s) => s.id === studentId) : null;
  const cls = student ? db.classes.find((c) => c.id === student.classId) : null;
  const rows = student
    ? db.materials.filter((m) => m.schoolId === student.schoolId).map((m) => {
        const t = db.tracking.find((x) => x.studentId === student.id && x.materialId === m.id);
        return { material: m, tracking: t };
      })
    : [];
  return (
    <Dialog open={!!studentId} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{student?.name} — Materials</DialogTitle>
        </DialogHeader>
        {student && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {student.photo ? (
                <img src={student.photo} alt={student.name} className="h-16 w-16 rounded-full object-cover border border-border" />
              ) : (
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-lg text-muted-foreground">
                  {student.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="text-sm space-y-1">
                <div className="text-muted-foreground">Class: <span className="font-medium text-foreground">{cls ? classDisplayName(cls) : (student.className || "—")}</span></div>
                <div className="text-muted-foreground">Parent phone: <span className="font-medium text-foreground">{student.parentPhone || "—"}</span></div>
              </div>
            </div>
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Checked by</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Promised date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">No materials defined.</TableCell></TableRow>
                  )}
                  {rows.map(({ material, tracking }) => {
                    const staffNames = material.assignedStaffIds.map((sid) => {
                      const u = db.users.find((x) => x.id === sid);
                      if (!u) return null;
                      const r = db.staffRoles.find((rr) => rr.id === u.staffRoleId);
                      return r ? `${u.name} (${r.name})` : u.name;
                    }).filter(Boolean) as string[];
                    return (
                    <TableRow key={material.id}>
                      <TableCell className="font-medium">{material.name}</TableCell>
                      <TableCell>{staffNames.length ? staffNames.join(", ") : "—"}</TableCell>
                      <TableCell><StatusBadge status={tracking?.status ?? "pending"} /></TableCell>
                      <TableCell>{tracking?.promisedDate ? new Date(tracking.promisedDate).toLocaleDateString() : "—"}</TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
