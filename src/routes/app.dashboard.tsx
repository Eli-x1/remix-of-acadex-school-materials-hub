import { createFileRoute, Link } from "@tanstack/react-router";
import { useDB, useSession } from "@/hooks/use-acadex";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Package,
  GraduationCap,
  ArrowUpRight,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  Plus,
  Building2,
  Shield,
  UserCog,
  Activity,
  Database,
  TrendingUp,
  Globe,
  Crown,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export const Route = createFileRoute("/app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Acadex" }] }),
  component: Dashboard,
});

function Dashboard() {
  const db = useDB();
  const user = useSession()!;

  if (user.role === "super_admin") return <SuperAdminDashboard />;
  return <SchoolDashboard />;
}

/* ============================================================
   SUPER ADMIN DASHBOARD — platform-wide control
============================================================ */
function SuperAdminDashboard() {
  const db = useDB();
  const user = useSession()!;

  const totalSchools = db.schools.length;
  const totalUsers = db.users.length;
  const totalAdmins = db.users.filter((u) => u.role === "school_admin").length;
  const totalStaff = db.users.filter((u) => u.role === "staff").length;
  const totalStudents = db.students.length;
  const totalMaterials = db.materials.length;
  const totalTracking = db.tracking.length;
  const totalClasses = db.classes.length;

  // Schools ranked by activity
  const schoolStats = db.schools
    .map((s) => {
      const students = db.students.filter((x) => x.schoolId === s.id).length;
      const staff = db.users.filter((u) => u.schoolId === s.id && u.role !== "super_admin").length;
      const tracking = db.tracking.filter((t) => t.schoolId === s.id);
      const completed = tracking.filter((t) => t.status === "completed").length;
      const rate = tracking.length ? Math.round((completed / tracking.length) * 100) : 0;
      return {
        id: s.id,
        name: s.name,
        location: s.location,
        students,
        staff,
        tracking: tracking.length,
        rate,
        createdAt: s.createdAt,
      };
    })
    .sort((a, b) => b.students - a.students);

  const topSchools = schoolStats.slice(0, 6);

  // Distribution: students per school for chart
  const distribution = schoolStats.slice(0, 8).map((s) => ({
    name: s.name.length > 14 ? s.name.slice(0, 14) + "…" : s.name,
    students: s.students,
    staff: s.staff,
  }));

  // Role pie
  const roleData = [
    { name: "School Admins", value: totalAdmins, color: "var(--chart-1)" },
    { name: "Staff", value: totalStaff, color: "var(--chart-2)" },
    {
      name: "Super Admins",
      value: db.users.filter((u) => u.role === "super_admin").length,
      color: "var(--chart-5)",
    },
  ].filter((d) => d.value > 0);

  // Growth trend — schools created over last 12 weeks
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (11 - i) * 7);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  let cumulative = 0;
  const growth = weeks.map((w, i) => {
    const next = i < weeks.length - 1 ? weeks[i + 1] : new Date(Date.now() + 86400000);
    const created = db.schools.filter((s) => {
      const c = new Date(s.createdAt);
      return c < next;
    }).length;
    return {
      week: w.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      schools: created,
    };
  });

  // Recent schools
  const recentSchools = [...db.schools]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              <Crown className="size-3" />
              Super Admin
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {greeting()}, {user.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Platform overview · {totalSchools} school{totalSchools === 1 ? "" : "s"} ·{" "}
            {totalUsers} user{totalUsers === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/app/staff">
              <UserCog className="size-4" /> Staff
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/app/schools">
              <Plus className="size-4" /> New school
            </Link>
          </Button>
        </div>
      </div>

      {/* Platform metrics — 4 big cards */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border lg:grid-cols-4">
        <Stat
          label="Schools"
          value={totalSchools}
          sub="organizations"
          icon={<Building2 className="size-4" />}
          accent="bg-[var(--chart-1)]"
          href="/app/schools"
        />
        <Stat
          label="Users"
          value={totalUsers}
          sub={`${totalAdmins} admins · ${totalStaff} staff`}
          icon={<Users className="size-4" />}
          accent="bg-[var(--chart-2)]"
          href="/app/staff"
        />
        <Stat
          label="Students"
          value={totalStudents}
          sub={`${totalClasses} classes`}
          icon={<GraduationCap className="size-4" />}
          accent="bg-[var(--chart-3)]"
          href="/app/schools"
        />
        <Stat
          label="Tracking events"
          value={totalTracking}
          sub={`${totalMaterials} materials`}
          icon={<Activity className="size-4" />}
          accent="bg-[var(--chart-5)]"
          href="/app/reports"
        />
      </div>

      {/* Quick actions */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ActionCard
          title="Manage schools"
          desc="Create, edit, archive schools"
          icon={<Building2 className="size-5" />}
          href="/app/schools"
          tone="primary"
        />
        <ActionCard
          title="Staff & access"
          desc="Provision admins and staff"
          icon={<Shield className="size-5" />}
          href="/app/staff"
          tone="chart-2"
        />
        <ActionCard
          title="Platform reports"
          desc="Cross-school analytics"
          icon={<TrendingUp className="size-5" />}
          href="/app/reports"
          tone="chart-3"
        />
        <ActionCard
          title="System settings"
          desc="Global configuration"
          icon={<Database className="size-5" />}
          href="/app/settings"
          tone="chart-5"
        />
      </div>

      {/* Two columns: distribution + roles */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Panel
          title="Schools by size"
          subtitle="Top schools by student count"
          className="lg:col-span-3"
        >
          {distribution.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No schools yet.</div>
          ) : (
            <div className="h-64 px-2 pb-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distribution} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={28}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="students" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="staff" fill="var(--chart-2)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="flex gap-4 border-t px-4 py-3 text-xs text-muted-foreground">
            <LegendDot color="var(--chart-1)" label="Students" />
            <LegendDot color="var(--chart-2)" label="Staff" />
          </div>
        </Panel>

        <Panel title="User roles" subtitle="Platform-wide" className="lg:col-span-2">
          {roleData.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No users yet.</div>
          ) : (
            <>
              <div className="h-48 px-2 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={roleData}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={70}
                      paddingAngle={2}
                    >
                      {roleData.map((d, i) => (
                        <Cell key={i} fill={d.color} stroke="var(--background)" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-1.5 border-t px-4 py-3">
                {roleData.map((r) => (
                  <li key={r.name} className="flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <span
                        className="size-1.5 rounded-full"
                        style={{ background: r.color }}
                      />
                      {r.name}
                    </span>
                    <span className="font-medium tabular-nums">{r.value}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>
      </div>

      {/* Schools table + recent */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Panel
          title="Top schools"
          subtitle="By student volume"
          className="lg:col-span-3"
          action={
            <Link
              to="/app/schools"
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              All schools →
            </Link>
          }
        >
          {topSchools.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              No schools yet.{" "}
              <Link to="/app/schools" className="text-primary underline-offset-4 hover:underline">
                Create one
              </Link>
              .
            </div>
          ) : (
            <ul className="divide-y">
              {topSchools.map((s, i) => (
                <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted text-xs font-semibold tabular-nums text-muted-foreground">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      <Globe className="mr-1 inline size-3" />
                      {s.location}
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center gap-4 text-xs tabular-nums">
                    <Stat2 label="Students" value={s.students} />
                    <Stat2 label="Staff" value={s.staff} />
                    <Stat2 label="Rate" value={`${s.rate}%`} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Recently added" className="lg:col-span-2">
          {recentSchools.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No schools yet.</div>
          ) : (
            <ul className="divide-y">
              {recentSchools.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Building2 className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      Added {new Date(s.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t px-4 py-2.5">
            <Link
              to="/app/schools"
              className="flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Manage schools
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function ActionCard({
  title,
  desc,
  icon,
  href,
  tone,
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
  href: string;
  tone: "primary" | "chart-2" | "chart-3" | "chart-5";
}) {
  const map = {
    primary: "text-primary bg-primary/10",
    "chart-2": "text-[var(--chart-2)] bg-[var(--chart-2)]/10",
    "chart-3": "text-[var(--chart-3)] bg-[var(--chart-3)]/10",
    "chart-5": "text-[var(--chart-5)] bg-[var(--chart-5)]/10",
  } as const;
  return (
    <Link
      to={href}
      className="group flex items-start gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-accent/40"
    >
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-md ${map[tone]}`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{desc}</p>
      </div>
      <ArrowUpRight className="size-4 text-muted-foreground/60 group-hover:text-foreground" />
    </Link>
  );
}

function Stat2({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-right">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

/* ============================================================
   SCHOOL ADMIN / STAFF DASHBOARD — original
============================================================ */
function SchoolDashboard() {
  const db = useDB();
  const user = useSession()!;

  const scope = {
    ...db,
    students: db.students.filter((s) => s.schoolId === user.schoolId),
    materials: db.materials.filter((m) => m.schoolId === user.schoolId),
    tracking: db.tracking.filter((t) => t.schoolId === user.schoolId),
    schools: db.schools.filter((s) => s.id === user.schoolId),
    classes: db.classes.filter((c) => c.schoolId === user.schoolId),
  };

  const completed = scope.tracking.filter((t) => t.status === "completed").length;
  const pending = scope.tracking.filter((t) => t.status === "pending").length;
  const overdue = scope.tracking.filter((t) => t.status === "overdue").length;
  const total = scope.tracking.length;
  const completionRate = total ? Math.round((completed / total) * 100) : 0;

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const trend = days.map((d) => {
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    const items = scope.tracking.filter((t) => {
      const u = new Date(t.updatedAt);
      return u >= d && u < next;
    });
    return {
      day: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      completed: items.filter((t) => t.status === "completed").length,
      pending: items.filter((t) => t.status === "pending").length,
      overdue: items.filter((t) => t.status === "overdue").length,
    };
  });

  const classBreakdown = scope.classes
    .map((c) => {
      const studentIds = scope.students.filter((s) => s.classId === c.id).map((s) => s.id);
      const items = scope.tracking.filter((t) => studentIds.includes(t.studentId));
      const cName =
        c.level.startsWith("L") && c.abbreviation ? `${c.level} ${c.abbreviation}` : c.level;
      return {
        name: cName,
        completed: items.filter((t) => t.status === "completed").length,
        pending: items.filter((t) => t.status === "pending").length,
        overdue: items.filter((t) => t.status === "overdue").length,
        total: items.length,
        rate: items.length
          ? Math.round((items.filter((t) => t.status === "completed").length / items.length) * 100)
          : 0,
      };
    })
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  const recent = [...scope.tracking]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6);

  const studentsById = new Map(scope.students.map((s) => [s.id, s]));
  const materialsById = new Map(scope.materials.map((m) => [m.id, m]));

  const isEmpty = scope.students.length === 0 && scope.materials.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              <Shield className="size-3" />
              {user.role === "school_admin" ? "School Admin" : "Staff"}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {greeting()}, {user.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {scope.schools[0]?.name ?? "Your school"} · {scope.students.length} student{scope.students.length === 1 ? "" : "s"} · {total} tracking event{total === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/app/reports"><TrendingUp className="size-4" /> Reports</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/app/tracking"><Plus className="size-4" /> New tracking</Link>
          </Button>
        </div>
      </div>

      {isEmpty ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm font-medium">No data yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Start by adding students and materials.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button size="sm" asChild>
              <Link to="/app/students">Add students</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/app/materials">Add materials</Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border lg:grid-cols-4">
            <Stat
              label="Students"
              value={scope.students.length}
              icon={<Users className="size-4" />}
              accent="bg-[var(--chart-3)]"
              href="/app/students"
            />
            <Stat
              label="Materials"
              value={scope.materials.length}
              icon={<Package className="size-4" />}
              accent="bg-[var(--chart-2)]"
              href="/app/materials"
            />
            <Stat
              label="Classes"
              value={scope.classes.length}
              icon={<GraduationCap className="size-4" />}
              accent="bg-[var(--chart-5)]"
              href="/app/classes"
            />
            <Stat
              label="Completion"
              value={`${completionRate}%`}
              sub={`${completed} of ${total}`}
              icon={<Layers className="size-4" />}
              accent="bg-[var(--chart-1)]"
              href="/app/tracking"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatusTile
              label="Completed"
              value={completed}
              total={total}
              icon={<CheckCircle2 className="size-4" />}
              tone="success"
            />
            <StatusTile
              label="Pending"
              value={pending}
              total={total}
              icon={<Clock className="size-4" />}
              tone="warning"
            />
            <StatusTile
              label="Overdue"
              value={overdue}
              total={total}
              icon={<AlertTriangle className="size-4" />}
              tone="destructive"
            />
          </div>

          <Panel
            title="Activity"
            subtitle="Tracking updates · last 14 days"
            action={
              <Link
                to="/app/reports"
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Details →
              </Link>
            }
          >
            <div className="h-64 px-2 pb-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gComp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="0" vertical={false} />
                  <XAxis
                    dataKey="day"
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={28}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    stroke="var(--chart-2)"
                    strokeWidth={2}
                    fill="url(#gComp)"
                  />
                  <Area
                    type="monotone"
                    dataKey="pending"
                    stroke="var(--chart-5)"
                    strokeWidth={1.5}
                    fill="transparent"
                  />
                  <Area
                    type="monotone"
                    dataKey="overdue"
                    stroke="var(--destructive)"
                    strokeWidth={1.5}
                    fill="transparent"
                    strokeDasharray="3 3"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 border-t px-4 py-3 text-xs text-muted-foreground">
              <LegendDot color="var(--chart-2)" label="Completed" />
              <LegendDot color="var(--chart-5)" label="Pending" />
              <LegendDot color="var(--destructive)" label="Overdue" dashed />
            </div>
          </Panel>

          <div className="grid gap-6 lg:grid-cols-5">
            <Panel title="Top classes" subtitle="By tracking volume" className="lg:col-span-3">
              {classBreakdown.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">No class data yet.</div>
              ) : (
                <div className="h-64 px-2 pb-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={classBreakdown}
                      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid stroke="var(--border)" vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke="var(--muted-foreground)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="var(--muted-foreground)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        width={28}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--popover)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="completed" stackId="a" fill="var(--chart-2)" />
                      <Bar dataKey="pending" stackId="a" fill="var(--chart-5)" />
                      <Bar
                        dataKey="overdue"
                        stackId="a"
                        fill="var(--destructive)"
                        radius={[3, 3, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>

            <Panel title="Recent activity" className="lg:col-span-2">
              {recent.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">No activity yet.</div>
              ) : (
                <ul className="divide-y">
                  {recent.map((t) => {
                    const s = studentsById.get(t.studentId);
                    const m = materialsById.get(t.materialId);
                    return (
                      <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                        <span
                          className={`size-1.5 shrink-0 rounded-full ${
                            t.status === "completed"
                              ? "bg-success"
                              : t.status === "overdue"
                                ? "bg-destructive"
                                : "bg-warning"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {s?.name ?? "Student"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {m?.name ?? "Material"}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-normal capitalize"
                        >
                          {t.status}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="border-t px-4 py-2.5">
                <Link
                  to="/app/tracking"
                  className="flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  View all tracking
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

/* ============================================================
   Shared building blocks
============================================================ */
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function Stat({
  label,
  value,
  sub,
  icon,
  accent,
  href,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent: string;
  href: string;
}) {
  return (
    <Link
      to={href}
      className="group flex flex-col gap-3 bg-card p-4 transition-colors hover:bg-accent/40"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className={`size-1.5 rounded-full ${accent}`} />
          {label}
        </div>
        <span className="text-muted-foreground/60 group-hover:text-foreground">{icon}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </div>
    </Link>
  );
}

function StatusTile({
  label,
  value,
  total,
  icon,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  icon: React.ReactNode;
  tone: "success" | "warning" | "destructive";
}) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  const barColor =
    tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning" : "bg-destructive";
  const textColor =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : "text-destructive";
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-2 text-xs font-medium ${textColor}`}>
          {icon}
          {label}
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  action,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`overflow-hidden rounded-lg border bg-card ${className ?? ""}`}>
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function StatusBadge({ status }: { status: "completed" | "pending" | "overdue" }) {
  const cfg =
    status === "completed"
      ? { label: "Completed", cls: "border-success/30 bg-success/10 text-success" }
      : status === "overdue"
        ? { label: "Overdue", cls: "border-destructive/30 bg-destructive/10 text-destructive" }
        : { label: "Pending", cls: "border-warning/30 bg-warning/10 text-warning" };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${cfg.cls}`}
    >
      <span className="size-1 rounded-full bg-current" />
      {cfg.label}
    </span>
  );
}

function LegendDot({
  color,
  label,
  dashed,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-0.5 w-3"
        style={{
          background: dashed
            ? `repeating-linear-gradient(90deg, ${color} 0 3px, transparent 3px 6px)`
            : color,
        }}
      />
      {label}
    </span>
  );
}
