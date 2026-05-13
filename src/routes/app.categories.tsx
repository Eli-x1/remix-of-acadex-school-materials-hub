import { createFileRoute, redirect } from "@tanstack/react-router";
import { useDB, useSession } from "@/hooks/use-acadex";
import { loadDB, saveDB, uid, getSession, type StaffRole } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useState } from "react";
import { Plus, Trash2, Pencil, Tag } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/categories")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const u = getSession();
      if (!u) throw redirect({ to: "/login" });
      if (u.role !== "school_admin" && u.role !== "super_admin")
        throw redirect({ to: "/app/dashboard" });
    }
  },
  head: () => ({ meta: [{ title: "Staff Roles — Acadex" }] }),
  component: StaffRolesPage,
});

function StaffRolesPage() {
  const db = useDB();
  const user = useSession()!;
  const schoolId = user.schoolId ?? db.schools[0]?.id;

  const roles = db.staffRoles.filter((r) => user.role === "super_admin" || r.schoolId === user.schoolId);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StaffRole | null>(null);
  const [name, setName] = useState("");

  function openCreate() { setEditing(null); setName(""); setOpen(true); }
  function openEdit(r: StaffRole) { setEditing(r); setName(r.name); setOpen(true); }

  function save() {
    if (!name.trim()) return toast.error("Enter a role name");
    if (!schoolId) return toast.error("No school context");
    const next = loadDB();
    const trimmed = name.trim();
    if (editing) {
      const r = next.staffRoles.find((x) => x.id === editing.id);
      if (!r) return;
      r.name = trimmed;
      saveDB(next);
      toast.success("Role updated");
    } else {
      const dup = next.staffRoles.find((r) => r.schoolId === schoolId && r.name.toLowerCase() === trimmed.toLowerCase());
      if (dup) return toast.error("A role with that name already exists");
      next.staffRoles.push({ id: "sr_" + uid(), schoolId: schoolId!, name: trimmed, createdAt: new Date().toISOString() });
      saveDB(next);
      toast.success("Role created");
    }
    setOpen(false);
  }

  function remove(r: StaffRole) {
    const db2 = loadDB();
    const usedByStaff = db2.users.some((u) => u.staffRoleId === r.id);
    if (usedByStaff) return toast.error("Cannot delete: staff members are assigned to this role");
    db2.staffRoles = db2.staffRoles.filter((x) => x.id !== r.id);
    saveDB(db2);
    toast.success("Role deleted");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Staff Roles</h1>
          <p className="text-sm text-muted-foreground">
            Define the roles staff members can hold (e.g. Finance, Logistics, Dean). Assign one of these when adding a staff member.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="gradient" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Add Role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit role" : "Add role"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Role name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Finance, Logistics, Dean" />
              </div>
            </div>
            <DialogFooter><Button onClick={save} variant="gradient">Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Tag className="h-4 w-4" /> All roles</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Staff members</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-8">
                  No roles yet. Create one to start adding staff.
                </TableCell></TableRow>
              )}
              {roles.map((r) => {
                const count = db.users.filter((u) => u.staffRoleId === r.id).length;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{count}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                          <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(r)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
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
