import { createFileRoute } from "@tanstack/react-router";
import { useDB, useSession } from "@/hooks/use-acadex";
import { loadDB, saveDB, uid, hasPermission, currentAcademicYear, currentTerm } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useState } from "react";
import { Plus, Trash2, Package, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/app/materials")({
  head: () => ({ meta: [{ title: "Materials — Acadex" }] }),
  component: MaterialsPage,
});

function MaterialsPage() {
  const db = useDB();
  const user = useSession()!;
  const canEdit = hasPermission(user, "manage_materials");
  const materials = db.materials.filter((m) => user.role === "super_admin" || m.schoolId === user.schoolId);

  const staffList = db.users.filter((u) =>
    u.role === "staff" && (user.role === "super_admin" || u.schoolId === user.schoolId)
  );

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [assignedStaffIds, setAssignedStaffIds] = useState<string[]>([]);

  function resetForm() {
    setName(""); setAssignedStaffIds([]); setEditingId(null);
  }

  function openCreate() {
    resetForm(); setOpen(true);
  }

  function openEdit(id: string) {
    const m = materials.find((x) => x.id === id);
    if (!m) return;
    setEditingId(id);
    setName(m.name);
    setAssignedStaffIds([...m.assignedStaffIds]);
    setOpen(true);
  }

  function toggleStaff(id: string, checked: boolean) {
    setAssignedStaffIds((prev) => checked ? [...new Set([...prev, id])] : prev.filter((x) => x !== id));
  }

  function save() {
    if (!name.trim()) return toast.error("Enter material name");
    if (assignedStaffIds.length === 0) return toast.error("Select at least one staff who will check this material");
    const next = loadDB();

    if (editingId) {
      const m = next.materials.find((x) => x.id === editingId);
      if (!m) return;
      m.name = name.trim();
      m.assignedStaffIds = [...assignedStaffIds];
      saveDB(next);
      setOpen(false); resetForm();
      toast.success("Material updated");
      return;
    }

    // create
    const firstStaff = next.users.find((u) => u.id === assignedStaffIds[0]);
    if (!firstStaff || !firstStaff.schoolId) return toast.error("Staff not found");
    const schoolId = firstStaff.schoolId;
    const id = "m_" + uid();
    next.materials.push({ id, schoolId, name: name.trim(), assignedStaffIds: [...assignedStaffIds] });
    next.students.filter((s) => s.schoolId === schoolId).forEach((s) => {
      next.tracking.push({
        id: "tr_" + uid(),
        schoolId,
        studentId: s.id,
        materialId: id,
        status: "pending",
        promisedDate: null,
        updatedAt: new Date().toISOString(),
        academicYear: currentAcademicYear(),
        term: currentTerm(),
      });
    });
    saveDB(next);
    setOpen(false); resetForm();
    toast.success("Material added");
  }

  function remove(id: string) {
    const next = loadDB();
    next.materials = next.materials.filter((m) => m.id !== id);
    next.tracking = next.tracking.filter((t) => t.materialId !== id);
    saveDB(next);
  }

  function staffLabel(id: string): string {
    const u = db.users.find((x) => x.id === id);
    if (!u) return "—";
    const r = db.staffRoles.find((r) => r.id === u.staffRoleId);
    return r ? `${u.name} (${r.name})` : u.name;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Materials</h1>
          <p className="text-sm text-muted-foreground">Define what each student is required to bring or pay, and who checks it.</p>
        </div>
        {canEdit && (
          <Button variant="gradient" onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Add Material</Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Edit material" : "Add material"}</DialogTitle></DialogHeader>
          {staffList.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No staff members yet. <Link to="/app/settings" className="text-primary underline">Add a staff member</Link> first so you can assign who checks this material.
            </div>
          ) : (
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mosquito Net" /></div>
              <div>
                <Label>Checked by (one or more staff)</Label>
                <div className="mt-2 max-h-56 overflow-auto rounded-md border border-border divide-y divide-border">
                  {staffList.map((s) => {
                    const r = db.staffRoles.find((rr) => rr.id === s.staffRoleId);
                    const checked = assignedStaffIds.includes(s.id);
                    return (
                      <label key={s.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/40">
                        <Checkbox checked={checked} onCheckedChange={(v) => toggleStaff(s.id, !!v)} />
                        <span className="text-sm">{s.name}{r ? <span className="text-muted-foreground"> — {r.name}</span> : null}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Each selected staff will see this material in their Tracking page.</p>
              </div>
            </div>
          )}
          <DialogFooter><Button onClick={save} variant="gradient" disabled={staffList.length === 0}>{editingId ? "Save changes" : "Save"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" /> All materials</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Checked by</TableHead><TableHead>Tracked rows</TableHead>{canEdit && <TableHead className="text-right">Actions</TableHead>}</TableRow></TableHeader>
            <TableBody>
              {materials.length === 0 && (
                <TableRow><TableCell colSpan={canEdit ? 4 : 3} className="text-center text-sm text-muted-foreground py-8">No materials yet.</TableCell></TableRow>
              )}
              {materials.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {m.assignedStaffIds.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                      {m.assignedStaffIds.map((sid) => (
                        <Badge key={sid} variant="secondary">{staffLabel(sid)}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{db.tracking.filter((t) => t.materialId === m.id).length}</TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(m.id)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
