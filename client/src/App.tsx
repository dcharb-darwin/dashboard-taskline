import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { EnumProvider } from "./contexts/EnumContext";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import CreateProject from "./pages/CreateProject";
import Templates from "./pages/Templates";
import Calendar from "./pages/Calendar";
import GanttChart from "./pages/GanttChart";
import AdminSettings from "./pages/AdminSettings";
import Tasks from "./pages/Tasks";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Dashboard} />
      <Route path="/projects" component={Projects} />
      <Route path="/projects/new" component={CreateProject} />
      <Route path="/projects/:id" component={ProjectDetail} />
      <Route path="/templates" component={Templates} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/gantt" component={GanttChart} />
      <Route path="/admin" component={AdminSettings} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
      // switchable
      >
        <EnumProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </EnumProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
