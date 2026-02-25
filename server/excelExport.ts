import ExcelJS from "exceljs";
import type { Project, Task } from "../drizzle/schema";

/**
 * Generate an Excel workbook for a project following the RTC standardized template format
 */
export async function generateProjectExcel(project: Project, tasks: Task[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  // Set workbook properties
  workbook.creator = "Darwin TaskLine";
  workbook.created = new Date();
  workbook.modified = new Date();

  // ============================================================================
  // SHEET 1: Instructions
  // ============================================================================
  const instructionsSheet = workbook.addWorksheet("Instructions");
  instructionsSheet.properties.defaultRowHeight = 15;

  instructionsSheet.mergeCells("A1:B1");
  const titleCell = instructionsSheet.getCell("A1");
  titleCell.value = `${project.templateType} Template - Instructions`;
  titleCell.font = { size: 16, bold: true, color: { argb: "FF1F4788" } };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  instructionsSheet.getRow(1).height = 25;

  instructionsSheet.getCell("A3").value = "Purpose";
  instructionsSheet.getCell("A3").font = { bold: true };
  instructionsSheet.getCell("A4").value =
    "This template helps you plan and track your project with standardized task management.";

  instructionsSheet.getCell("A6").value = "Column Descriptions";
  instructionsSheet.getCell("A6").font = { bold: true, size: 12 };

  const columnDescriptions = [
    ["Task ID", "Unique identifier (T001, T002, etc.)"],
    ["Task Description", "Clear description of what needs to be done"],
    ["Start Date", "When the task begins (MM/DD/YYYY)"],
    ["Due Date", "When the task must be completed (MM/DD/YYYY)"],
    ["Duration (Days)", "Number of business days needed"],
    ["Dependency", "Task IDs that must be completed first"],
    ["Owner", "Person or team responsible"],
    ["Status", "Not Started, In Progress, Complete, On Hold"],
    ["Priority", "High, Medium, Low"],
    ["Phase", "Project phase this task belongs to"],
    ["Budget", "Cost for this task"],
    ["Approval Required", "Yes or No"],
    ["Approver", "Person who must approve"],
    ["Deliverable Type", "Type of output"],
    ["Completion %", "Percentage complete (0-100%)"],
    ["Notes", "Additional context and information"],
  ];

  let row = 7;
  for (const [column, description] of columnDescriptions) {
    instructionsSheet.getCell(`A${row}`).value = column;
    instructionsSheet.getCell(`A${row}`).font = { bold: true };
    instructionsSheet.getCell(`B${row}`).value = description;
    row++;
  }

  instructionsSheet.getColumn(1).width = 20;
  instructionsSheet.getColumn(2).width = 60;

  // ============================================================================
  // SHEET 2: Dashboard
  // ============================================================================
  const dashboardSheet = workbook.addWorksheet("Dashboard");

  dashboardSheet.mergeCells("A1:D1");
  const dashTitleCell = dashboardSheet.getCell("A1");
  dashTitleCell.value = "Project Dashboard";
  dashTitleCell.font = { size: 16, bold: true, color: { argb: "FF1F4788" } };
  dashboardSheet.getRow(1).height = 25;

  dashboardSheet.getCell("A3").value = "Project Overview";
  dashboardSheet.getCell("A3").font = { bold: true, size: 12 };

  const projectInfo = [
    ["Project Name:", project.name],
    ["Project Manager:", project.projectManager || "Not assigned"],
    ["Template Type:", project.templateType],
    ["Status:", project.status],
    ["Start Date:", project.startDate ? new Date(project.startDate).toLocaleDateString() : "Not set"],
    [
      "Target Completion:",
      project.targetCompletionDate ? new Date(project.targetCompletionDate).toLocaleDateString() : "Not set",
    ],
    ["Budget:", project.budget ? `$${(project.budget / 100).toLocaleString()}` : "Not set"],
  ];

  let dashRow = 4;
  for (const [label, value] of projectInfo) {
    dashboardSheet.getCell(`A${dashRow}`).value = label;
    dashboardSheet.getCell(`A${dashRow}`).font = { bold: true };
    dashboardSheet.getCell(`B${dashRow}`).value = value;
    dashRow++;
  }

  dashboardSheet.getCell("A12").value = "Task Summary";
  dashboardSheet.getCell("A12").font = { bold: true, size: 12 };

  const tasksByStatus = {
    "Not Started": tasks.filter((t) => t.status === "Not Started").length,
    "In Progress": tasks.filter((t) => t.status === "In Progress").length,
    Complete: tasks.filter((t) => t.status === "Complete").length,
    "On Hold": tasks.filter((t) => t.status === "On Hold").length,
  };

  dashRow = 13;
  for (const [status, count] of Object.entries(tasksByStatus)) {
    dashboardSheet.getCell(`A${dashRow}`).value = status;
    dashboardSheet.getCell(`B${dashRow}`).value = count;
    dashRow++;
  }

  dashboardSheet.getColumn(1).width = 20;
  dashboardSheet.getColumn(2).width = 30;

  // ============================================================================
  // SHEET 3: Project Plan
  // ============================================================================
  const planSheet = workbook.addWorksheet("Project Plan");

  // Header row
  const headers = [
    "Task ID",
    "Task Description",
    "Start Date",
    "Due Date",
    "Duration (Days)",
    "Dependency",
    "Owner",
    "Status",
    "Priority",
    "Phase",
    "Budget",
    "Approval Required",
    "Approver",
    "Deliverable Type",
    "Completion %",
    "Notes",
  ];

  const headerRow = planSheet.getRow(1);
  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F4788" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });
  headerRow.height = 20;

  // Data rows
  tasks.forEach((task, index) => {
    const row = planSheet.getRow(index + 2);
    row.getCell(1).value = task.taskId;
    row.getCell(2).value = task.taskDescription;
    row.getCell(3).value = task.startDate ? new Date(task.startDate).toLocaleDateString() : "";
    row.getCell(4).value = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "";
    row.getCell(5).value = task.durationDays || "";
    row.getCell(6).value = task.dependency || "";
    row.getCell(7).value = task.owner || "";
    row.getCell(8).value = task.status;
    row.getCell(9).value = task.priority;
    row.getCell(10).value = task.phase || "";
    row.getCell(11).value = task.budget ? `$${(task.budget / 100).toFixed(2)}` : "";
    row.getCell(12).value = task.approvalRequired;
    row.getCell(13).value = task.approver || "";
    row.getCell(14).value = task.deliverableType || "";
    row.getCell(15).value = task.completionPercent;
    row.getCell(16).value = task.notes || "";

    // Add borders
    for (let i = 1; i <= 16; i++) {
      row.getCell(i).border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    }
  });

  // Set column widths
  planSheet.getColumn(1).width = 10; // Task ID
  planSheet.getColumn(2).width = 40; // Task Description
  planSheet.getColumn(3).width = 12; // Start Date
  planSheet.getColumn(4).width = 12; // Due Date
  planSheet.getColumn(5).width = 15; // Duration
  planSheet.getColumn(6).width = 15; // Dependency
  planSheet.getColumn(7).width = 20; // Owner
  planSheet.getColumn(8).width = 12; // Status
  planSheet.getColumn(9).width = 10; // Priority
  planSheet.getColumn(10).width = 20; // Phase
  planSheet.getColumn(11).width = 12; // Budget
  planSheet.getColumn(12).width = 15; // Approval Required
  planSheet.getColumn(13).width = 20; // Approver
  planSheet.getColumn(14).width = 18; // Deliverable Type
  planSheet.getColumn(15).width = 13; // Completion %
  planSheet.getColumn(16).width = 30; // Notes

  // Freeze header row
  planSheet.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }];

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
