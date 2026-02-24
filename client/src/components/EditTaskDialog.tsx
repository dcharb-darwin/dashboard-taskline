import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Task {
  id: number;
  projectId: number;
  taskId: string;
  taskDescription: string;
  startDate: Date | null;
  dueDate: Date | null;
  durationDays: number | null;
  dependency: string | null;
  owner: string | null;
  status: "Not Started" | "In Progress" | "Complete" | "On Hold";
  priority: "High" | "Medium" | "Low";
  phase: string | null;
  budget: number | null;
  actualBudget: number | null;
  approvalRequired: "Yes" | "No";
  approver: string | null;
  deliverableType: string | null;
  completionPercent: number;
  notes: string | null;
}

interface EditTaskDialogProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditTaskDialog({ task, open, onOpenChange, onSuccess }: EditTaskDialogProps) {
  const [formData, setFormData] = useState({
    taskDescription: task.taskDescription,
    startDate: task.startDate ? new Date(task.startDate).toISOString().split("T")[0] : "",
    dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "",
    durationDays: task.durationDays?.toString() || "",
    dependency: task.dependency || "",
    owner: task.owner || "",
    status: task.status,
    priority: task.priority,
    phase: task.phase || "",
    budget: task.budget ? (task.budget / 100).toString() : "",
    actualBudget: task.actualBudget ? (task.actualBudget / 100).toString() : "",
    approvalRequired: task.approvalRequired,
    approver: task.approver || "",
    deliverableType: task.deliverableType || "",
    completionPercent: task.completionPercent.toString(),
    notes: task.notes || "",
  });

  const updateTask = trpc.tasks.update.useMutation({
    onSuccess: () => {
      toast.success("Task updated successfully");
      onSuccess();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Failed to update task: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    updateTask.mutate({
      id: task.id,
      taskDescription: formData.taskDescription,
      startDate: formData.startDate ? new Date(formData.startDate) : undefined,
      dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
      durationDays: formData.durationDays ? parseInt(formData.durationDays) : undefined,
      dependency: formData.dependency || undefined,
      owner: formData.owner || undefined,
      status: formData.status,
      priority: formData.priority,
      phase: formData.phase || undefined,
      budget: formData.budget ? Math.round(parseFloat(formData.budget) * 100) : undefined,
      actualBudget: formData.actualBudget
        ? Math.round(parseFloat(formData.actualBudget) * 100)
        : undefined,
      approvalRequired: formData.approvalRequired,
      approver: formData.approver || undefined,
      deliverableType: formData.deliverableType || undefined,
      completionPercent: parseInt(formData.completionPercent),
      notes: formData.notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Task: {task.taskId}</DialogTitle>
          <DialogDescription>Update task details, status, and notes</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            {/* Task Description */}
            <div className="space-y-2">
              <Label htmlFor="taskDescription">Task Description *</Label>
              <Textarea
                id="taskDescription"
                value={formData.taskDescription}
                onChange={(e) => setFormData({ ...formData, taskDescription: e.target.value })}
                required
                rows={3}
              />
            </div>

            {/* Status and Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Not Started">Not Started</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Complete">Complete</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(value: any) => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Owner and Phase */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="owner">Owner</Label>
                <Input
                  id="owner"
                  value={formData.owner}
                  onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                  placeholder="Assigned to"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phase">Phase</Label>
                <Input
                  id="phase"
                  value={formData.phase}
                  onChange={(e) => setFormData({ ...formData, phase: e.target.value })}
                  placeholder="Project phase"
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="durationDays">Duration (Days)</Label>
                <Input
                  id="durationDays"
                  type="number"
                  value={formData.durationDays}
                  onChange={(e) => setFormData({ ...formData, durationDays: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Dependency and Completion */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dependency">Dependency</Label>
                <Input
                  id="dependency"
                  value={formData.dependency}
                  onChange={(e) => setFormData({ ...formData, dependency: e.target.value })}
                  placeholder="T001, T002"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="completionPercent">Completion %</Label>
                <Input
                  id="completionPercent"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.completionPercent}
                  onChange={(e) => setFormData({ ...formData, completionPercent: e.target.value })}
                />
              </div>
            </div>

            {/* Budget and Deliverable */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budget">Budget ($)</Label>
                <Input
                  id="budget"
                  type="number"
                  step="0.01"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="actualBudget">Actual ($)</Label>
                <Input
                  id="actualBudget"
                  type="number"
                  step="0.01"
                  value={formData.actualBudget}
                  onChange={(e) =>
                    setFormData({ ...formData, actualBudget: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliverableType">Deliverable Type</Label>
                <Input
                  id="deliverableType"
                  value={formData.deliverableType}
                  onChange={(e) => setFormData({ ...formData, deliverableType: e.target.value })}
                  placeholder="Document, Design, etc."
                />
              </div>
            </div>

            {/* Approval */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="approvalRequired">Approval Required</Label>
                <Select
                  value={formData.approvalRequired}
                  onValueChange={(value: any) => setFormData({ ...formData, approvalRequired: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="approver">Approver</Label>
                <Input
                  id="approver"
                  value={formData.approver}
                  onChange={(e) => setFormData({ ...formData, approver: e.target.value })}
                  placeholder="Approver name"
                  disabled={formData.approvalRequired === "No"}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                placeholder="Add any additional notes or comments..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateTask.isPending}>
              {updateTask.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
