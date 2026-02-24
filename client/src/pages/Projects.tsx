import { trpc } from "@/lib/trpc";
import { formatTemplateLabel } from "@/lib/template";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { FolderKanban, Plus, Search } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

export default function Projects() {
  const { data: projects, isLoading } = trpc.projects.list.useQuery();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredProjects = projects?.filter((project) => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.templateType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
            <p className="mt-2 text-muted-foreground">
              Manage all your RTC projects in one place
            </p>
          </div>
          <Link href="/projects/new">
            <Button size="lg">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </Link>
        </div>

        <Card className="bg-white">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === "all" ? "default" : "outline"}
                  onClick={() => setStatusFilter("all")}
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === "Planning" ? "default" : "outline"}
                  onClick={() => setStatusFilter("Planning")}
                >
                  Planning
                </Button>
                <Button
                  variant={statusFilter === "Active" ? "default" : "outline"}
                  onClick={() => setStatusFilter("Active")}
                >
                  Active
                </Button>
                <Button
                  variant={statusFilter === "On Hold" ? "default" : "outline"}
                  onClick={() => setStatusFilter("On Hold")}
                >
                  On Hold
                </Button>
                <Button
                  variant={statusFilter === "Complete" ? "default" : "outline"}
                  onClick={() => setStatusFilter("Complete")}
                >
                  Complete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 rounded-lg bg-white animate-pulse"></div>
            ))}
          </div>
        ) : filteredProjects && filteredProjects.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="h-full cursor-pointer bg-white transition-shadow hover:shadow-lg">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <h3 className="line-clamp-2 text-lg font-semibold">{project.name}</h3>
                        <span
                          className={`ml-2 whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium ${
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

                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {project.description || "No description"}
                      </p>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="rounded bg-slate-100 px-2 py-1">
                          {formatTemplateLabel(project.templateType)}
                        </span>
                      </div>

                      <div className="space-y-1 border-t pt-2 text-sm">
                        {project.projectManager && (
                          <p className="text-muted-foreground">
                            <span className="font-medium">PM:</span> {project.projectManager}
                          </p>
                        )}
                        {project.targetCompletionDate && (
                          <p className="text-muted-foreground">
                            <span className="font-medium">Due:</span>{" "}
                            {format(new Date(project.targetCompletionDate), "MMM d, yyyy")}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="bg-white">
            <CardContent className="py-12">
              <div className="text-center">
                <FolderKanban className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-20" />
                <h3 className="mb-2 text-lg font-semibold">No projects found</h3>
                <p className="mb-4 text-muted-foreground">
                  {searchTerm || statusFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Get started by creating your first project"}
                </p>
                <Link href="/projects/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Project
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
