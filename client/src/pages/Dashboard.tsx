import { trpc } from "@/lib/trpc";
import { formatTemplateLabel } from "@/lib/template";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/AppLayout";
import { Link } from "wouter";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  FolderKanban,
  Plus,
} from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();
  const { data: portfolio } = trpc.dashboard.portfolioSummary.useQuery();
  const { data: projects } = trpc.projects.list.useQuery();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 rounded bg-slate-200"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 rounded bg-slate-200"></div>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  const recentProjects = projects?.slice(0, 5) || [];
  const projectNameMap = new Map<number, string>();
  for (const p of projects ?? []) projectNameMap.set(p.id, p.name);

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="mt-2 text-muted-foreground">
            Portfolio, execution, and governance overview across all projects
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/projects">
            <Card className="cursor-pointer bg-white transition-colors hover:bg-slate-50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                <FolderKanban className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalProjects || 0}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {stats?.activeProjects || 0} active
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/gantt">
            <Card className="cursor-pointer bg-white transition-colors hover:bg-slate-50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalTasks || 0}</div>
                <p className="mt-1 text-xs text-muted-foreground">Across all projects</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/projects?status=Complete">
            <Card className="cursor-pointer bg-white transition-colors hover:bg-slate-50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.completedTasks || 0}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {stats?.totalTasks
                    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
                    : 0}
                  % completion rate
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/calendar">
            <Card className="cursor-pointer bg-white transition-colors hover:bg-slate-50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Upcoming Deadlines</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.upcomingDeadlines?.length || 0}</div>
                <p className="mt-1 text-xs text-muted-foreground">Next 14 days</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Portfolio Health
              </CardTitle>
              <CardDescription>Health status and milestone confidence</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <Link href="/projects?health=onTrack">
                  <div className="cursor-pointer rounded border bg-emerald-50 p-3 transition-colors hover:bg-emerald-100">
                    <p className="text-xs text-emerald-700">On Track</p>
                    <p className="text-xl font-bold text-emerald-800">
                      {portfolio?.totals.onTrack ?? 0}
                    </p>
                  </div>
                </Link>
                <Link href="/projects?health=atRisk">
                  <div className="cursor-pointer rounded border bg-amber-50 p-3 transition-colors hover:bg-amber-100">
                    <p className="text-xs text-amber-700">At Risk</p>
                    <p className="text-xl font-bold text-amber-800">
                      {portfolio?.totals.atRisk ?? 0}
                    </p>
                  </div>
                </Link>
                <Link href="/projects?health=offTrack">
                  <div className="cursor-pointer rounded border bg-red-50 p-3 transition-colors hover:bg-red-100">
                    <p className="text-xs text-red-700">Off Track</p>
                    <p className="text-xl font-bold text-red-800">
                      {portfolio?.totals.offTrack ?? 0}
                    </p>
                  </div>
                </Link>
              </div>
              <p className="text-sm text-muted-foreground">
                Average completion: {portfolio?.totals.averageCompletionPercent ?? 0}%
              </p>
              <p className="text-sm text-muted-foreground">
                Milestone confidence (High / Medium / Low):{" "}
                {portfolio?.milestoneConfidence.high ?? 0} /{" "}
                {portfolio?.milestoneConfidence.medium ?? 0} /{" "}
                {portfolio?.milestoneConfidence.low ?? 0}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Top Risks
              </CardTitle>
              <CardDescription>Projects requiring leadership attention</CardDescription>
            </CardHeader>
            <CardContent>
              {!portfolio?.topRisks || portfolio.topRisks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No at-risk projects right now.</p>
              ) : (
                <div className="space-y-2">
                  {portfolio.topRisks.map((risk) => (
                    <Link key={risk.projectId} href={`/projects/${risk.projectId}`}>
                      <div className="cursor-pointer rounded border p-3 transition-colors hover:bg-slate-50">
                        <p className="font-medium">{risk.projectName}</p>
                        <p className="text-xs text-muted-foreground">
                          {risk.health} • Overdue: {risk.overdueTasks} • Blocked: {risk.blockedTasks}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Recent Projects</CardTitle>
              <CardDescription>Latest projects created</CardDescription>
            </CardHeader>
            <CardContent>
              {recentProjects.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <p>No projects yet</p>
                  <Link href="/projects/new">
                    <Button className="mt-4" variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Project
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentProjects.map((project) => (
                    <Link key={project.id} href={`/projects/${project.id}`}>
                      <div className="flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors hover:bg-slate-50">
                        <div className="flex-1">
                          <p className="font-medium">{project.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatTemplateLabel(project.templateType)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${project.status === "Active"
                              ? "bg-green-100 text-green-700"
                              : project.status === "Planning"
                                ? "bg-blue-100 text-blue-700"
                                : project.status === "On Hold"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : project.status === "Closeout"
                                    ? "bg-orange-100 text-orange-700"
                                    : "bg-gray-100 text-gray-700"
                              }`}
                          >
                            {project.status}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Upcoming Deadlines</CardTitle>
              <CardDescription>Tasks due in the next 14 days</CardDescription>
            </CardHeader>
            <CardContent>
              {!stats?.upcomingDeadlines || stats.upcomingDeadlines.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Clock className="mx-auto mb-3 h-12 w-12 opacity-20" />
                  <p>No upcoming deadlines</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.upcomingDeadlines.map((task) => (
                    <Link key={task.id} href={`/projects/${task.projectId}?task=${task.id}`}>
                      <div className="flex cursor-pointer items-start justify-between rounded-lg border p-3 transition-colors hover:bg-slate-50">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{task.taskDescription}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            <span className="font-medium text-blue-600">{projectNameMap.get(task.projectId) ?? ""}</span>
                            {task.phase && ` • ${task.phase}`}
                            {" • "}
                            {task.owner || "Unassigned"}
                          </p>
                        </div>
                        <div className="ml-4 text-right">
                          <p className="text-sm font-medium">
                            {task.dueDate ? format(new Date(task.dueDate), "MMM d") : "No date"}
                          </p>
                          <span
                            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${task.priority === "High"
                              ? "bg-red-100 text-red-700"
                              : task.priority === "Medium"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-gray-100 text-gray-700"
                              }`}
                          >
                            {task.priority}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </AppLayout>
  );
}
