import { trpc } from "@/lib/trpc";
import { normalizeTemplateKey } from "@/lib/template";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "wouter";
import { 
  FileText, FolderKanban, Plus, Settings,
  Megaphone, Calendar, Presentation, ClipboardList, Share2,
  Search, ImageIcon, Video, Bell, DollarSign, PenTool, FolderOpen
} from "lucide-react";
import { useState } from "react";

export default function Templates() {
  const { data: templates, isLoading } = trpc.templates.list.useQuery();
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  const templateIcons: Record<string, React.ElementType> = {
    "marketing_campaign": Megaphone,
    "event_plan": Calendar,
    "presentation": Presentation,
    "survey": ClipboardList,
    "press_release": FileText,
    "social_media_campaign": Share2,
    "planning_study": Search,
    "poster": ImageIcon,
    "video_project": Video,
    "public_notice": Bell,
    "media_buy": DollarSign,
    "op_ed": PenTool,
    "other_custom": FolderOpen,
    "generic_project": FolderKanban,
  };

  const selectedIconKey = selectedTemplate
    ? normalizeTemplateKey(
        selectedTemplate.templateGroupKey || selectedTemplate.templateKey || selectedTemplate.name
      )
    : "";
  const SelectedTemplateIcon = templateIcons[selectedIconKey] || FolderKanban;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Project Templates</h2>
            <p className="mt-2 text-muted-foreground">
              Browse and select from 14 standardized project templates
            </p>
          </div>
          <Link href="/templates/manage">
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Manage Templates
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(14)].map((_, i) => (
              <div key={i} className="h-48 rounded-lg bg-white animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates?.map((template) => {
              const iconKey = normalizeTemplateKey(
                template.templateGroupKey || template.templateKey || template.name
              );
              const Icon = templateIcons[iconKey] || FolderKanban;

              return (
                <Card
                  key={template.id}
                  className="cursor-pointer bg-white transition-shadow hover:shadow-lg"
                  onClick={() => setSelectedTemplate(template)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="mb-3 rounded-lg bg-blue-50 p-3">
                        <Icon className="h-8 w-8 text-blue-600" />
                      </div>
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription className="line-clamp-2">{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full" size="sm">
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Template Detail Dialog */}
      <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-lg bg-blue-50 p-2">
                <SelectedTemplateIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-2xl">{selectedTemplate?.name}</DialogTitle>
                <DialogDescription>{selectedTemplate?.description}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <h4 className="font-semibold mb-2">About This Template</h4>
              <p className="text-sm text-muted-foreground">
                This template includes pre-defined phases and sample tasks based on RTC's proven workflows.
                When you create a project from this template, tasks will be automatically populated and ready
                to customize for your specific needs.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Typical Timeline</h4>
              <p className="text-sm text-muted-foreground">
                {selectedTemplate?.name === "Marketing Campaign" && "8-12 weeks from planning to completion"}
                {selectedTemplate?.name === "Event Plan" && "8-12 weeks from planning to event execution"}
                {selectedTemplate?.name === "Presentation" && "3-4 weeks from planning to delivery"}
                {selectedTemplate?.name === "Survey" && "6-8 weeks from design to analysis"}
                {selectedTemplate?.name === "Press Release" && "2-3 weeks from draft to distribution"}
                {selectedTemplate?.name === "Social Media Campaign" && "4-8 weeks from planning to completion"}
                {selectedTemplate?.name === "Planning Study" && "12-24 weeks from initiation to final report"}
                {selectedTemplate?.name === "Poster" && "3-4 weeks from concept to production"}
                {selectedTemplate?.name === "Video Project" && "4-6 weeks from planning to final delivery"}
                {selectedTemplate?.name === "Public Notice" && "6-8 weeks from draft to publication"}
                {selectedTemplate?.name === "Media Buy" && "8-12 weeks from planning to campaign completion"}
                {selectedTemplate?.name === "Op-Ed" && "2-3 weeks from draft to publication"}
                {(!selectedTemplate || selectedTemplate.name === "Generic Project" || selectedTemplate.name === "Other/Custom") && "Varies based on project scope"}
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Link href="/projects/new">
                <Button className="flex-1">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project from Template
                </Button>
              </Link>
              <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
