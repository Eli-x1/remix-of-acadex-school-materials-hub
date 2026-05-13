import { createFileRoute, redirect } from "@tanstack/react-router";
import { useDB, useSession } from "@/hooks/use-acadex";
import { loadDB, saveDB, uid } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { Plus, Trash2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { getSession } from "@/lib/store";

export const Route = createFileRoute("/app/schools")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const u = getSession();
      if (!u || u.role !== "super_admin") throw redirect({ to: "/app/dashboard" });
    }
  },
  head: () => ({ meta: [{ title: "Schools — Acadex" }] }),
  component: SchoolsPage,
});

function SchoolsPage() {
  const db = useDB();
  const _ = useSession();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPass, setAdminPass] = useState("");

  function add() {
    if (!name || !adminEmail) return toast.error("Fill required fields");
    const next = loadDB();
    const emailLower = adminEmail.toLowerCase();
    const usernameLower = adminUsername.trim().toLowerCase();
    if (next.users.some((u) => u.email.toLowerCase() === emailLower)) return toast.error("Admin email already exists");
    if (usernameLower && next.users.some((u) => (u.username ?? "").toLowerCase() === usernameLower)) return toast.error("Username already taken");
    const sid = "sch_" + uid();
    next.schools.push({ id: sid, name, location, createdAt: new Date().toISOString() });
    next.users.push({ id: "u_" + uid(), name: adminName || "School Admin", email: adminEmail, username: adminUsername.trim() || undefined, password: adminPass || "school123", role: "school_admin", schoolId: sid });
    saveDB(next);
    setOpen(false); setName(""); setLocation(""); setAdminName(""); setAdminEmail(""); setAdminUsername(""); setAdminPass("");
    toast.success("School created");
  }

  function remove(id: string) {
    const next = loadDB();
    next.schools = next.schools.filter((s) => s.id !== id);
    next.users = next.users.filter((u) => u.schoolId !== id);
    next.classes = next.classes.filter((c) => c.schoolId !== id);
    next.students = next.students.filter((s) => s.schoolId !== id);
    next.materials = next.materials.filter((m) => m.schoolId !== id);
    next.tracking = next.tracking.filter((t) => t.schoolId !== id);
    saveDB(next);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Schools</h1>
          <p className="text-sm text-muted-foreground">Manage every school in your Acadex platform.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button variant="gradient"><Plus className="mr-2 h-4 w-4" /> Add School</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create new school</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>School name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><Label>Location</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} /></div>
              <div className="border-t pt-3"><Label className="text-xs uppercase tracking-wide text-muted-foreground">Assign School Admin</Label></div>
              <div><Label>Admin name</Label><Input value={adminName} onChange={(e) => setAdminName(e.target.value)} /></div>
              <div><Label>Admin email</Label><Input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} /></div>
              <div><Label>Admin username (optional)</Label><Input value={adminUsername} onChange={(e) => setAdminUsername(e.target.value)} placeholder="for sign-in" /></div>
              <div><Label>Temporary password</Label><Input value={adminPass} onChange={(e) => setAdminPass(e.target.value)} placeholder="school123" /></div>
            </div>
            <DialogFooter><Button onClick={add} variant="gradient">Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4" /> All schools</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Location</TableHead><TableHead>Students</TableHead><TableHead>Staff</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {db.schools.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.location || "—"}</TableCell>
                  <TableCell>{db.students.filter((x) => x.schoolId === s.id).length}</TableCell>
                  <TableCell>{db.users.filter((x) => x.schoolId === s.id).length}</TableCell>
                  <TableCell><Button size="icon" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
