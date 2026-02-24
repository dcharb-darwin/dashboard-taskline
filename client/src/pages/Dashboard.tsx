import { trpc } from "@/lib/trpc";
import { formatTemplateLabel } from "@/lib/template";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  FolderKanban,
  Plus,
  ShieldCheck,
  Webhook,
} from "lucide-react";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const webhookEventOptions = [
  "project.created",
  "project.updated",
  "project.deleted",
  "task.created",
  "task.updated",
  "task.deleted",
  "template.created",
  "template.updated",
  "template.published",
  "template.archived",
  "integration.external_event",
] as const;

type GovernanceRole = "Admin" | "Editor" | "Viewer";

export default function Dashboard() {
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();
  const { data: portfolio } = trpc.dashboard.portfolioSummary.useQuery();
  const { data: projects } = trpc.projects.list.useQuery();
  const { data: myRole } = trpc.governance.access.myRole.useQuery();

  const isAdmin = myRole?.canAdminister ?? false;
  const { data: auditLogs, refetch: refetchAuditLogs } =
    trpc.governance.audit.list.useQuery(
      { limit: 20 },
      { enabled: isAdmin }
    );
  const { data: accessData, refetch: refetchPolicies } =
    trpc.governance.access.listPolicies.useQuery(undefined, {
      enabled: isAdmin,
    });
  const { data: webhooks, refetch: refetchWebhooks } =
    trpc.governance.webhooks.list.useQuery(
      { includeInactive: true },
      { enabled: isAdmin }
    );

  const [roleDrafts, setRoleDrafts] = useState<Record<string, GovernanceRole>>({});
  const [webhookForm, setWebhookForm] = useState({
    name: "",
    endpointUrl: "",
    eventsCsv: "project.updated,task.updated",
    secret: "",
  });

  const setPolicyMutation = trpc.governance.access.setPolicy.useMutation({
    onSuccess: async () => {
      toast.success("Access policy updated");
      await Promise.all([refetchPolicies(), refetchAuditLogs()]);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const createWebhookMutation = trpc.governance.webhooks.create.useMutation({
    onSuccess: async () => {
      toast.success("Webhook subscription created");
      setWebhookForm({
        name: "",
        endpointUrl: "",
        eventsCsv: "project.updated,task.updated",
        secret: "",
      });
      await Promise.all([refetchWebhooks(), refetchAuditLogs()]);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const removeWebhookMutation = trpc.governance.webhooks.remove.useMutation({
    onSuccess: async () => {
      toast.success("Webhook subscription removed");
      await Promise.all([refetchWebhooks(), refetchAuditLogs()]);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const computedRoleByOpenId = useMemo(() => {
    const map: Record<string, GovernanceRole> = {};
    if (!accessData) return map;

    for (const user of accessData.users) {
      map[user.openId] = user.role === "admin" ? "Admin" : "Editor";
    }
    for (const policy of accessData.policies) {
      map[policy.openId] = policy.accessRole as GovernanceRole;
    }
    return map;
  }, [accessData]);

  useEffect(() => {
    if (!accessData) return;
    setRoleDrafts((prev) => {
      const next = { ...prev };
      for (const user of accessData.users) {
        if (!next[user.openId]) {
          next[user.openId] = computedRoleByOpenId[user.openId] ?? "Editor";
        }
      }
      return next;
    });
  }, [accessData, computedRoleByOpenId]);

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

  const saveRole = (openId: string) => {
    const nextRole = roleDrafts[openId];
    if (!nextRole) return;
    setPolicyMutation.mutate({
      openId,
      accessRole: nextRole,
    });
  };

  const createWebhook = () => {
    const name = webhookForm.name.trim();
    const endpointUrl = webhookForm.endpointUrl.trim();
    const parsedEvents = webhookForm.eventsCsv
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (!name || !endpointUrl || parsedEvents.length === 0) {
      toast.error("Provide webhook name, endpoint URL, and at least one event");
      return;
    }

    const invalidEvents = parsedEvents.filter(
      (item) => !webhookEventOptions.includes(item as (typeof webhookEventOptions)[number])
    );
    if (invalidEvents.length > 0) {
      toast.error(`Invalid events: ${invalidEvents.join(", ")}`);
      return;
    }

    createWebhookMutation.mutate({
      name,
      endpointUrl,
      events: parsedEvents as any,
      secret: webhookForm.secret.trim() || undefined,
      isActive: true,
    });
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="mt-2 text-muted-foreground">
            Portfolio, execution, and governance overview across RTC
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
                <div className="rounded border bg-emerald-50 p-3">
                  <p className="text-xs text-emerald-700">On Track</p>
                  <p className="text-xl font-bold text-emerald-800">
                    {portfolio?.totals.onTrack ?? 0}
                  </p>
                </div>
                <div className="rounded border bg-amber-50 p-3">
                  <p className="text-xs text-amber-700">At Risk</p>
                  <p className="text-xl font-bold text-amber-800">
                    {portfolio?.totals.atRisk ?? 0}
                  </p>
                </div>
                <div className="rounded border bg-red-50 p-3">
                  <p className="text-xs text-red-700">Off Track</p>
                  <p className="text-xl font-bold text-red-800">
                    {portfolio?.totals.offTrack ?? 0}
                  </p>
                </div>
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
                    <Link key={task.id} href={`/projects/${task.projectId}?task=${task.id}`}>
                      <div className="flex cursor-pointer items-start justify-between rounded-lg border p-3 transition-colors hover:bg-slate-50">
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
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {isAdmin ? (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-slate-700" />
              <h3 className="text-xl font-semibold">Governance Controls</h3>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle>Access Policies</CardTitle>
                  <CardDescription>Assign Admin, Editor, or Viewer roles</CardDescription>
                </CardHeader>
                <CardContent>
                  {!accessData?.users || accessData.users.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No users available yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {accessData.users.map((user) => (
                        <div key={user.openId} className="grid grid-cols-[1fr_150px_auto] items-center gap-3 rounded border p-2">
                          <div>
                            <p className="text-sm font-medium">{user.name || user.openId}</p>
                            <p className="text-xs text-muted-foreground">{user.openId}</p>
                          </div>
                          <Select
                            value={roleDrafts[user.openId] ?? computedRoleByOpenId[user.openId] ?? "Editor"}
                            onValueChange={(value) =>
                              setRoleDrafts((prev) => ({
                                ...prev,
                                [user.openId]: value as GovernanceRole,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Admin">Admin</SelectItem>
                              <SelectItem value="Editor">Editor</SelectItem>
                              <SelectItem value="Viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            onClick={() => saveRole(user.openId)}
                            disabled={setPolicyMutation.isPending}
                          >
                            Save
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Webhook className="h-4 w-4" />
                    Webhook Subscriptions
                  </CardTitle>
                  <CardDescription>Outbound lifecycle integrations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="wh-name">Name</Label>
                    <Input
                      id="wh-name"
                      value={webhookForm.name}
                      onChange={(event) =>
                        setWebhookForm((prev) => ({ ...prev, name: event.target.value }))
                      }
                      placeholder="Operations listener"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wh-url">Endpoint URL</Label>
                    <Input
                      id="wh-url"
                      value={webhookForm.endpointUrl}
                      onChange={(event) =>
                        setWebhookForm((prev) => ({ ...prev, endpointUrl: event.target.value }))
                      }
                      placeholder="https://example.com/hooks/rtc"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wh-events">Events (comma separated)</Label>
                    <Input
                      id="wh-events"
                      value={webhookForm.eventsCsv}
                      onChange={(event) =>
                        setWebhookForm((prev) => ({ ...prev, eventsCsv: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wh-secret">Secret (optional)</Label>
                    <Input
                      id="wh-secret"
                      value={webhookForm.secret}
                      onChange={(event) =>
                        setWebhookForm((prev) => ({ ...prev, secret: event.target.value }))
                      }
                    />
                  </div>
                  <Button onClick={createWebhook} disabled={createWebhookMutation.isPending}>
                    {createWebhookMutation.isPending ? "Creating..." : "Create Webhook"}
                  </Button>

                  <div className="space-y-2">
                    {(webhooks || []).map((webhook) => (
                      <div key={webhook.id} className="rounded border p-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{webhook.name}</p>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeWebhookMutation.mutate({ id: webhook.id })}
                            disabled={removeWebhookMutation.isPending}
                          >
                            Remove
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">{webhook.endpointUrl}</p>
                        <p className="text-xs text-muted-foreground">
                          Events: {(webhook.events as string[]).join(", ")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Status: {webhook.isActive === "Yes" ? "Active" : "Inactive"} • Last:{" "}
                          {webhook.lastStatus || "Never"}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Audit Log</CardTitle>
                <CardDescription>Latest governance and lifecycle actions</CardDescription>
              </CardHeader>
              <CardContent>
                {!auditLogs || auditLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No audit entries yet.</p>
                ) : (
                  <div className="space-y-2">
                    {auditLogs.map((entry) => (
                      <div key={entry.id} className="rounded border p-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{entry.action}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(entry.createdAt), "MMM d, yyyy h:mm a")}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {entry.entityType} #{entry.entityId} • {entry.actorName}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}
