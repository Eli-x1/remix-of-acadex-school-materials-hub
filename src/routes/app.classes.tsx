import { createFileRoute } from "@tanstack/react-router";
import { useDB, useSession } from "@/hooks/use-acadex";
import { loadDB, saveDB, uid, hasPermission, classDisplayName, type ClassLevel } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useMemo, useState } from "react";
import { Plus, Trash2, GraduationCap } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/classes")({
  head: () => ({ meta: [{ title: "Classes — Acadex" }] }),
  component: ClassesPage,
});

const LEVELS: ClassLevel[] = ["L3", "L4", "L5", "S1", "S2", "S3", "S4", "S5"];

function ClassesPage() {
  const db = useDB();
  const user = useSession()!;
  const canEdit = hasPermission(user, "manage_classes");
  const schoolId = user.schoolId ?? db.schools[0]?.id;
  const classes = useMemo(
    () => db.classes.filter((c) => user.role === "super_admin" || c.schoolId === user.schoolId),
    [db.classes, user]
  );

  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<ClassLevel>("L3");
  const [trade, setTrade] = useState("");
  const [abbr, setAbbr] = useState("");

  const isLevelL = level.startsWith("L");

  function addClass() {
    if (!schoolId) return toast.error("Create a school first");
    if (isLevelL && (!trade.trim() || !abbr.trim())) return toast.error("L-classes require trade name and abbreviation");
    const next = loadDB();
    // prevent duplicates
    const dupe = next.classes.find((c) =>
      c.schoolId === schoolId &&
      c.level === level &&
      (c.abbreviation ?? "").toLowerCase() === (isLevelL ? abbr.trim().toLowerCase() : "")
    );
    if (dupe) return toast.error("This class already exists");
    next.classes.push({
      id: "cl_" + uid(),
      schoolId,
      level,
      trade: isLevelL ? trade.trim() : null,
      abbreviation: isLevelL ? abbr.trim().toUpperCase() : null,
      createdAt: new Date().toISOString(),
    });
    saveDB(next);
    setOpen(false); setTrade(""); setAbbr(""); setLevel("L3");
    toast.success("Class created");
  }

  function removeClass(id: string) {
    const next = loadDB();
    const hasStudents = next.students.some((s) => s.classId === id);
    if (hasStudents) return toast.error("Cannot delete: class has students");
    next.classes = next.classes.filter((c) => c.id !== id);
    saveDB(next);
    toast.success("Class removed");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Classes</h1>
          <p className="text-sm text-muted-foreground">Manage school classes (Levels L3–L5 with trades, Senior S1–S5).</p>
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button variant="gradient"><Plus className="mr-2 h-4 w-4" /> Add Class</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create new class</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Level</Label>
                  <Select value={level} onValueChange={(v) => setLevel(v as ClassLevel)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {isLevelL && (
                  <>
                    <div>
                      <Label>Trade name</Label>
                      <Input value={trade} onChange={(e) => setTrade(e.target.value)} placeholder="e.g. Computer System and Architecture" />
                    </div>
                    <div>
                      <Label>Abbreviation</Label>
                      <Input value={abbr} onChange={(e) => setAbbr(e.target.value.toUpperCase())} placeholder="e.g. CSA" maxLength={8} />
                    </div>
                  </>
                )}
                <p className="text-xs text-muted-foreground">
                  Preview: <span className="font-medium text-foreground">
                    {classDisplayName({ level, trade: isLevelL ? trade : null, abbreviation: isLevelL ? abbr : null })}
                  </span>
                </p>
              </div>
              <DialogFooter><Button onClick={addClass} variant="gradient">Create</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><GraduationCap className="h-4 w-4" /> All classes ({classes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Trade</TableHead>
                <TableHead>Students</TableHead>
                {canEdit && <TableHead className="w-12"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">No classes yet.</TableCell></TableRow>
              )}
              {classes.map((c) => {
                const count = db.students.filter((s) => s.classId === c.id).length;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{classDisplayName(c)}</TableCell>
                    <TableCell><Badge variant="secondary">{c.level}</Badge></TableCell>
                    <TableCell>{c.trade || "—"}</TableCell>
                    <TableCell>{count}</TableCell>
                    {canEdit && (
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => removeClass(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    )}
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
