import { createFileRoute, redirect } from "@tanstack/react-router";
import { useDB, useSession } from "@/hooks/use-acadex";
import { loadDB, saveDB, uid } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
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
import { hydrateFromCloud } from "@/lib/store";
import { createClient } from "@supabase/supabase-js";

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
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!name || !adminEmail || !adminPass) return toast.error("Fill required fields (name, admin email, password)");
    if (adminPass.length < 6) return toast.error("Password must be at least 6 characters");
    setBusy(true);
    try {
      const sid = uid();
      const { error: schoolErr } = await supabase.from("schools").insert({
        id: sid, name, location: location || "",
      });
      if (schoolErr) throw new Error(schoolErr.message);

      // Create the auth user via a fresh client (no session persistence)
      // so the current super_admin session is not affected.
      const url = import.meta.env.VITE_SUPABASE_URL as string;
      const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
      const tmp = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } });
      const finalUsername = (adminUsername.trim() || adminEmail.split("@")[0]).toLowerCase();
      const { data: signed, error: signErr } = await tmp.auth.signUp({
        email: adminEmail,
        password: adminPass,
        options: { data: { name: adminName || "School Admin", username: finalUsername } },
      });
      if (signErr || !signed.user) throw new Error(signErr?.message ?? "Failed to create admin user");
      const newId = signed.user.id;

      // The handle_new_user trigger created a profile + 'staff' role.
      // As super_admin, attach school + switch role to school_admin.
      const { error: pErr } = await supabase.from("profiles").update({
        school_id: sid,
        name: adminName || "School Admin",
        username: finalUsername,
      }).eq("id", newId);
      if (pErr) throw new Error(pErr.message);

      await supabase.from("user_roles").delete().eq("user_id", newId);
      const { error: rErr } = await supabase.from("user_roles").insert({ user_id: newId, role: "school_admin" });
      if (rErr) throw new Error(rErr.message);

      await hydrateFromCloud();
      setOpen(false); setName(""); setLocation(""); setAdminName(""); setAdminEmail(""); setAdminUsername(""); setAdminPass("");
      toast.success("School and admin created");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create school");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string, schoolName: string) {
    if (!window.confirm(`Delete school "${schoolName}"? This will remove all its classes, students, materials, and tracking. This cannot be undone.`)) return;
    try {
      // Detach school admins/staff so their accounts survive
      await supabase.from("profiles").update({ school_id: null, staff_role_id: null }).eq("school_id", id);
      await supabase.from("tracking").delete().eq("school_id", id);
      await supabase.from("students").delete().eq("school_id", id);
      await supabase.from("materials").delete().eq("school_id", id);
      await supabase.from("school_classes").delete().eq("school_id", id);
      await supabase.from("staff_roles").delete().eq("school_id", id);
      await supabase.from("term_archives").delete().eq("school_id", id);
      const { error } = await supabase.from("schools").delete().eq("id", id);
      if (error) throw new Error(error.message);
      await hydrateFromCloud();
      toast.success("School deleted");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete");
    }
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
            <DialogFooter><Button onClick={add} disabled={busy} variant="gradient">{busy ? "Creating..." : "Create"}</Button></DialogFooter>
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
                  <TableCell><Button size="icon" variant="ghost" onClick={() => remove(s.id, s.name)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
