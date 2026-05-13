// Cloud-backed store. Hydrates Supabase tables into a single DB object that
// existing pages can read synchronously. saveDB() diffs the new vs previous
// snapshot and writes the changes back to Cloud.

import { supabase } from "@/integrations/supabase/client";

export type Role = "super_admin" | "school_admin" | "staff";

export type Permission =
  | "manage_schools"
  | "manage_staff"
  | "manage_students"
  | "manage_classes"
  | "manage_materials"
  | "manage_roles"
  | "view_reports";

export const PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: ["manage_schools", "manage_staff", "manage_students", "manage_classes", "manage_materials", "manage_roles", "view_reports"],
  school_admin: ["manage_staff", "manage_students", "manage_classes", "manage_materials", "manage_roles", "view_reports"],
  staff: ["view_reports"],
};

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super Admin",
  school_admin: "School Admin",
  staff: "Staff",
};

export type User = {
  id: string;
  email: string;
  username?: string;
  password: string; // unused on cloud; kept for type compat
  name: string;
  role: Role;
  schoolId: string | null;
  staffRoleId?: string | null;
  photo?: string | null;
};

export type School = { id: string; name: string; location: string; createdAt: string };
export type StaffRole = { id: string; schoolId: string; name: string; createdAt: string };

export type ClassLevel = "L3" | "L4" | "L5" | "S1" | "S2" | "S3" | "S4" | "S5";
export type SchoolClass = { id: string; schoolId: string; level: ClassLevel; trade?: string | null; abbreviation?: string | null; createdAt: string };

export function classDisplayName(c: Pick<SchoolClass, "level" | "abbreviation" | "trade">): string {
  if (c.level.startsWith("L") && c.abbreviation) return `${c.level} ${c.abbreviation}`;
  if (c.level.startsWith("L") && c.trade) return `${c.level} ${c.trade}`;
  return c.level;
}

export type Student = { id: string; schoolId: string; name: string; classId: string; className?: string; parentPhone: string; photo?: string | null };
export type Material = { id: string; schoolId: string; name: string; assignedStaffIds: string[] };

export type TrackingStatus = "completed" | "pending" | "overdue";
export type Term = "T1" | "T2" | "T3";
export const TERM_LABEL: Record<Term, string> = { T1: "Term 1", T2: "Term 2", T3: "Term 3" };

export type Tracking = {
  id: string;
  schoolId: string;
  studentId: string;
  materialId: string;
  status: TrackingStatus;
  promisedDate: string | null;
  updatedAt: string;
  academicYear: number;
  term: Term;
};

export function currentAcademicYear(d: Date = new Date()): number { return d.getFullYear(); }
export function currentTerm(d: Date = new Date()): Term {
  const m = d.getMonth() + 1;
  if (m >= 1 && m <= 4) return "T1";
  if (m >= 5 && m <= 8) return "T2";
  return "T3";
}

export type AuditEntry = { id: string; schoolId: string | null; actorId: string; actorName: string; action: string; target?: string; details?: string; at: string };

export type TermArchive = {
  id: string;
  schoolId: string;
  academicYear: number;
  term: Term;
  archivedAt: string;
  archivedBy: string;
  tracking: Tracking[];
  studentsCount: number;
  materialsCount: number;
  summary: { completed: number; pending: number; overdue: number };
};

export type DB = {
  users: User[];
  schools: School[];
  staffRoles: StaffRole[];
  classes: SchoolClass[];
  students: Student[];
  materials: Material[];
  tracking: Tracking[];
  audit: AuditEntry[];
  archives: TermArchive[];
};

const SESSION = "acadex_session_v1";
const CACHE = "acadex_cloud_cache_v1";

export const uid = () => crypto.randomUUID();

function emptyDB(): DB {
  return { users: [], schools: [], staffRoles: [], classes: [], students: [], materials: [], tracking: [], audit: [], archives: [] };
}

let memDB: DB = emptyDB();
let lastSnapshot: DB = emptyDB();
let hydrated = false;

if (typeof window !== "undefined") {
  try {
    const raw = localStorage.getItem(CACHE);
    if (raw) {
      memDB = JSON.parse(raw);
      lastSnapshot = JSON.parse(raw);
    }
  } catch {}
}

function broadcast() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("acadex:db"));
}

function persistCache() {
  if (typeof window !== "undefined") {
    try { localStorage.setItem(CACHE, JSON.stringify(memDB)); } catch {}
  }
}

// ===== Hydrate from Cloud =====
export async function hydrateFromCloud(): Promise<void> {
  const sess = getSession();
  if (!sess) return;

  const [
    schoolsR, classesR, staffRolesR, studentsR, materialsR, trackingR, archivesR, auditR, profilesR, rolesR
  ] = await Promise.all([
    supabase.from("schools").select("*"),
    supabase.from("school_classes").select("*"),
    supabase.from("staff_roles").select("*"),
    supabase.from("students").select("*"),
    supabase.from("materials").select("*"),
    supabase.from("tracking").select("*"),
    supabase.from("term_archives").select("*"),
    supabase.from("audit_log").select("*").order("at", { ascending: false }).limit(500),
    supabase.from("profiles").select("*"),
    supabase.from("user_roles").select("*"),
  ]);

  const rolesByUser = new Map<string, Role>();
  (rolesR.data ?? []).forEach((r: any) => {
    const cur = rolesByUser.get(r.user_id);
    const rank: Record<Role, number> = { super_admin: 3, school_admin: 2, staff: 1 };
    if (!cur || rank[r.role as Role] > rank[cur]) rolesByUser.set(r.user_id, r.role as Role);
  });

  const db: DB = {
    schools: (schoolsR.data ?? []).map((s: any) => ({ id: s.id, name: s.name, location: s.location, createdAt: s.created_at })),
    classes: (classesR.data ?? []).map((c: any) => ({ id: c.id, schoolId: c.school_id, level: c.level, trade: c.trade, abbreviation: c.abbreviation, createdAt: c.created_at })),
    staffRoles: (staffRolesR.data ?? []).map((r: any) => ({ id: r.id, schoolId: r.school_id, name: r.name, createdAt: r.created_at })),
    students: (studentsR.data ?? []).map((s: any) => ({ id: s.id, schoolId: s.school_id, name: s.name, classId: s.class_id, parentPhone: s.parent_phone ?? "", photo: s.photo })),
    materials: (materialsR.data ?? []).map((m: any) => ({ id: m.id, schoolId: m.school_id, name: m.name, assignedStaffIds: m.assigned_staff_ids ?? [] })),
    tracking: (trackingR.data ?? []).map((t: any) => ({ id: t.id, schoolId: t.school_id, studentId: t.student_id, materialId: t.material_id, status: t.status, promisedDate: t.promised_date, updatedAt: t.updated_at, academicYear: t.academic_year, term: t.term })),
    archives: (archivesR.data ?? []).map((a: any) => ({ id: a.id, schoolId: a.school_id, academicYear: a.academic_year, term: a.term, archivedAt: a.archived_at, archivedBy: a.archived_by, tracking: a.tracking ?? [], studentsCount: a.students_count, materialsCount: a.materials_count, summary: a.summary ?? { completed: 0, pending: 0, overdue: 0 } })),
    audit: (auditR.data ?? []).map((e: any) => ({ id: e.id, schoolId: e.school_id, actorId: e.actor_id, actorName: e.actor_name, action: e.action, target: e.target ?? undefined, details: e.details ?? undefined, at: e.at })),
    users: (profilesR.data ?? []).map((p: any) => ({
      id: p.id,
      email: p.email,
      username: p.username ?? undefined,
      password: "",
      name: p.name || p.email,
      role: rolesByUser.get(p.id) ?? "staff",
      schoolId: p.school_id,
      staffRoleId: p.staff_role_id,
      photo: p.photo,
    })),
  };

  memDB = db;
  lastSnapshot = JSON.parse(JSON.stringify(db));
  hydrated = true;
  persistCache();
  broadcast();

  // Refresh session user from latest profile
  const me = db.users.find((u) => u.id === sess.id);
  if (me) setSession(me);
}

export function loadDB(): DB { return memDB; }

// ===== Diff & sync =====
function byId<T extends { id: string }>(arr: T[]): Map<string, T> {
  const m = new Map<string, T>();
  arr.forEach((x) => m.set(x.id, x));
  return m;
}

function shallowEqual(a: any, b: any): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function syncCollection<T extends { id: string }>(
  oldArr: T[],
  newArr: T[],
  table: string,
  toRow: (x: T) => Record<string, any>,
) {
  const oldMap = byId(oldArr);
  const newMap = byId(newArr);
  const upserts: Record<string, any>[] = [];
  const deletes: string[] = [];
  for (const [id, item] of newMap) {
    const prev = oldMap.get(id);
    if (!prev || !shallowEqual(prev, item)) upserts.push(toRow(item));
  }
  for (const id of oldMap.keys()) if (!newMap.has(id)) deletes.push(id);
  if (upserts.length) {
    const { error } = await supabase.from(table as any).upsert(upserts);
    if (error) console.error(`[sync] upsert ${table}`, error);
  }
  if (deletes.length) {
    const { error } = await supabase.from(table as any).delete().in("id", deletes);
    if (error) console.error(`[sync] delete ${table}`, error);
  }
}

export function saveDB(db: DB) {
  // Optimistic update of in-memory state
  const prev = lastSnapshot;
  memDB = db;
  lastSnapshot = JSON.parse(JSON.stringify(db));
  persistCache();
  broadcast();

  // Background sync
  void (async () => {
    try {
      await Promise.all([
        syncCollection(prev.schools, db.schools, "schools", (s) => ({ id: s.id, name: s.name, location: s.location, created_at: s.createdAt })),
        syncCollection(prev.staffRoles, db.staffRoles, "staff_roles", (r) => ({ id: r.id, school_id: r.schoolId, name: r.name, created_at: r.createdAt })),
        syncCollection(prev.classes, db.classes, "school_classes", (c) => ({ id: c.id, school_id: c.schoolId, level: c.level, trade: c.trade ?? null, abbreviation: c.abbreviation ?? null, created_at: c.createdAt })),
        syncCollection(prev.students, db.students, "students", (s) => ({ id: s.id, school_id: s.schoolId, class_id: s.classId, name: s.name, parent_phone: s.parentPhone, photo: s.photo ?? null })),
        syncCollection(prev.materials, db.materials, "materials", (m) => ({ id: m.id, school_id: m.schoolId, name: m.name, assigned_staff_ids: m.assignedStaffIds })),
        syncCollection(prev.tracking, db.tracking, "tracking", (t) => ({ id: t.id, school_id: t.schoolId, student_id: t.studentId, material_id: t.materialId, status: t.status, promised_date: t.promisedDate, academic_year: t.academicYear, term: t.term, updated_at: t.updatedAt })),
        syncCollection(prev.archives, db.archives, "term_archives", (a) => ({ id: a.id, school_id: a.schoolId, academic_year: a.academicYear, term: a.term, archived_at: a.archivedAt, archived_by: a.archivedBy, tracking: a.tracking, students_count: a.studentsCount, materials_count: a.materialsCount, summary: a.summary })),
        // Profiles: only update fields, never insert/delete (handled by auth)
        syncProfiles(prev.users, db.users),
      ]);
    } catch (e) {
      console.error("[sync] failed", e);
    }
  })();
}

async function syncProfiles(oldArr: User[], newArr: User[]) {
  const oldMap = byId(oldArr);
  for (const u of newArr) {
    const prev = oldMap.get(u.id);
    if (!prev) continue;
    if (prev.name !== u.name || prev.username !== u.username || prev.schoolId !== u.schoolId || prev.staffRoleId !== u.staffRoleId || prev.photo !== u.photo) {
      await supabase.from("profiles").update({
        name: u.name, username: u.username ?? null, school_id: u.schoolId, staff_role_id: u.staffRoleId ?? null, photo: u.photo ?? null,
      }).eq("id", u.id);
    }
    if (prev.role !== u.role) {
      // Replace role rows
      await supabase.from("user_roles").delete().eq("user_id", u.id);
      await supabase.from("user_roles").insert({ user_id: u.id, role: u.role });
    }
  }
}

export function resetDB() {
  // Cloud-backed: clear local cache only.
  memDB = emptyDB();
  lastSnapshot = emptyDB();
  if (typeof window !== "undefined") localStorage.removeItem(CACHE);
  broadcast();
}

// ===== Session =====
export function getSession(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION);
  if (!raw) return null;
  try { return JSON.parse(raw) as User; } catch { return null; }
}

export function setSession(u: User | null) {
  if (typeof window === "undefined") return;
  if (u) localStorage.setItem(SESSION, JSON.stringify(u));
  else localStorage.removeItem(SESSION);
  window.dispatchEvent(new Event("acadex:session"));
}

// Auth
export async function loginWithPassword(email: string, password: string): Promise<{ ok: boolean; error?: string; user?: User }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { ok: false, error: error?.message ?? "Login failed" };
  // Fetch profile + role
  const [{ data: prof }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", data.user.id),
  ]);
  const rank: Record<Role, number> = { super_admin: 3, school_admin: 2, staff: 1 };
  const role: Role = (roles ?? []).map((r: any) => r.role as Role).sort((a, b) => rank[b] - rank[a])[0] ?? "staff";
  const u: User = {
    id: data.user.id,
    email: data.user.email ?? email,
    username: prof?.username ?? undefined,
    password: "",
    name: prof?.name || data.user.email || email,
    role,
    schoolId: prof?.school_id ?? null,
    staffRoleId: prof?.staff_role_id ?? null,
    photo: prof?.photo ?? null,
  };
  setSession(u);
  await hydrateFromCloud();
  return { ok: true, user: u };
}

export async function signUpWithPassword(email: string, password: string, name: string): Promise<{ ok: boolean; error?: string }> {
  const redirectUrl = `${window.location.origin}/app/dashboard`;
  const { error } = await supabase.auth.signUp({
    email, password,
    options: { emailRedirectTo: redirectUrl, data: { name } },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function signInWithGoogle(): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/app/dashboard` },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function signOut() {
  await supabase.auth.signOut();
  setSession(null);
  resetDB();
}

// Backward-compatible login() used by old code paths — deprecated.
export function login(_identifier: string, _password: string): User | null { return null; }

export async function changePassword(_userId: string, _currentPassword: string, newPassword: string): Promise<{ ok: boolean; error?: string }> {
  if (!newPassword || newPassword.length < 6) return { ok: false, error: "New password must be at least 6 characters" };
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export function hasPermission(user: User | null, perm: Permission): boolean {
  if (!user) return false;
  return PERMISSIONS[user.role].includes(perm);
}

export function userRoleLabel(u: User, db: Pick<DB, "staffRoles">): string {
  if (u.role === "staff") {
    const r = db.staffRoles.find((x) => x.id === u.staffRoleId);
    return r ? r.name : "Staff";
  }
  return ROLE_LABEL[u.role];
}

// ===== Audit =====
export function logAudit(action: string, target?: string, details?: string) {
  const sess = getSession();
  if (!sess) return;
  const entry: AuditEntry = {
    id: uid(), schoolId: sess.schoolId, actorId: sess.id, actorName: sess.name,
    action, target, details, at: new Date().toISOString(),
  };
  const db = loadDB();
  db.audit = [entry, ...(db.audit ?? [])].slice(0, 1000);
  memDB = db;
  lastSnapshot.audit = db.audit;
  persistCache();
  broadcast();
  void supabase.from("audit_log").insert({
    id: entry.id, school_id: entry.schoolId, actor_id: entry.actorId, actor_name: entry.actorName,
    action: entry.action, target: entry.target ?? null, details: entry.details ?? null, at: entry.at,
  });
}

// ===== Term archive & rollover =====
function nextLevel(c: ClassLevel): ClassLevel | null {
  if (c === "L3") return "L4";
  if (c === "L4") return "L5";
  if (c === "L5") return null;
  if (c === "S1") return "S2";
  if (c === "S2") return "S3";
  if (c === "S3") return "S4";
  if (c === "S4") return "S5";
  return null;
}

export function archiveTerm(opts: { schoolId: string; academicYear: number; term: Term; promote?: boolean }): { ok: boolean; archiveId?: string; error?: string } {
  const sess = getSession();
  if (!sess) return { ok: false, error: "Not signed in" };
  const db = loadDB();
  const inScope = (t: Tracking) => t.schoolId === opts.schoolId && t.academicYear === opts.academicYear && t.term === opts.term;
  const tracking = db.tracking.filter(inScope);
  if (tracking.length === 0) return { ok: false, error: "Nothing to archive for this period" };

  const archive: TermArchive = {
    id: uid(),
    schoolId: opts.schoolId,
    academicYear: opts.academicYear,
    term: opts.term,
    archivedAt: new Date().toISOString(),
    archivedBy: sess.name,
    tracking: JSON.parse(JSON.stringify(tracking)),
    studentsCount: db.students.filter((s) => s.schoolId === opts.schoolId).length,
    materialsCount: db.materials.filter((m) => m.schoolId === opts.schoolId).length,
    summary: {
      completed: tracking.filter((t) => t.status === "completed").length,
      pending: tracking.filter((t) => t.status === "pending").length,
      overdue: tracking.filter((t) => t.status === "overdue").length,
    },
  };
  const next: DB = { ...db, archives: [archive, ...db.archives], tracking: db.tracking.filter((t) => !inScope(t)) };

  if (opts.promote) {
    const graduating: string[] = [];
    next.students = next.students.map((s) => {
      if (s.schoolId !== opts.schoolId) return s;
      const cls = next.classes.find((c) => c.id === s.classId);
      if (!cls) return s;
      const nl = nextLevel(cls.level);
      if (!nl) { graduating.push(s.id); return s; }
      const newCls = next.classes.find((c) => c.schoolId === opts.schoolId && c.level === nl && (c.trade ?? null) === (cls.trade ?? null) && (c.abbreviation ?? null) === (cls.abbreviation ?? null));
      if (!newCls) return s;
      return { ...s, classId: newCls.id, className: classDisplayName(newCls) };
    });
    next.students = next.students.filter((s) => !graduating.includes(s.id));
    next.tracking = next.tracking.filter((t) => !graduating.includes(t.studentId));
  }

  saveDB(next);
  logAudit("term.archive", `${opts.academicYear} · ${opts.term}`, opts.promote ? "with promotion" : undefined);
  return { ok: true, archiveId: archive.id };
}

// Marker for app bootstrap to know if hydration has completed at least once
export function isHydrated() { return hydrated; }
