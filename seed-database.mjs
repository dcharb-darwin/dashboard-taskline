// Canonical seed entrypoint for this repository.
import { drizzle } from "drizzle-orm/mysql2";
import { templates, projects, tasks } from "./drizzle/schema.js";
import * as dotenv from "dotenv";

dotenv.config();

const db = drizzle(process.env.DATABASE_URL);

// 14 Project Templates with phases and sample tasks
const templateData = [
  {
    name: "Generic Project",
    templateKey: "generic-project",
    description: "Universal template for any project type",
    phases: JSON.stringify(["Planning", "Execution", "Review", "Completion"]),
    sampleTasks: JSON.stringify([
      { taskId: "T001", description: "Define project scope and objectives", phase: "Planning", priority: "High" },
      { taskId: "T002", description: "Identify stakeholders and team members", phase: "Planning", priority: "High" },
      { taskId: "T003", description: "Create project timeline", phase: "Planning", priority: "Medium" },
      { taskId: "T004", description: "Execute project deliverables", phase: "Execution", priority: "High" },
      { taskId: "T005", description: "Monitor progress and adjust as needed", phase: "Execution", priority: "Medium" },
      { taskId: "T006", description: "Review outcomes and gather feedback", phase: "Review", priority: "Medium" },
      { taskId: "T007", description: "Document lessons learned", phase: "Completion", priority: "Low" },
    ]),
  },
  {
    name: "Marketing Campaign",
    templateKey: "marketing-campaign",
    description: "Marketing and promotional campaigns",
    phases: JSON.stringify([
      "Planning & Strategy",
      "Creative Development",
      "Review & Approval",
      "Pre-Launch",
      "Campaign Launch",
      "Monitoring & Optimization",
      "Post-Campaign Analysis",
    ]),
    sampleTasks: JSON.stringify([
      { taskId: "T001", description: "Define campaign objectives and KPIs", phase: "Planning & Strategy", priority: "High" },
      { taskId: "T002", description: "Identify target audience", phase: "Planning & Strategy", priority: "High" },
      { taskId: "T003", description: "Develop creative concepts", phase: "Creative Development", priority: "High" },
      { taskId: "T004", description: "Create campaign materials", phase: "Creative Development", priority: "High" },
      { taskId: "T005", description: "GAMM review", phase: "Review & Approval", priority: "High", approvalRequired: "Yes" },
      { taskId: "T006", description: "Director approval", phase: "Review & Approval", priority: "High", approvalRequired: "Yes" },
      { taskId: "T007", description: "Finalize media placements", phase: "Pre-Launch", priority: "High" },
      { taskId: "T008", description: "Launch campaign", phase: "Campaign Launch", priority: "High" },
      { taskId: "T009", description: "Monitor performance metrics", phase: "Monitoring & Optimization", priority: "Medium" },
      { taskId: "T010", description: "Analyze results and create report", phase: "Post-Campaign Analysis", priority: "Medium" },
    ]),
  },
  {
    name: "Event Plan",
    templateKey: "event-plan",
    description: "Events, press conferences, community gatherings",
    phases: JSON.stringify([
      "Event Concept & Planning",
      "Logistics & Coordination",
      "Marketing & Promotion",
      "Pre-Event Preparation",
      "Event Execution",
      "Post-Event Follow-Up",
    ]),
    sampleTasks: JSON.stringify([
      { taskId: "T001", description: "Define event purpose and goals", phase: "Event Concept & Planning", priority: "High" },
      { taskId: "T002", description: "Select venue and date", phase: "Event Concept & Planning", priority: "High" },
      { taskId: "T003", description: "Create event budget", phase: "Event Concept & Planning", priority: "High" },
      { taskId: "T004", description: "Secure vendors and catering", phase: "Logistics & Coordination", priority: "High" },
      { taskId: "T005", description: "Coordinate AV and technical needs", phase: "Logistics & Coordination", priority: "Medium" },
      { taskId: "T006", description: "Create event marketing materials", phase: "Marketing & Promotion", priority: "High" },
      { taskId: "T007", description: "Send invitations and track RSVPs", phase: "Marketing & Promotion", priority: "High" },
      { taskId: "T008", description: "Conduct final walkthrough", phase: "Pre-Event Preparation", priority: "High" },
      { taskId: "T009", description: "Execute event", phase: "Event Execution", priority: "High" },
      { taskId: "T010", description: "Send thank you notes", phase: "Post-Event Follow-Up", priority: "Low" },
      { taskId: "T011", description: "Compile event report", phase: "Post-Event Follow-Up", priority: "Medium" },
    ]),
  },
  {
    name: "Presentation",
    templateKey: "presentation",
    description: "Presentations, briefings, board meetings",
    phases: JSON.stringify(["Planning", "Content Development", "Review & Revisions", "Final Approval", "Delivery"]),
    sampleTasks: JSON.stringify([
      { taskId: "T001", description: "Define presentation objectives", phase: "Planning", priority: "High" },
      { taskId: "T002", description: "Research and gather content", phase: "Planning", priority: "High" },
      { taskId: "T003", description: "Create presentation outline", phase: "Content Development", priority: "High" },
      { taskId: "T004", description: "Develop slides and visuals", phase: "Content Development", priority: "High" },
      { taskId: "T005", description: "Internal review", phase: "Review & Revisions", priority: "High" },
      { taskId: "T006", description: "Incorporate feedback", phase: "Review & Revisions", priority: "Medium" },
      { taskId: "T007", description: "Final approval from leadership", phase: "Final Approval", priority: "High", approvalRequired: "Yes" },
      { taskId: "T008", description: "Rehearse presentation", phase: "Delivery", priority: "Medium" },
      { taskId: "T009", description: "Deliver presentation", phase: "Delivery", priority: "High" },
    ]),
  },
  {
    name: "Survey",
    templateKey: "survey",
    description: "Customer surveys and feedback collection",
    phases: JSON.stringify(["Survey Design", "Review & Testing", "Distribution", "Data Collection", "Analysis & Reporting"]),
    sampleTasks: JSON.stringify([
      { taskId: "T001", description: "Define survey objectives", phase: "Survey Design", priority: "High" },
      { taskId: "T002", description: "Develop survey questions", phase: "Survey Design", priority: "High" },
      { taskId: "T003", description: "Build survey in platform", phase: "Survey Design", priority: "Medium" },
      { taskId: "T004", description: "Internal review and testing", phase: "Review & Testing", priority: "High" },
      { taskId: "T005", description: "Distribute survey to target audience", phase: "Distribution", priority: "High" },
      { taskId: "T006", description: "Monitor response rates", phase: "Data Collection", priority: "Medium" },
      { taskId: "T007", description: "Analyze survey results", phase: "Analysis & Reporting", priority: "High" },
      { taskId: "T008", description: "Create findings report", phase: "Analysis & Reporting", priority: "High" },
    ]),
  },
  {
    name: "Press Release",
    templateKey: "press-release",
    description: "Press releases and media announcements",
    phases: JSON.stringify(["Planning", "Drafting", "Review & Approval", "Distribution", "Follow-Up"]),
    sampleTasks: JSON.stringify([
      { taskId: "T001", description: "Identify news angle and key messages", phase: "Planning", priority: "High" },
      { taskId: "T002", description: "Draft press release", phase: "Drafting", priority: "High" },
      { taskId: "T003", description: "GAMM review", phase: "Review & Approval", priority: "High", approvalRequired: "Yes" },
      { taskId: "T004", description: "Legal review", phase: "Review & Approval", priority: "High", approvalRequired: "Yes" },
      { taskId: "T005", description: "Executive approval", phase: "Review & Approval", priority: "High", approvalRequired: "Yes" },
      { taskId: "T006", description: "Distribute to media contacts", phase: "Distribution", priority: "High" },
      { taskId: "T007", description: "Post to website and social media", phase: "Distribution", priority: "Medium" },
      { taskId: "T008", description: "Monitor media coverage", phase: "Follow-Up", priority: "Medium" },
    ]),
  },
  {
    name: "Social Media Campaign",
    templateKey: "social-media-campaign",
    description: "Social media campaigns and content",
    phases: JSON.stringify(["Planning", "Content Creation", "Review & Approval", "Scheduling", "Campaign Launch", "Monitoring & Engagement"]),
    sampleTasks: JSON.stringify([
      { taskId: "T001", description: "Define campaign goals and metrics", phase: "Planning", priority: "High" },
      { taskId: "T002", description: "Develop content calendar", phase: "Planning", priority: "High" },
      { taskId: "T003", description: "Create social media posts and graphics", phase: "Content Creation", priority: "High" },
      { taskId: "T004", description: "GAMM review", phase: "Review & Approval", priority: "High", approvalRequired: "Yes" },
      { taskId: "T005", description: "Schedule posts in platform", phase: "Scheduling", priority: "Medium" },
      { taskId: "T006", description: "Launch campaign", phase: "Campaign Launch", priority: "High" },
      { taskId: "T007", description: "Monitor engagement and respond to comments", phase: "Monitoring & Engagement", priority: "Medium" },
      { taskId: "T008", description: "Analyze performance metrics", phase: "Monitoring & Engagement", priority: "Medium" },
    ]),
  },
  {
    name: "Planning Study",
    templateKey: "planning-study",
    description: "Planning studies and research projects",
    phases: JSON.stringify(["Initiation", "Research & Data Collection", "Analysis", "Draft Report", "Review & Revisions", "Final Report"]),
    sampleTasks: JSON.stringify([
      { taskId: "T001", description: "Define study scope and objectives", phase: "Initiation", priority: "High" },
      { taskId: "T002", description: "Assemble project team", phase: "Initiation", priority: "High" },
      { taskId: "T003", description: "Conduct background research", phase: "Research & Data Collection", priority: "High" },
      { taskId: "T004", description: "Collect field data", phase: "Research & Data Collection", priority: "High" },
      { taskId: "T005", description: "Analyze data and findings", phase: "Analysis", priority: "High" },
      { taskId: "T006", description: "Draft report", phase: "Draft Report", priority: "High" },
      { taskId: "T007", description: "Internal review", phase: "Review & Revisions", priority: "High" },
      { taskId: "T008", description: "Incorporate feedback", phase: "Review & Revisions", priority: "Medium" },
      { taskId: "T009", description: "Finalize and publish report", phase: "Final Report", priority: "High" },
    ]),
  },
  {
    name: "Poster",
    templateKey: "poster",
    description: "Poster design and production",
    phases: JSON.stringify(["Planning", "Design", "Review & Revisions", "Final Approval", "Production & Distribution"]),
    sampleTasks: JSON.stringify([
      { taskId: "T001", description: "Define poster purpose and audience", phase: "Planning", priority: "High" },
      { taskId: "T002", description: "Gather content and images", phase: "Planning", priority: "High" },
      { taskId: "T003", description: "Create design concepts", phase: "Design", priority: "High" },
      { taskId: "T004", description: "GAMM review", phase: "Review & Revisions", priority: "High", approvalRequired: "Yes" },
      { taskId: "T005", description: "Revise based on feedback", phase: "Review & Revisions", priority: "Medium" },
      { taskId: "T006", description: "Final approval", phase: "Final Approval", priority: "High", approvalRequired: "Yes" },
      { taskId: "T007", description: "Send to printer", phase: "Production & Distribution", priority: "High" },
      { taskId: "T008", description: "Distribute posters", phase: "Production & Distribution", priority: "Medium" },
    ]),
  },
  {
    name: "Video Project",
    templateKey: "video-project",
    description: "Video production projects",
    phases: JSON.stringify(["Pre-Production", "Production", "Post-Production", "Review & Approval", "Distribution"]),
    sampleTasks: JSON.stringify([
      { taskId: "T001", description: "Develop video concept and script", phase: "Pre-Production", priority: "High" },
      { taskId: "T002", description: "Scout locations and schedule shoots", phase: "Pre-Production", priority: "High" },
      { taskId: "T003", description: "Conduct video shoots", phase: "Production", priority: "High" },
      { taskId: "T004", description: "Edit video footage", phase: "Post-Production", priority: "High" },
      { taskId: "T005", description: "Add graphics and music", phase: "Post-Production", priority: "Medium" },
      { taskId: "T006", description: "GAMM review", phase: "Review & Approval", priority: "High", approvalRequired: "Yes" },
      { taskId: "T007", description: "Incorporate feedback", phase: "Review & Approval", priority: "Medium" },
      { taskId: "T008", description: "Final approval", phase: "Review & Approval", priority: "High", approvalRequired: "Yes" },
      { taskId: "T009", description: "Publish video", phase: "Distribution", priority: "High" },
    ]),
  },
  {
    name: "Public Notice",
    templateKey: "public-notice",
    description: "Public notices and legal announcements",
    phases: JSON.stringify(["Planning", "Drafting", "Legal Review", "Approval", "Publication", "Documentation"]),
    sampleTasks: JSON.stringify([
      { taskId: "T001", description: "Determine notice requirements", phase: "Planning", priority: "High" },
      { taskId: "T002", description: "Draft notice content", phase: "Drafting", priority: "High" },
      { taskId: "T003", description: "Legal review", phase: "Legal Review", priority: "High", approvalRequired: "Yes" },
      { taskId: "T004", description: "Executive approval", phase: "Approval", priority: "High", approvalRequired: "Yes" },
      { taskId: "T005", description: "Submit to publications", phase: "Publication", priority: "High" },
      { taskId: "T006", description: "Post to website", phase: "Publication", priority: "Medium" },
      { taskId: "T007", description: "Archive notice and proof of publication", phase: "Documentation", priority: "Medium" },
    ]),
  },
  {
    name: "Media Buy",
    templateKey: "media-buy",
    description: "Paid advertising campaigns",
    phases: JSON.stringify(["Planning & Strategy", "Media Selection", "Creative Development", "Approval", "Campaign Launch", "Monitoring & Optimization", "Reporting"]),
    sampleTasks: JSON.stringify([
      { taskId: "T001", description: "Define campaign objectives and budget", phase: "Planning & Strategy", priority: "High" },
      { taskId: "T002", description: "Research media options", phase: "Media Selection", priority: "High" },
      { taskId: "T003", description: "Negotiate media placements", phase: "Media Selection", priority: "High" },
      { taskId: "T004", description: "Develop ad creative", phase: "Creative Development", priority: "High" },
      { taskId: "T005", description: "GAMM review", phase: "Approval", priority: "High", approvalRequired: "Yes" },
      { taskId: "T006", description: "Submit ads to media outlets", phase: "Campaign Launch", priority: "High" },
      { taskId: "T007", description: "Monitor campaign performance", phase: "Monitoring & Optimization", priority: "Medium" },
      { taskId: "T008", description: "Optimize placements as needed", phase: "Monitoring & Optimization", priority: "Medium" },
      { taskId: "T009", description: "Compile campaign report", phase: "Reporting", priority: "Medium" },
    ]),
  },
  {
    name: "Op-Ed",
    templateKey: "op-ed",
    description: "Opinion editorials and thought leadership",
    phases: JSON.stringify(["Planning", "Drafting", "Review & Revisions", "Approval", "Submission", "Follow-Up"]),
    sampleTasks: JSON.stringify([
      { taskId: "T001", description: "Identify topic and key messages", phase: "Planning", priority: "High" },
      { taskId: "T002", description: "Draft op-ed", phase: "Drafting", priority: "High" },
      { taskId: "T003", description: "GAMM review", phase: "Review & Revisions", priority: "High", approvalRequired: "Yes" },
      { taskId: "T004", description: "Revise based on feedback", phase: "Review & Revisions", priority: "Medium" },
      { taskId: "T005", description: "Executive approval", phase: "Approval", priority: "High", approvalRequired: "Yes" },
      { taskId: "T006", description: "Submit to publications", phase: "Submission", priority: "High" },
      { taskId: "T007", description: "Follow up with editors", phase: "Follow-Up", priority: "Medium" },
    ]),
  },
  {
    name: "Other/Custom",
    templateKey: "other-custom",
    description: "Flexible template for unique projects",
    phases: JSON.stringify(["Planning", "Execution", "Review", "Completion"]),
    sampleTasks: JSON.stringify([
      { taskId: "T001", description: "Define project scope", phase: "Planning", priority: "High" },
      { taskId: "T002", description: "Create project plan", phase: "Planning", priority: "High" },
      { taskId: "T003", description: "Execute project tasks", phase: "Execution", priority: "High" },
      { taskId: "T004", description: "Review progress", phase: "Review", priority: "Medium" },
      { taskId: "T005", description: "Complete deliverables", phase: "Completion", priority: "High" },
    ]),
  },
];

// Sample projects based on archive
const sampleProjects = [
  {
    name: "Summer Heat Campaign 2025",
    description: "Communications plan for summer heat safety and awareness",
    templateType: "Marketing Campaign",
    projectManager: "Communications Team",
    status: "Active",
    startDate: new Date("2025-05-01"),
    targetCompletionDate: new Date("2025-09-30"),
  },
  {
    name: "Alexander Dennis Grand Opening",
    description: "Grand opening event for Alexander Dennis facility on July 16, 2025",
    templateType: "Event Plan",
    projectManager: "Events Team",
    status: "Planning",
    startDate: new Date("2025-04-01"),
    targetCompletionDate: new Date("2025-07-16"),
  },
  {
    name: "AAMP Phase 1 Planning Study",
    description: "Planning study for AAMP Phase 1 implementation",
    templateType: "Planning Study",
    projectManager: "Planning Department",
    status: "Active",
    startDate: new Date("2025-01-15"),
    targetCompletionDate: new Date("2025-12-31"),
  },
  {
    name: "rideRTC Rewards Program Launch",
    description: "Communications plan for rideRTC Rewards Program launch",
    templateType: "Marketing Campaign",
    projectManager: "Marketing Team",
    status: "Complete",
    startDate: new Date("2024-10-01"),
    targetCompletionDate: new Date("2025-01-31"),
  },
];

async function seedDatabase() {
  console.log("Starting database seeding...");

  try {
    // Ensure seed is idempotent when run repeatedly.
    console.log("Clearing existing seedable data...");
    await db.delete(tasks);
    await db.delete(projects);
    await db.delete(templates);

    // Insert templates
    console.log("Inserting templates...");
    for (const template of templateData) {
      await db.insert(templates).values(template);
    }
    console.log(`✓ Inserted ${templateData.length} templates`);

    // Get all templates to link projects
    const allTemplates = await db.select().from(templates);
    
    // Insert sample projects
    console.log("Inserting sample projects...");
    for (const project of sampleProjects) {
      const template = allTemplates.find(t => t.name === project.templateType);
      const projectData = {
        ...project,
        templateId: template?.id,
      };
      
      const result = await db.insert(projects).values(projectData);
      const projectId = Number(result[0].insertId);
      
      // Add sample tasks for this project
      if (template && template.sampleTasks) {
        const sampleTasks = JSON.parse(template.sampleTasks);
        const taskData = sampleTasks.slice(0, 5).map((task, index) => ({
          projectId,
          taskId: task.taskId,
          taskDescription: task.description,
          phase: task.phase,
          priority: task.priority || "Medium",
          status: index === 0 ? "Complete" : index === 1 ? "In Progress" : "Not Started",
          approvalRequired: task.approvalRequired || "No",
          completionPercent: index === 0 ? 100 : index === 1 ? 50 : 0,
        }));
        
        for (const task of taskData) {
          await db.insert(tasks).values(task);
        }
      }
    }
    console.log(`✓ Inserted ${sampleProjects.length} sample projects with tasks`);

    console.log("✓ Database seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}

seedDatabase()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });
