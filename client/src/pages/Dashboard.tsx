import { trpc } from "@/lib/trpc";
import { formatTemplateLabel } from "@/lib/template";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/AppLayout";
import { Link } from "wouter";
import { BarChart3, CheckCircle2, Clock, FolderKanban, Plus } from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();
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

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="mt-2 text-muted-foreground">
            Overview of all projects and tasks across RTC
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-white">
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

          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalTasks || 0}</div>
              <p className="mt-1 text-xs text-muted-foreground">Across all projects</p>
            </CardContent>
          </Card>

          <Card className="bg-white">
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

          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Deadlines</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.upcomingDeadlines?.length || 0}</div>
              <p className="mt-1 text-xs text-muted-foreground">Next 14 days</p>
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
                            className={`rounded-full px-2 py-1 text-xs font-medium ${
                              project.status === "Active"
                                ? "bg-green-100 text-green-700"
                                : project.status === "Planning"
                                  ? "bg-blue-100 text-blue-700"
                                  : project.status === "On Hold"
                                    ? "bg-yellow-100 text-yellow-700"
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
                    <div key={task.id} className="flex items-start justify-between rounded-lg border p-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{task.taskDescription}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {task.phase && `${task.phase} • `}
                          {task.owner || "Unassigned"}
                        </p>
                      </div>
                      <div className="ml-4 text-right">
                        <p className="text-sm font-medium">
                          {task.dueDate ? format(new Date(task.dueDate), "MMM d") : "No date"}
                        </p>
                        <span
                          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            task.priority === "High"
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
