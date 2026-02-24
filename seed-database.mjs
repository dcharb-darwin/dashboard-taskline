import { drizzle } from "drizzle-orm/mysql2";
import { templates, projects, tasks } from "./drizzle/schema.js";
import * as dotenv from "dotenv";
import { readFileSync } from "fs";

dotenv.config();

const db = drizzle(process.env.DATABASE_URL);

// Load extracted template tasks from JSON
const templateTasksData = JSON.parse(readFileSync("/home/ubuntu/template_tasks.json", "utf-8"));

// Map template names to match database format
const templateNameMap = {
  "Generic Project Generic Project": "Generic Project",
  "Marketing Campaign Marketing Campaign": "Marketing Campaign",
  "Event Plan Event Plan": "Event Plan",
  "Presentation Presentation": "Presentation",
  "Survey Survey": "Survey",
  "Press Release Press Release": "Press Release",
  "Social Media Campaign Social Media Campaign": "Social Media Campaign",
  "Planning Study Planning Study": "Planning Study",
  "Poster Poster": "Poster",
  "Video Project Video Project": "Video Project",
  "Public Notice Public Notice": "Public Notice",
  "Media Buy Media Buy": "Media Buy",
  "Op Ed Op-Ed": "Op-Ed",
  "Other Custom Other Custom Project": "Other/Custom",
};

const templateKeyMap = {
  "Generic Project": "generic-project",
  "Marketing Campaign": "marketing-campaign",
  "Event Plan": "event-plan",
  "Presentation": "presentation",
  "Survey": "survey",
  "Press Release": "press-release",
  "Social Media Campaign": "social-media-campaign",
  "Planning Study": "planning-study",
  "Poster": "poster",
  "Video Project": "video-project",
  "Public Notice": "public-notice",
  "Media Buy": "media-buy",
  "Op-Ed": "op-ed",
  "Other/Custom": "other-custom",
};

const templateDescriptions = {
  "Generic Project": "Universal template for any project type",
  "Marketing Campaign": "Marketing and promotional campaigns",
  "Event Plan": "Events, press conferences, community gatherings",
  "Presentation": "Presentations, briefings, board meetings",
  "Survey": "Customer surveys and feedback collection",
  "Press Release": "Press releases and media announcements",
  "Social Media Campaign": "Social media campaigns and content series",
  "Planning Study": "Planning studies, research projects, analysis",
  "Poster": "Posters, flyers, print materials",
  "Video Project": "Video production and multimedia projects",
  "Public Notice": "Public notices, legal notices, official announcements",
  "Media Buy": "Media buying and advertising placements",
  "Op-Ed": "Op-eds, thought leadership articles",
  "Other/Custom": "Custom projects that don't fit other categories",
};

console.log("🌱 Seeding database with templates and sample data...\n");

// Prepare template data
const templateData = [];
for (const [extractedName, data] of Object.entries(templateTasksData)) {
  const templateName = templateNameMap[extractedName];
  if (!templateName) {
    console.warn(`Warning: No mapping for template "${extractedName}"`);
    continue;
  }

  templateData.push({
    name: templateName,
    templateKey: templateKeyMap[templateName],
    description: templateDescriptions[templateName],
    phases: JSON.stringify(data.phases),
    sampleTasks: JSON.stringify(data.tasks),
  });
}

// Clear existing data (delete projects first due to foreign key)
console.log("🗑️  Clearing existing data...");
await db.delete(tasks);
await db.delete(projects);
await db.delete(templates);

// Insert templates
console.log("\n📋 Inserting templates...");
for (const template of templateData) {
  await db.insert(templates).values(template);
  console.log(`  ✓ ${template.name} (${template.sampleTasks ? JSON.parse(template.sampleTasks).length : 0} tasks)`);
}

// Create sample projects using the templates
console.log("\n📁 Creating sample projects...");

const allTemplates = await db.select().from(templates);
const marketingTemplate = allTemplates.find((t) => t.name === "Marketing Campaign");
const eventTemplate = allTemplates.find((t) => t.name === "Event Plan");
const planningTemplate = allTemplates.find((t) => t.name === "Planning Study");

// Sample Project 1: Summer Heat Campaign 2025
const summerHeatProject = await db
  .insert(projects)
  .values({
    name: "Summer Heat Campaign 2025",
    description: "Public awareness campaign for extreme heat safety and cooling center locations",
    templateId: marketingTemplate?.id,
    templateType: "Marketing Campaign",
    projectManager: "Communications Team",
    startDate: new Date("2025-05-01"),
    targetCompletionDate: new Date("2025-09-30"),
    status: "Active",
  })
  .$returningId();

console.log("  ✓ Summer Heat Campaign 2025");

// Sample Project 2: Alexander Dennis Grand Opening Event
const adEventProject = await db
  .insert(projects)
  .values({
    name: "Alexander Dennis Grand Opening Event",
    description: "Grand opening event for new bus manufacturing facility",
    templateId: eventTemplate?.id,
    templateType: "Event Plan",
    projectManager: "Events Team",
    startDate: new Date("2025-06-01"),
    targetCompletionDate: new Date("2025-07-16"),
    status: "Planning",
  })
  .$returningId();

console.log("  ✓ Alexander Dennis Grand Opening Event");

// Sample Project 3: AAMP Planning Study
const aampProject = await db
  .insert(projects)
  .values({
    name: "AAMP Planning Study",
    description: "Comprehensive planning study for transit accessibility improvements",
    templateId: planningTemplate?.id,
    templateType: "Planning Study",
    projectManager: "Planning Department",
    startDate: new Date("2025-01-15"),
    targetCompletionDate: new Date("2025-12-31"),
    status: "Active",
  })
  .$returningId();

console.log("  ✓ AAMP Planning Study");

// Sample Project 4: rideRTC Rewards Program
const rewardsProject = await db
  .insert(projects)
  .values({
    name: "rideRTC Rewards Program",
    description: "Launch of new customer loyalty and rewards program",
    templateId: marketingTemplate?.id,
    templateType: "Marketing Campaign",
    projectManager: "Marketing Team",
    startDate: new Date("2025-03-01"),
    targetCompletionDate: new Date("2025-06-30"),
    status: "Active",
  })
  .$returningId();

console.log("  ✓ rideRTC Rewards Program");

// Create sample tasks for Summer Heat Campaign
console.log("\n📝 Creating sample tasks...");

if (marketingTemplate && summerHeatProject.length > 0) {
  const marketingTasks = JSON.parse(marketingTemplate.sampleTasks);
  const projectId = summerHeatProject[0].id;

  // Create first 5 tasks as examples
  for (let i = 0; i < Math.min(5, marketingTasks.length); i++) {
    const task = marketingTasks[i];
    await db.insert(tasks).values({
      projectId,
      taskId: task.taskId,
      taskDescription: task.taskDescription,
      phase: task.phase,
      priority: task.priority || "Medium",
      status: i === 0 ? "Complete" : i === 1 ? "In Progress" : "Not Started",
      owner: task.owner || null,
      dependency: task.dependency || null,
      durationDays: task.durationDays || null,
      approvalRequired: task.approvalRequired || "No",
      notes: task.notes || null,
      completionPercent: i === 0 ? 100 : i === 1 ? 50 : 0,
    });
  }
  console.log(`  ✓ Created 5 sample tasks for Summer Heat Campaign`);
}

console.log("\n✅ Database seeded successfully!");
console.log(`\n📊 Summary:`);
console.log(`   - ${templateData.length} templates`);
console.log(`   - 4 sample projects`);
console.log(`   - Sample tasks for demonstration`);
