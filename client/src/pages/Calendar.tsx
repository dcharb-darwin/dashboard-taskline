import { Calendar as BigCalendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { trpc } from "@/lib/trpc";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export default function Calendar() {
  const [, setLocation] = useLocation();
  const { data: projects, isLoading } = trpc.projects.list.useQuery();

  if (isLoading) {
    return (
      <AppLayout contentClassName="flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </AppLayout>
    );
  }

  // Transform projects into calendar events
  const events =
    projects?.map((project) => ({
      id: project.id,
      title: project.name,
      start: project.startDate ? new Date(project.startDate) : new Date(),
      end: project.targetCompletionDate ? new Date(project.targetCompletionDate) : new Date(),
      resource: project,
    })) || [];

  const handleSelectEvent = (event: any) => {
    setLocation(`/projects/${event.id}`);
  };

  const eventStyleGetter = (event: any) => {
    const project = event.resource;
    let backgroundColor = "#3b82f6"; // default blue

    switch (project.status) {
      case "Planning":
        backgroundColor = "#6366f1"; // indigo
        break;
      case "Active":
        backgroundColor = "#10b981"; // green
        break;
      case "On Hold":
        backgroundColor = "#f59e0b"; // amber
        break;
      case "Complete":
        backgroundColor = "#6b7280"; // gray
        break;
    }

    return {
      style: {
        backgroundColor,
        borderRadius: "4px",
        opacity: 0.8,
        color: "white",
        border: "0px",
        display: "block",
      },
    };
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Project Calendar</h1>
        <p className="text-muted-foreground">View all projects by their start and completion dates</p>
      </div>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Project Timeline</CardTitle>
          <CardDescription>Click on any project to view details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[600px]">
            <BigCalendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              onSelectEvent={handleSelectEvent}
              eventPropGetter={eventStyleGetter}
              views={["month", "week", "day", "agenda"]}
              defaultView="month"
              popup
            />
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded" style={{ backgroundColor: "#6366f1" }}></div>
          <span className="text-sm">Planning</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded" style={{ backgroundColor: "#10b981" }}></div>
          <span className="text-sm">Active</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded" style={{ backgroundColor: "#f59e0b" }}></div>
          <span className="text-sm">On Hold</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded" style={{ backgroundColor: "#6b7280" }}></div>
          <span className="text-sm">Complete</span>
        </div>
      </div>
    </AppLayout>
  );
}
